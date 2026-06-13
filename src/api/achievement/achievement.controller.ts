import type { Request, Response, NextFunction } from "express";
import {
  getAllDefinitions,
  getUserAchievements,
  refreshUserAchievements,
} from "./achievement.service.js";

// GET /achievements — danh sách tất cả definitions (public metadata)
export const listDefinitions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await getAllDefinitions();
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

// GET /achievements/me — achievements của user đang đăng nhập (với tiến trình)
export const getMyAchievements = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (err) {
    next(err);
  }
};

// GET /users/:id/achievements — achievements của 1 user cụ thể (admin hoặc chính user)
export const getUserAchievementsById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const requesterId = req.user!.id;
    const { id: targetUserId } = req.params;

    // Chỉ cho phép xem của chính mình hoặc admin
    if (requesterId !== targetUserId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ message: "Không có quyền truy cập." });
    }

    const data = await getUserAchievements(targetUserId);
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

// POST /achievements/progress — trigger refresh tiến trình (client gọi sau mỗi hành động)
// Backend tự tính lại từ DB, client không tự unlock được
export const triggerProgressRefresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const { newlyUnlocked } = await refreshUserAchievements(userId);

    // Lấy lại danh sách đầy đủ sau khi refresh
    const allAchievements = await getUserAchievements(userId);

    // Map slug → full achievement info cho các unlocked mới
    const newlyUnlockedDetails = allAchievements.filter(
      (a) => newlyUnlocked.includes(a.slug),
    );

    return res.status(200).json({
      data: allAchievements,
      newlyUnlocked: newlyUnlockedDetails,
      meta: {
        refreshed: true,
        newlyUnlockedCount: newlyUnlocked.length,
      },
    });
  } catch (err) {
    next(err);
  }
};
