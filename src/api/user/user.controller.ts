import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";

const VALID_ROLES = ["USER", "FARMER", "ADMIN"];

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.query;
    const filter: any = {};
    if (role && VALID_ROLES.includes(role as string)) {
      filter.role = role;
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
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/push-token  [USER, FARMER] — lưu Expo push token từ thiết bị
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
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id/virtual-plants  [ADMIN]
export const getUserVirtualPlants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    const plants = await prisma.virtualPlant.findMany({
      where: { userId },
      include: { flowerType: true, realPlant: true },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ metadata: { data: plants } });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id/real-plants  [ADMIN]
export const getUserRealPlants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    
    // First, find if the user is a farmer
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'FARMER') {
      return res.status(200).json({ metadata: { data: [] } });
    }

    // A farmer might own gardens. We need to find gardens owned by this farmer.
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
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id/mood-journals  [ADMIN]
export const getUserMoodJournals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id;
    const journals = await prisma.moodJournal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ metadata: { data: journals } });
  } catch (error) {
    next(error);
  }
};
