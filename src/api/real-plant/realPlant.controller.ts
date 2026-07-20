import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { gardenId, status } = req.query;
        const where: any = {};
        if (gardenId)
            where.gardenId = gardenId as string;
        if (status)
            where.status = status as string;
        const plants = await prisma.realPlant.findMany({
            where,
            include: {
                flowerType: true,
                garden: { select: { id: true, name: true } },
                updates: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
                virtualPlant: {
                    select: {
                        createdAt: true,
                        nickname: true,
                        user: { select: { id: true, fullName: true, email: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({ data: plants });
    }
    catch (err) {
        next(err);
    }
};
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const plant = await prisma.realPlant.findUnique({
            where: { id: req.params.id as string },
            include: {
                flowerType: true,
                garden: true,
                updates: { orderBy: { createdAt: "desc" }, take: 10 },
                virtualPlant: {
                    select: {
                        id: true,
                        nickname: true,
                        userId: true,
                        user: { select: { id: true, fullName: true, avatarUrl: true } }
                    }
                },
                comments: {
                    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
                    orderBy: { createdAt: "desc" }
                },
                reactions: {
                    select: { emoji: true, userId: true }
                }
            },
        });
        if (!plant)
            return res.status(404).json({ message: "RealPlant not found" });
        return res.status(200).json({ data: plant });
    }
    catch (err) {
        next(err);
    }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, flowerTypeId, gardenId, plantedAt, status } = req.body;
        const plant = await prisma.realPlant.create({
            data: { code, flowerTypeId, gardenId, status, plantedAt: plantedAt ? new Date(plantedAt) : undefined },
        });
        return res.status(201).json({ message: "RealPlant created", data: plant });
    }
    catch (err) {
        next(err);
    }
};
export const batchCreate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { flowerTypeId, gardenId, quantity, plantedAt } = req.body;
        if (!flowerTypeId || !gardenId || !quantity || quantity < 1 || quantity > 100) {
            return res.status(400).json({ message: "flowerTypeId, gardenId, quantity (1-100) are required" });
        }
        const flowerType = await prisma.flowerType.findUnique({ where: { id: flowerTypeId } });
        if (!flowerType)
            return res.status(404).json({ message: "FlowerType not found" });
        const existingCount = await prisma.realPlant.count({ where: { flowerTypeId, gardenId } });
        const prefix = flowerType.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_")
            .toUpperCase()
            .substring(0, 10);
        const data = Array.from({ length: quantity }, (_, i) => ({
            code: `${prefix}-${String(existingCount + i + 1).padStart(3, "0")}`,
            flowerTypeId,
            gardenId,
            plantedAt: plantedAt ? new Date(plantedAt) : undefined,
        }));
        const plants = await prisma.realPlant.createMany({ data });
        return res.status(201).json({
            message: `${plants.count} plants created successfully`,
            count: plants.count,
        });
    }
    catch (err) {
        next(err);
    }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = { ...req.body };
        if (body.plantedAt)
            body.plantedAt = new Date(body.plantedAt);
        const plant = await prisma.realPlant.update({ where: { id: req.params.id as string }, data: body });
        return res.status(200).json({ message: "RealPlant updated", data: plant });
    }
    catch (err) {
        next(err);
    }
};
