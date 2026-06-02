import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { getPosts, toggleReaction, reportPost, hidePost, getAllAdmin, deletePost } from "./community.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Community
 *   description: Bảng tin cộng đồng Mầm An
 */

/**
 * GET /api/community/posts
 * Danh sách bài cộng đồng (chỉ VISIBLE), có phân trang.
 */
router.get("/posts", authenticate, getPosts);

/**
 * POST /api/community/posts/:id/reactions
 * Toggle reaction (thêm nếu chưa có, xóa nếu đã có).
 * Body: { "type": "LOVE" | "LIGHT" | "SPROUT" | "HUG" | "THANKS" }
 */
router.post("/posts/:id/reactions", authenticate, toggleReaction);

/**
 * POST /api/community/posts/:id/report
 * Báo cáo bài viết không phù hợp.
 * Body: { "reason": "...", "note": "..." }
 */
router.post("/posts/:id/report", authenticate, reportPost);

/**
 * PATCH /api/community/posts/:id/hide  [ADMIN]
 * Ẩn bài viết vi phạm.
 */
router.patch("/posts/:id/hide", authenticate, authorize("ADMIN"), hidePost);

/**
 * GET /api/community/admin/posts  [ADMIN]
 * Lấy tất cả bài viết (quản lý cộng đồng)
 */
router.get("/admin/posts", authenticate, authorize("ADMIN"), getAllAdmin);

/**
 * DELETE /api/community/posts/:id  [ADMIN]
 * Xóa bài viết
 */
router.delete("/posts/:id", authenticate, authorize("ADMIN"), deletePost);

export default router;
