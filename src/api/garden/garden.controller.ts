import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { status } = req.query;
        const where: any = {};
        if (user.role === "FARMER") {
            where.farmerId = user.id;
        }
        if (status) {
            where.status = String(status);
        }
        const gardens = await prisma.garden.findMany({
            where,
            include: { farmer: { select: { id: true, fullName: true, email: true } } },
            orderBy: { createdAt: "desc" },
        });
        return res.status(200).json({ data: gardens });
    }
    catch (err) {
        next(err);
    }
};
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const garden = await prisma.garden.findUnique({
            where: { id: req.params.id as string },
            include: {
                farmer: { select: { id: true, fullName: true, email: true } },
                realPlants: { include: { flowerType: true } },
            },
        });
        if (!garden)
            return res.status(404).json({ message: "Garden not found" });
        return res.status(200).json({ data: garden });
    }
    catch (err) {
        next(err);
    }
};
export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { name, address, description, imageUrl } = req.body;
        const farmerId = user.role === "ADMIN" ? (req.body.farmerId ?? user.id) : user.id;
        const status = user.role === "ADMIN" ? "APPROVED" : "PENDING";
        const garden = await prisma.garden.create({
            data: { name, address, description, imageUrl, farmerId, status },
        });
        return res.status(201).json({ message: "Garden created", data: garden });
    }
    catch (err) {
        next(err);
    }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const garden = await prisma.garden.update({
            where: { id: req.params.id as string },
            data: req.body,
        });
        return res.status(200).json({ message: "Garden updated", data: garden });
    }
    catch (err) {
        next(err);
    }
};
export const approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const garden = await prisma.garden.update({
            where: { id: req.params.id as string },
            data: { status: "APPROVED", rejectedReason: null },
        });
        return res.status(200).json({ message: "Garden approved", data: garden });
    }
    catch (err) {
        next(err);
    }
};
export const reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { reason } = req.body;
        const garden = await prisma.garden.update({
            where: { id: req.params.id as string },
            data: { status: "REJECTED", rejectedReason: reason ?? null },
        });
        return res.status(200).json({ message: "Garden rejected", data: garden });
    }
    catch (err) {
        next(err);
    }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await prisma.garden.update({ where: { id: req.params.id as string }, data: { isActive: false } });
        return res.status(200).json({ message: "Garden deactivated" });
    }
    catch (err) {
        next(err);
    }
};
export const getPlantSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: gardenId } = req.params;
        const plants = await prisma.realPlant.findMany({
            where: { gardenId: gardenId as string },
            select: {
                id: true,
                code: true,
                isAssigned: true,
                status: true,
                flowerTypeId: true,
                flowerType: {
                    select: { id: true, name: true, imageUrl: true, description: true, defaultDuration: true },
                },
            },
        });
        const summaryMap = new Map<string, {
            flowerType: any;
            total: number;
            available: number;
            assigned: number;
        }>();
        for (const plant of plants) {
            const key = plant.flowerTypeId;
            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    flowerType: plant.flowerType,
                    total: 0,
                    available: 0,
                    assigned: 0,
                });
            }
            const entry = summaryMap.get(key)!;
            entry.total += 1;
            if (plant.isAssigned)
                entry.assigned += 1;
            else
                entry.available += 1;
        }
        const summary = Array.from(summaryMap.values());
        return res.status(200).json({ data: summary });
    }
    catch (err) {
        next(err);
    }
};
