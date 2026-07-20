import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const types = await prisma.flowerType.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            include: {
                realPlants: {
                    where: { isAssigned: false, status: "SEED" },
                    select: {
                        id: true,
                        garden: {
                            select: { id: true, name: true, address: true },
                        },
                    },
                },
            },
        });
        const result = types.map((ft) => {
            const gardensMap = new Map<string, {
                id: string;
                name: string;
                address?: string | null;
            }>();
            for (const rp of ft.realPlants) {
                if (!gardensMap.has(rp.garden.id)) {
                    gardensMap.set(rp.garden.id, rp.garden);
                }
            }
            const { realPlants, ...rest } = ft;
            return {
                ...rest,
                availableCount: realPlants.length,
                gardens: Array.from(gardensMap.values()),
            };
        });
        return res.status(200).json({ data: result });
    }
    catch (err) {
        next(err);
    }
};
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = await prisma.flowerType.findUnique({ where: { id: req.params.id as string } });
        if (!type || !type.isActive)
            return res.status(404).json({ message: "FlowerType not found" });
        return res.status(200).json({ data: type });
    }
    catch (err) {
        next(err);
    }
};
const sanitizeJson = (obj: any) => {
    if (typeof obj !== 'object' || obj === null)
        return obj;
    const newObj: any = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined)
            newObj[k] = v;
    }
    return Object.keys(newObj).length > 0 ? newObj : undefined;
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, imageUrl, defaultDuration, stageImages, stageDurations } = req.body;
        const type = await prisma.flowerType.create({
            data: {
                name, description, imageUrl, defaultDuration,
                stageImages: sanitizeJson(stageImages),
                stageDurations: sanitizeJson(stageDurations),
            },
        });
        return res.status(201).json({ message: "FlowerType created", data: type });
    }
    catch (err) {
        next(err);
    }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { stageImages, stageDurations, ...rest } = req.body;
        const type = await prisma.flowerType.update({
            where: { id: req.params.id as string },
            data: {
                ...rest,
                ...(stageImages !== undefined ? { stageImages: sanitizeJson(stageImages) || null } : {}),
                ...(stageDurations !== undefined ? { stageDurations: sanitizeJson(stageDurations) || null } : {}),
            },
        });
        return res.status(200).json({ message: "FlowerType updated", data: type });
    }
    catch (err) {
        next(err);
    }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const flowerType = await prisma.flowerType.findUnique({
            where: { id: req.params.id as string },
            include: { _count: { select: { realPlants: true } } },
        });
        if (!flowerType || !flowerType.isActive) {
            return res.status(404).json({ message: "FlowerType not found" });
        }
        if (flowerType._count.realPlants > 0) {
            return res.status(400).json({ message: "Không thể xóa: Đã có nhà vườn đăng ký loại hoa này." });
        }
        await prisma.flowerType.update({
            where: { id: flowerType.id },
            data: { isActive: false },
        });
        return res.status(200).json({ message: "FlowerType soft-deleted" });
    }
    catch (err) {
        next(err);
    }
};
