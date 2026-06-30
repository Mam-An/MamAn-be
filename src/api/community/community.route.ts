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

/**
 * @swagger
 * /community/posts:
 *   get:
 *     summary: Danh sách bài VISIBLE
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách bài post trong community
 */
router.get("/posts", authenticate, getPosts);

/**
 * @swagger
 * /community/posts/{id}:
 *   get:
 *     summary: Chi tiết bài post
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin chi tiết bài post
 */
router.get("/posts/:id", authenticate, getPostById);

// ── User actions ──────────────────────────────────────────────────────────────

/**
 * @swagger
 * /community/posts/{id}/reactions:
 *   post:
 *     summary: Toggle reaction cho bài viết
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reactionType:
 *                 type: string
 *                 example: "LIKE"
 *     responses:
 *       200:
 *         description: Đã thay đổi trạng thái reaction
 */
router.post("/posts/:id/reactions", authenticate, toggleReaction);

/**
 * @swagger
 * /community/posts/{id}/report:
 *   post:
 *     summary: Báo cáo bài viết
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Spam content"
 *     responses:
 *       200:
 *         description: Báo cáo thành công
 */
router.post("/posts/:id/report", authenticate, reportPost);

/**
 * @swagger
 * /community/posts/{id}:
 *   delete:
 *     summary: Xóa bài viết (User tự xóa hoặc Admin xóa)
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã xóa bài viết
 */
router.delete("/posts/:id", authenticate, deletePost);

// ── Admin actions ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /community/admin/posts:
 *   get:
 *     summary: (Admin) Lấy tất cả bài (có lọc status)
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Lọc theo status (VISIBLE, HIDDEN, v.v.)
 *     responses:
 *       200:
 *         description: Trả về danh sách post
 */
router.get("/admin/posts", authenticate, authorize("ADMIN"), getAllAdmin);

/**
 * @swagger
 * /community/admin/posts/{id}/hide:
 *   patch:
 *     summary: (Admin) Ẩn bài viết
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã ẩn bài viết
 */
router.patch("/admin/posts/:id/hide", authenticate, authorize("ADMIN"), hidePost);

/**
 * @swagger
 * /community/admin/posts/{id}/visible:
 *   patch:
 *     summary: (Admin) Khôi phục bài viết
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã khôi phục trạng thái VISIBLE
 */
router.patch("/admin/posts/:id/visible", authenticate, authorize("ADMIN"), setPostVisible);

export default router;
