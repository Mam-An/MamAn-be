import type { Request, Response, NextFunction } from "express";
import { getAllDefinitions, getUserAchievements, refreshUserAchievements, } from "./achievement.service.js";
export const listDefinitions = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getAllDefinitions();
        return res.status(200).json({ data });
    }
    catch (err) {
        next(err);
    }
};
export const getMyAchievements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const data = await getUserAchievements(userId);
        const unlockedCount = data.filter((a) => a.unlocked).length;
        return res.status(200).json({
            data,
            meta: {
                total: data.length,
                unlockedCount,
                lockedCount: data.length - unlockedCount,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
export const getUserAchievementsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requesterId = req.user!.id;
        const targetUserId = req.params.id as string;
        if (requesterId !== targetUserId && req.user!.role !== "ADMIN") {
            return res.status(403).json({ message: "Không có quyền truy cập." });
        }
        const data = await getUserAchievements(targetUserId);
        return res.status(200).json({ data });
    }
    catch (err) {
        next(err);
    }
};
export const triggerProgressRefresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { newlyUnlocked } = await refreshUserAchievements(userId);
        const allAchievements = await getUserAchievements(userId);
        const newlyUnlockedDetails = allAchievements.filter((a) => newlyUnlocked.includes(a.slug));
        return res.status(200).json({
            data: allAchievements,
            newlyUnlocked: newlyUnlockedDetails,
            meta: {
                refreshed: true,
                newlyUnlockedCount: newlyUnlocked.length,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
