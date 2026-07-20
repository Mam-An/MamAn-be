import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
import { notifyPlantUpdateFcm } from "../../utils/fcmPush.js";
export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const farmerId = req.user!.id;
        const { realPlantId, imageUrl, status, note, healthNote } = req.body;
        await prisma.realPlant.update({ where: { id: realPlantId }, data: { status } });
        const update = await prisma.plantUpdate.create({
            data: { realPlantId, farmerId, imageUrl, status, note, healthNote },
        });
        await prisma.virtualPlant.updateMany({
            where: { realPlantId },
            data: { status },
        });
        prisma.virtualPlant.findFirst({
            where: { realPlantId },
            include: {
                user: { select: { id: true, expoPushToken: true, fullName: true } },
                realPlant: {
                    select: {
                        code: true,
                        flowerType: { select: { name: true } },
                    },
                },
            },
        }).then(async (vPlant) => {
            console.log(`[Push] Cập nhật realPlantId: ${realPlantId} -> vPlant found:`, !!vPlant);
            if (!vPlant?.user?.id) {
                console.log(`[Push] Bỏ qua push vì không tìm thấy user hoặc virtualPlant.`);
                return;
            }
            const statusLabel: Record<string, string> = {
                SEED: 'Hạt giống', SPROUT: 'Nảy mầm 🌱', GROWING: 'Đang lớn 🌿',
                BUDDING: 'Ra nụ 🌼', BLOOMING: 'Nở hoa 🌸', RESTING: 'Nghỉ ngơi 😴',
                NEEDS_CARE: 'Cần chăm sóc ⚠️', COMPLETED: 'Hoàn thành ✅',
            };
            const flowerName = vPlant.realPlant?.flowerType?.name ?? 'Cây của bạn';
            const title = `🌸 Tin vui từ Mầm An!`;
            const body = `Bạn có 1 cập nhật mới từ nhà vườn cho cây ${flowerName} 🌱. Trạng thái: ${statusLabel[status] ?? status}${note ? ` — "${note}"` : ''}`;
            await prisma.notification.create({
                data: {
                    userId: vPlant.user.id,
                    title,
                    body,
                    type: 'plant_update',
                }
            });
            console.log(`[Push] Đã lưu thông báo vào DB cho user: ${vPlant.user.id}`);
            const token = vPlant.user.expoPushToken;
            if (token) {
                console.log(`[Push] Tìm thấy FCM token, tiến hành gửi:`, token.substring(0, 20) + '...');
                const farmer = req.user as any;
                notifyPlantUpdateFcm({
                    fcmToken: token,
                    plantCode: vPlant.realPlant!.code,
                    flowerName,
                    status,
                    note,
                    farmerName: farmer?.fullName,
                }).catch((err) => console.error('[FCM] notifyPlantUpdateFcm error:', err));
            }
            else {
                console.log(`[Push] Không gửi FCM vì user không có expoPushToken (FCM Token) trong DB.`);
            }
        }).catch((err) => console.error('[Notify] Error saving notification:', err));
        return res.status(201).json({ message: "Plant update created", data: update });
    }
    catch (err) {
        next(err);
    }
};
export const getByRealPlant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updates = await prisma.plantUpdate.findMany({
            where: { realPlantId: req.params.realPlantId as string },
            include: { farmer: { select: { id: true, fullName: true } } },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({ data: updates });
    }
    catch (err) {
        next(err);
    }
};
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { gardenId } = req.query;
        const whereClause: any = {};
        if (gardenId) {
            whereClause.realPlant = { gardenId: String(gardenId) };
        }
        if (req.user?.role === "FARMER") {
            whereClause.farmerId = req.user.id;
        }
        const updates = await prisma.plantUpdate.findMany({
            where: whereClause,
            include: {
                farmer: { select: { id: true, fullName: true } },
                realPlant: {
                    select: {
                        id: true,
                        code: true,
                        flowerType: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({ data: updates });
    }
    catch (err) {
        next(err);
    }
};
export const deleteUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await prisma.plantUpdate.delete({ where: { id: req.params.id as string } });
        return res.status(200).json({ message: "Plant update deleted" });
    }
    catch (err) {
        next(err);
    }
};
