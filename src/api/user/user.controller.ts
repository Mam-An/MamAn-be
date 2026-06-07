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
