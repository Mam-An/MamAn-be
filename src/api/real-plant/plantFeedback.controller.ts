import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";

const ALLOWED_EMOJIS = ["❤️", "🌸", "😊", "💪", "🌿", "🥰", "✨"];

// ── POST /real-plants/:id/react ─────────────────────────────────────────────
// User thả cảm xúc cho cây thật. Nếu đã react rồi → đổi emoji; gửi cùng emoji → bỏ react
export const reactToPlant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const realPlantId = req.params.id as string;
    const { emoji } = req.body as { emoji: string };

    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return res.status(400).json({ message: `Emoji không hợp lệ. Chọn một trong: ${ALLOWED_EMOJIS.join(" ")}` });
    }

    // Kiểm tra plant tồn tại
    const plant = await prisma.realPlant.findUnique({
      where: { id: realPlantId },
      select: { id: true },
    });
    if (!plant) return res.status(404).json({ message: "Không tìm thấy cây" });

    // Kiểm tra user có đơn hàng có cây này không
    const userOrder = await prisma.order.findFirst({
      where: {
        userId,
        realPlantId,
        status: { in: ["PAID", "FULFILLING", "COMPLETED"] },
      },
    });
    if (!userOrder) {
      return res.status(403).json({ message: "Bạn không có quyền react cho cây này" });
    }

    // Kiểm tra đã react chưa
    const existing = await prisma.plantReaction.findUnique({
      where: { realPlantId_userId: { realPlantId, userId } },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        // Bỏ react
        await prisma.plantReaction.delete({ where: { id: existing.id } });
        return res.status(200).json({ message: "Đã bỏ cảm xúc", reaction: null });
      } else {
        // Đổi emoji
        const updated = await prisma.plantReaction.update({
          where: { id: existing.id },
          data: { emoji },
        });
        return res.status(200).json({ message: "Đã cập nhật cảm xúc", reaction: updated });
      }
    }

    // Tạo mới
    const reaction = await prisma.plantReaction.create({
      data: { realPlantId, userId, emoji },
    });
    return res.status(201).json({ message: "Đã thả cảm xúc 🌿", reaction });
  } catch (err) { next(err); }
};

// ── GET /real-plants/:id/reactions ─────────────────────────────────────────
// Lấy tổng hợp reactions của 1 cây + reaction của user hiện tại
export const getReactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const realPlantId = req.params.id as string;

    const reactions = await prisma.plantReaction.findMany({
      where: { realPlantId },
      select: { emoji: true, userId: true },
    });

    // Tổng hợp theo emoji
    const summary: Record<string, number> = {};
    for (const r of reactions) {
      summary[r.emoji] = (summary[r.emoji] ?? 0) + 1;
    }

    const myReaction = userId
      ? reactions.find((r) => r.userId === userId)?.emoji ?? null
      : null;

    return res.status(200).json({ data: summary, myReaction, total: reactions.length });
  } catch (err) { next(err); }
};

// ── POST /real-plants/:id/comments ─────────────────────────────────────────
// User gửi bình luận cho nhà vườn
export const addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const realPlantId = req.params.id as string;
    const { content } = req.body as { content: string };

    if (!content?.trim()) {
      return res.status(400).json({ message: "Nội dung bình luận không được rỗng" });
    }
    if (content.length > 500) {
      return res.status(400).json({ message: "Bình luận tối đa 500 ký tự" });
    }

    // Kiểm tra plant tồn tại
    const plant = await prisma.realPlant.findUnique({
      where: { id: realPlantId },
      select: { id: true },
    });
    if (!plant) return res.status(404).json({ message: "Không tìm thấy cây" });

    // Kiểm tra user có đơn hàng gắn với cây này
    const userOrder = await prisma.order.findFirst({
      where: {
        userId,
        realPlantId,
        status: { in: ["PAID", "FULFILLING", "COMPLETED"] },
      },
    });
    if (!userOrder) {
      return res.status(403).json({ message: "Bạn không có quyền bình luận cho cây này" });
    }

    const comment = await prisma.plantComment.create({
      data: { realPlantId, userId, content: content.trim() },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    const formattedComment = {
      ...comment,
      user: {
        id: comment.user.id,
        name: comment.user.fullName ?? "Người dùng",
        avatarUrl: comment.user.avatarUrl,
      },
    };

    return res.status(201).json({ message: "Đã gửi bình luận 💬", data: formattedComment });
  } catch (err) { next(err); }
};

// ── GET /real-plants/:id/comments ──────────────────────────────────────────
// Nhà vườn & user xem bình luận của 1 cây
export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const realPlantId = req.params.id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const [comments, total] = await Promise.all([
      prisma.plantComment.findMany({
        where: { realPlantId },
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.plantComment.count({ where: { realPlantId } }),
    ]);

    const formattedComments = comments.map((c) => ({
      ...c,
      user: {
        id: c.user.id,
        name: c.user.fullName ?? "Người dùng",
        avatarUrl: c.user.avatarUrl,
      },
    }));

    return res.status(200).json({
      data: formattedComments,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ── GET /real-plants/feedback-summary  [FARMER only] ───────────────────────
// Tổng hợp toàn bộ reactions + comments mới nhất cho dashboard nhà vườn
export const getFeedbackSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 10 bình luận gần nhất trên toàn bộ cây của nhà vườn
    const latestComments = await prisma.plantComment.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        realPlant: { select: { id: true, code: true, garden: { select: { name: true } } } },
      },
    });

    const formattedLatestComments = latestComments.map((c) => ({
      ...c,
      user: {
        id: c.user.id,
        name: c.user.fullName ?? "Người dùng",
        avatarUrl: c.user.avatarUrl,
      },
    }));

    // Tổng reactions phân loại theo emoji
    const allReactions = await prisma.plantReaction.groupBy({
      by: ["emoji"],
      _count: { emoji: true },
      orderBy: { _count: { emoji: "desc" } },
    });

    // Cây được react nhiều nhất
    const topReacted = await prisma.plantReaction.groupBy({
      by: ["realPlantId"],
      _count: { realPlantId: true },
      orderBy: { _count: { realPlantId: "desc" } },
      take: 5,
    });

    const topReactedWithDetail = await Promise.all(
      topReacted.map(async (r) => {
        const plant = await prisma.realPlant.findUnique({
          where: { id: r.realPlantId },
          select: { id: true, code: true, garden: { select: { name: true } } },
        });
        return { ...plant, reactionCount: r._count.realPlantId };
      })
    );

    return res.status(200).json({
      data: {
        latestComments: formattedLatestComments,
        reactionSummary: allReactions.map((r) => ({ emoji: r.emoji, count: r._count.emoji })),
        topReacted: topReactedWithDetail,
        totalComments: await prisma.plantComment.count(),
        totalReactions: await prisma.plantReaction.count(),
      },
    });
  } catch (err) { next(err); }
};
