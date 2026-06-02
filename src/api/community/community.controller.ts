import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/community/posts — danh sách bài cộng đồng (chỉ VISIBLE)
// ─────────────────────────────────────────────────────────────────────────────
export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 50);

    const [posts, total] = await Promise.all([
      prisma.communityPost.findMany({
        where: { status: "VISIBLE" },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          taskLog: {
            select: {
              careTask: { select: { title: true } },
            },
          },
          reactions: {
            select: { type: true },
          },
        },
      }),
      prisma.communityPost.count({ where: { status: "VISIBLE" } }),
    ]);

    // Ẩn danh nếu cần + tổng hợp reactions
    const formatted = posts.map((post) => {
      // Đếm từng loại reaction
      const reactionCounts: Record<string, number> = {};
      for (const r of post.reactions) {
        reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1;
      }

      return {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        visibility: post.visibility,
        createdAt: post.createdAt,
        taskTitle: post.taskLog?.careTask?.title ?? null,
        // Nếu ANONYMOUS thì ẩn tên thật
        displayName:
          post.visibility === "PUBLIC"
            ? (post.user.fullName ?? "Người dùng ẩn danh")
            : "Một người bạn trong vườn",
        avatarUrl:
          post.visibility === "PUBLIC" ? post.user.avatarUrl : null,
        reactionCounts,
      };
    });

    return res.status(200).json({
      data: formatted,
      pagination: { page: parseInt(page), limit: take, total },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/community/posts/:id/reactions — toggle reaction (có → xóa, chưa → thêm)
// ─────────────────────────────────────────────────────────────────────────────
export const toggleReaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id: postId } = req.params;
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Thiếu trường 'type' (LOVE | LIGHT | SPROUT | HUG | THANKS)." });
    }

    const validTypes = ["LOVE", "LIGHT", "SPROUT", "HUG", "THANKS"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: `Loại reaction không hợp lệ. Chỉ chấp nhận: ${validTypes.join(", ")}.` });
    }

    // Kiểm tra bài tồn tại và VISIBLE
    const post = await prisma.communityPost.findFirst({
      where: { id: postId as string, status: "VISIBLE" },
    });
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    // Toggle: kiểm tra reaction đã tồn tại chưa
    const existing = await prisma.communityReaction.findUnique({
      where: { postId_userId_type: { postId: postId as string, userId, type } },
    });

    if (existing) {
      // Đã reaction → xóa (toggle off)
      await prisma.communityReaction.delete({
        where: { postId_userId_type: { postId: postId as string, userId, type } },
      });
      return res.status(200).json({ message: "Đã bỏ reaction.", toggled: false });
    } else {
      // Chưa reaction → thêm (toggle on)
      const reaction = await prisma.communityReaction.create({
        data: { postId: postId as string, userId, type: type as any },
      });
      return res.status(201).json({ message: "Đã thêm reaction.", toggled: true, data: reaction });
    }
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/community/posts/:id/report — báo cáo bài viết
// ─────────────────────────────────────────────────────────────────────────────
export const reportPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: postId } = req.params;
    // reason và note KHÔNG được log ra console (bảo mật nội dung)

    const post = await prisma.communityPost.findFirst({
      where: { id: postId as string, status: "VISIBLE" },
    });
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    const newCount = post.reportCount + 1;
    // Nếu reportCount >= 3 → tự động chuyển sang REPORTED
    const newStatus = newCount >= 3 ? "REPORTED" : post.status;

    await prisma.communityPost.update({
      where: { id: postId as string },
      data: { reportCount: newCount, status: newStatus as any },
    });

    return res.status(200).json({ message: "Đã ghi nhận báo cáo của bạn. Cảm ơn bạn đã giúp cộng đồng an toàn hơn." });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/community/posts/:id/hide — Admin ẩn bài
// ─────────────────────────────────────────────────────────────────────────────
export const hidePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: postId } = req.params;

    const post = await prisma.communityPost.update({
      where: { id: postId as string },
      data: { status: "HIDDEN" },
    });

    return res.status(200).json({ message: "Bài viết đã được ẩn.", data: { id: post.id, status: post.status } });
  } catch (err) { next(err); }
};
