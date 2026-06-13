import type { Request, Response } from "express";
import prisma from "../../utils/prisma.js";
import {
  getOrCreateUserPoints,
  getAvailablePoints,
  unlockTrack,
  getUnlockedTrackIds,
} from "./points.service.js";

// ── GET /points/me — xem điểm tích lũy của user đang đăng nhập ──────────────
export const getMyPoints = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const points = await getOrCreateUserPoints(userId);
    const available = points.totalPoints - points.spentPoints;

    // Lấy 10 lần unlock gần nhất
    const recentUnlocks = await prisma.userUnlockedTrack.findMany({
      where: { userId },
      include: { track: { select: { id: true, titleVi: true, category: true } } },
      orderBy: { unlockedAt: "desc" },
      take: 10,
    });

    // Thông tin gói hiện tại
    const sub = await prisma.userSubscription.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      include: {
        plan: { select: { name: true, maxRedeemSongs: true, code: true } },
      },
      orderBy: { startsAt: "desc" },
    });

    const unlockedCount = await prisma.userUnlockedTrack.count({ where: { userId } });

    return res.status(200).json({
      data: {
        totalPoints: points.totalPoints,
        spentPoints: points.spentPoints,
        availablePoints: available,
        unlockedCount,
        maxRedeemSongs: sub?.plan.maxRedeemSongs ?? 0,
        currentPlan: sub?.plan ?? null,
        recentUnlocks,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /points/unlock/:trackId — mở khóa bài hát bằng điểm ───────────────
export const unlockTrackHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const trackId = req.params.trackId as string;

    const result = await unlockTrack(userId, trackId);

    const available = await getAvailablePoints(userId);

    return res.status(200).json({
      message: "Mở khóa bài hát thành công!",
      data: { ...result, remainingPoints: available },
    });
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    const status =
      msg.toLowerCase().includes('không tìm thấy') ? 404
      : msg.includes('đã mở') ? 409
      : msg.includes('cần') || msg.includes('tối đa') || msg.includes('miễn phí') ? 400
      : 500;
    return res.status(status).json({ message: msg });
  }
};

// ── GET /points/unlocked-tracks — danh sách trackId đã unlock ───────────────
export const getUnlockedTracksHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const ids = await getUnlockedTrackIds(userId);
    return res.status(200).json({ data: ids });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
