import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";

// Helper xóa undefined khỏi JSON objects để Prisma không lỗi
const sanitizeJson = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const newObj: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) newObj[k] = v;
  }
  return Object.keys(newObj).length > 0 ? newObj : undefined;
};

// GET /api/zen-flowers
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await prisma.zenFlower.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ data: types });
  } catch (err) { next(err); }
};

// GET /api/zen-flowers/:id
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = await prisma.zenFlower.findUnique({ where: { id: req.params.id as string } });
    if (!type || !type.isActive) return res.status(404).json({ message: "ZenFlower not found" });
    return res.status(200).json({ data: type });
  } catch (err) { next(err); }
};

// POST /api/zen-flowers  [ADMIN]
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, imageUrl } = req.body;
    const type = await prisma.zenFlower.create({
      data: {
        name, 
        imageUrl,
      },
    });
    return res.status(201).json({ message: "ZenFlower created", data: type });
  } catch (err) { next(err); }
};

// PUT /api/zen-flowers/:id  [ADMIN]
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, imageUrl } = req.body;
    const type = await prisma.zenFlower.update({
      where: { id: req.params.id as string },
      data: {
        name,
        imageUrl,
      },
    });
    return res.status(200).json({ message: "ZenFlower updated", data: type });
  } catch (err) { next(err); }
};

// DELETE /api/zen-flowers/:id  [ADMIN]
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flower = await prisma.zenFlower.findUnique({
      where: { id: req.params.id as string },
    });

    if (!flower || !flower.isActive) {
      return res.status(404).json({ message: "ZenFlower not found" });
    }

    // Xóa mềm
    await prisma.zenFlower.update({
      where: { id: flower.id },
      data: { isActive: false },
    });

    return res.status(200).json({ message: "ZenFlower soft-deleted" });
  } catch (err) { next(err); }
};
