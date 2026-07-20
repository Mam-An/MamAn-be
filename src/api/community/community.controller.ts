import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
function countReactions(reactions: {
    type: string;
}[]): Record<string, number> {
    const counts: Record<string, number> = {
        LOVE: 0, LIGHT: 0, SPROUT: 0, HUG: 0, THANKS: 0,
    };
    for (const r of reactions) {
        if (r.type in counts)
            counts[r.type] = (counts[r.type] ?? 0) + 1;
    }
    return counts;
}
const POST_INCLUDE = {
    user: { select: { fullName: true, avatarUrl: true } },
    taskLog: { select: { careTask: { select: { title: true } } } },
    reactions: { select: { type: true, userId: true } },
} as const;
export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = "1", limit = "20" } = req.query as Record<string, string>;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = Math.min(parseInt(limit), 50);
        const currentUserId = req.user?.id;
        const [posts, total] = await Promise.all([
            prisma.communityPost.findMany({
                where: { status: "VISIBLE" },
                orderBy: { createdAt: "desc" },
                skip, take,
                include: POST_INCLUDE,
            }),
            prisma.communityPost.count({ where: { status: "VISIBLE" } }),
        ]);
        const formatted = posts.map((post) => {
            const reactionCounts = countReactions(post.reactions);
            const myReactions = currentUserId
                ? post.reactions.filter((r) => r.userId === currentUserId).map((r) => r.type)
                : [];
            return {
                id: post.id,
                content: post.content,
                imageUrl: post.imageUrl,
                visibility: post.visibility,
                createdAt: post.createdAt,
                taskTitle: post.taskLog?.careTask?.title ?? null,
                displayName: post.visibility === "PUBLIC"
                    ? (post.user.fullName ?? "Người dùng ẩn danh")
                    : "Một người bạn trong vườn",
                avatarUrl: post.visibility === "PUBLIC" ? post.user.avatarUrl : null,
                reactionCounts,
                myReactions,
                isMine: currentUserId === post.userId,
            };
        });
        return res.status(200).json({
            message: "Lấy danh sách bài viết thành công.",
            metadata: {
                data: formatted,
                pagination: { page: parseInt(page), limit: take, total },
            },
        });
    }
    catch (err) {
        next(err);
    }
};
export const getPostById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: postId } = req.params;
        const currentUserId = req.user?.id;
        const post = await prisma.communityPost.findUnique({
            where: { id: postId as string },
            include: POST_INCLUDE,
        });
        if (!post)
            return res.status(404).json({ message: "Không tìm thấy bài viết." });
        const isOwner = currentUserId === post.userId;
        const isAdmin = req.user?.role === "ADMIN";
        if (post.status !== "VISIBLE" && !isOwner && !isAdmin) {
            return res.status(404).json({ message: "Không tìm thấy bài viết." });
        }
        const reactionCounts = countReactions(post.reactions);
        const myReactions = currentUserId
            ? post.reactions.filter((r) => r.userId === currentUserId).map((r) => r.type)
            : [];
        return res.status(200).json({
            message: "Lấy chi tiết bài viết thành công.",
            metadata: {
                id: post.id,
                content: post.content,
                imageUrl: post.imageUrl,
                visibility: post.visibility,
                status: post.status,
                createdAt: post.createdAt,
                taskTitle: post.taskLog?.careTask?.title ?? null,
                displayName: post.visibility === "PUBLIC"
                    ? (post.user.fullName ?? "Người dùng ẩn danh")
                    : "Một người bạn trong vườn",
                avatarUrl: post.visibility === "PUBLIC" ? post.user.avatarUrl : null,
                reactionCounts,
                myReactions,
                isMine: currentUserId === post.userId,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
export const toggleReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { id: postId } = req.params;
        const { type } = req.body;
        const VALID = ["LOVE", "LIGHT", "SPROUT", "HUG", "THANKS"];
        if (!type || !VALID.includes(type)) {
            return res.status(400).json({ message: `Loại reaction không hợp lệ. Chỉ chấp nhận: ${VALID.join(", ")}.` });
        }
        const post = await prisma.communityPost.findFirst({
            where: { id: postId as string, status: "VISIBLE" },
        });
        if (!post)
            return res.status(404).json({ message: "Không tìm thấy bài viết." });
        const existing = await prisma.communityReaction.findUnique({
            where: { postId_userId_type: { postId: postId as string, userId, type } },
        });
        if (existing) {
            await prisma.communityReaction.delete({
                where: { postId_userId_type: { postId: postId as string, userId, type } },
            });
        }
        else {
            await prisma.communityReaction.create({
                data: { postId: postId as string, userId, type: type as any },
            });
        }
        const reactions = await prisma.communityReaction.findMany({
            where: { postId: postId as string },
            select: { type: true, userId: true },
        });
        const reactionCounts = countReactions(reactions);
        const myReactions = reactions.filter((r) => r.userId === userId).map((r) => r.type);
        return res.status(200).json({
            message: existing ? "Đã bỏ reaction." : "Đã thêm reaction.",
            metadata: { toggled: !existing, reactionCounts, myReactions },
        });
    }
    catch (err) {
        next(err);
    }
};
export const reportPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: postId } = req.params;
        const reporterId = req.user!.id;
        const { reason, note } = req.body;
        if (!reason) {
            return res.status(400).json({ message: "Vui lòng cung cấp lý do báo cáo." });
        }
        const post = await prisma.communityPost.findFirst({
            where: { id: postId as string, status: "VISIBLE" },
        });
        if (!post)
            return res.status(404).json({ message: "Không tìm thấy bài viết." });
        const [report] = await prisma.$transaction([
            prisma.communityReport.create({
                data: { postId: postId as string, reporterId, reason, note: note ?? null },
            }),
            prisma.communityPost.update({
                where: { id: postId as string },
                data: {
                    reportCount: { increment: 1 },
                    status: (post.reportCount + 1) >= 3 ? "REPORTED" : undefined,
                },
            }),
        ]);
        return res.status(200).json({
            message: "Cảm ơn bạn đã giúp giữ khu vườn chung an toàn.",
            metadata: { reportId: report.id },
        });
    }
    catch (err) {
        next(err);
    }
};
export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: postId } = req.params;
        const userId = req.user!.id;
        const isAdmin = req.user!.role === "ADMIN";
        const post = await prisma.communityPost.findUnique({
            where: { id: postId as string },
        });
        if (!post)
            return res.status(404).json({ message: "Không tìm thấy bài viết." });
        if (!isAdmin && post.userId !== userId) {
            return res.status(403).json({ message: "Bạn không có quyền xóa bài viết này." });
        }
        await prisma.communityPost.update({
            where: { id: postId as string },
            data: { status: "HIDDEN" },
        });
        return res.status(200).json({ message: "Bài viết đã được xóa." });
    }
    catch (err) {
        next(err);
    }
};
export const hidePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: postId } = req.params;
        const post = await prisma.communityPost.update({
            where: { id: postId as string },
            data: { status: "HIDDEN" },
        });
        return res.status(200).json({
            message: "Bài viết đã được ẩn.",
            metadata: { id: post.id, status: post.status },
        });
    }
    catch (err) {
        next(err);
    }
};
export const setPostVisible = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: postId } = req.params;
        const post = await prisma.communityPost.update({
            where: { id: postId as string },
            data: { status: "VISIBLE" },
        });
        return res.status(200).json({
            message: "Bài viết đã được khôi phục.",
            metadata: { id: post.id, status: post.status },
        });
    }
    catch (err) {
        next(err);
    }
};
export const getAllAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = "1", limit = "20", status } = req.query as Record<string, string>;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = Math.min(parseInt(limit), 50);
        const where: any = {};
        if (status)
            where.status = status;
        const [posts, total] = await Promise.all([
            prisma.communityPost.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip, take,
                include: {
                    user: { select: { fullName: true, email: true, avatarUrl: true } },
                    taskLog: { select: { careTask: { select: { title: true } } } },
                    reactions: { select: { type: true } },
                    reports: { select: { id: true, reason: true, createdAt: true } },
                },
            }),
            prisma.communityPost.count({ where }),
        ]);
        const formatted = posts.map((post) => ({
            id: post.id,
            content: post.content,
            imageUrl: post.imageUrl,
            visibility: post.visibility,
            status: post.status,
            reportCount: post.reportCount,
            createdAt: post.createdAt,
            taskTitle: post.taskLog?.careTask?.title ?? null,
            user: post.user,
            reactionCounts: countReactions(post.reactions),
            reports: post.reports,
        }));
        return res.status(200).json({
            message: "Lấy danh sách bài viết (admin) thành công.",
            metadata: {
                data: formatted,
                pagination: { page: parseInt(page), limit: take, total },
            },
        });
    }
    catch (err) {
        next(err);
    }
};
