import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
import type { Prisma, UserRole } from "../../generated/prisma/index.js";
const VALID_ROLES = ["USER", "FARMER", "ADMIN"];
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { role } = req.query;
        const filter: Prisma.UserWhereInput = {};
        if (role && typeof role === "string" && VALID_ROLES.includes(role)) {
            filter.role = role as UserRole;
        }
        const users = await prisma.user.findMany({
            where: filter,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
        return res.status(200).json({ data: users });
    }
    catch (error) {
        next(error);
    }
};
export const toggleActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { isActive } = req.body;
        const user = await prisma.user.update({
            where: { id },
            data: { isActive },
            select: { id: true, isActive: true, email: true },
        });
        return res.status(200).json({ message: "User status updated", data: user });
    }
    catch (error) {
        next(error);
    }
};
export const savePushToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { pushToken } = req.body;
        if (!pushToken || typeof pushToken !== 'string') {
            return res.status(400).json({ error: 'pushToken is required' });
        }
        await prisma.user.update({
            where: { id: userId },
            data: { expoPushToken: pushToken },
        });
        return res.status(200).json({ message: 'Push token saved' });
    }
    catch (error) {
        next(error);
    }
};
export const getUserVirtualPlants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.id as string;
        const plants = await prisma.virtualPlant.findMany({
            where: { userId },
            include: { flowerType: true, realPlant: true },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({ metadata: { data: plants } });
    }
    catch (error) {
        next(error);
    }
};
export const getUserRealPlants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.id as string;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(200).json({ metadata: { data: [] } });
        }
        if (user.role === 'USER') {
            const vps = await prisma.virtualPlant.findMany({
                where: { userId },
                select: { realPlantId: true }
            });
            const rpIds = vps.map(v => v.realPlantId).filter((id): id is string => Boolean(id));
            if (rpIds.length === 0) {
                return res.status(200).json({ metadata: { data: [] } });
            }
            const plants = await prisma.realPlant.findMany({
                where: { id: { in: rpIds } },
                include: { flowerType: true, garden: true },
                orderBy: { createdAt: "desc" },
            });
            return res.status(200).json({ metadata: { data: plants } });
        }
        if (user.role === 'FARMER') {
            const gardens = await prisma.garden.findMany({
                where: { farmerId: userId },
                select: { id: true }
            });
            const gardenIds = gardens.map(g => g.id);
            if (gardenIds.length === 0) {
                return res.status(200).json({ metadata: { data: [] } });
            }
            const plants = await prisma.realPlant.findMany({
                where: { gardenId: { in: gardenIds } },
                include: { flowerType: true, garden: true },
                orderBy: { createdAt: "desc" },
            });
            return res.status(200).json({ metadata: { data: plants } });
        }
        return res.status(200).json({ metadata: { data: [] } });
    }
    catch (error) {
        next(error);
    }
};
export const getUserMoodJournals = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.params.id as string;
        const journals = await prisma.moodJournal.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({ metadata: { data: journals } });
    }
    catch (error) {
        next(error);
    }
};
export const getMyFlowerGarden = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const harvests = await prisma.flowerHarvest.findMany({
            where: { userId },
            orderBy: { harvestedAt: "desc" },
            select: {
                id: true,
                flowerTypeId: true,
                flowerName: true,
                flowerImageUrl: true,
                nickname: true,
                growthDays: true,
                harvestedAt: true,
                virtualPlantId: true,
            },
        });
        const speciesMap = new Map<string, {
            flowerTypeId: string;
            flowerName: string;
            flowerImageUrl: string | null;
            harvestCount: number;
            firstHarvestedAt: Date;
            latestHarvestedAt: Date;
        }>();
        for (const h of harvests) {
            const existing = speciesMap.get(h.flowerTypeId);
            const harvestedAt = new Date(h.harvestedAt);
            if (existing) {
                existing.harvestCount += 1;
                if (harvestedAt < existing.firstHarvestedAt) {
                    existing.firstHarvestedAt = harvestedAt;
                }
                if (harvestedAt > existing.latestHarvestedAt) {
                    existing.latestHarvestedAt = harvestedAt;
                }
            }
            else {
                speciesMap.set(h.flowerTypeId, {
                    flowerTypeId: h.flowerTypeId,
                    flowerName: h.flowerName,
                    flowerImageUrl: h.flowerImageUrl,
                    harvestCount: 1,
                    firstHarvestedAt: harvestedAt,
                    latestHarvestedAt: harvestedAt,
                });
            }
        }
        const species = Array.from(speciesMap.values())
            .sort((a, b) => b.harvestCount - a.harvestCount)
            .map((s) => ({
            ...s,
            firstHarvestedAt: s.firstHarvestedAt.toISOString(),
            latestHarvestedAt: s.latestHarvestedAt.toISOString(),
        }));
        const recentHarvests = harvests.slice(0, 10).map((h) => ({
            id: h.id,
            plantId: h.virtualPlantId,
            flowerTypeId: h.flowerTypeId,
            flowerName: h.flowerName,
            flowerImageUrl: h.flowerImageUrl,
            nickname: h.nickname,
            growthDays: h.growthDays,
            harvestedAt: h.harvestedAt,
        }));
        return res.status(200).json({
            totalHarvested: harvests.length,
            uniqueSpeciesCount: species.length,
            species,
            recentHarvests,
        });
    }
    catch (error) {
        next(error);
    }
};
