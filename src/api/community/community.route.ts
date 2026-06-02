import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  getPosts,
  getPostById,
  toggleReaction,
  reportPost,
  deletePost,
  hidePost,
  setPostVisible,
  getAllAdmin,
} from "./community.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Community
 *   description: Vườn chung — chia sẻ khoảnh khắc tích cực
 */

// ── Public feed (auth required để trả myReactions) ───────────────────────────

/** GET /api/community/posts — Danh sách bài VISIBLE */
router.get("/posts", authenticate, getPosts);

/** GET /api/community/posts/:id — Chi tiết bài */
router.get("/posts/:id", authenticate, getPostById);

// ── User actions ──────────────────────────────────────────────────────────────

/** POST /api/community/posts/:id/reactions — Toggle reaction */
router.post("/posts/:id/reactions", authenticate, toggleReaction);

/** POST /api/community/posts/:id/report — Báo cáo bài viết */
router.post("/posts/:id/report", authenticate, reportPost);

/** DELETE /api/community/posts/:id — User xóa bài của mình (hoặc admin xóa mọi bài) */
router.delete("/posts/:id", authenticate, deletePost);

// ── Admin actions ─────────────────────────────────────────────────────────────

/** GET  /api/community/admin/posts — Tất cả bài (có lọc status) */
router.get("/admin/posts", authenticate, authorize("ADMIN"), getAllAdmin);

/** PATCH /api/community/admin/posts/:id/hide — Ẩn bài */
router.patch("/admin/posts/:id/hide", authenticate, authorize("ADMIN"), hidePost);

/** PATCH /api/community/admin/posts/:id/visible — Khôi phục bài */
router.patch("/admin/posts/:id/visible", authenticate, authorize("ADMIN"), setPostVisible);

export default router;
