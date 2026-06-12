import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  getMyPoints,
  unlockTrackHandler,
  getUnlockedTracksHandler,
} from "./points.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Points
 *   description: Hệ thống điểm tích lũy và mở khóa nhạc Vườn Yên
 */

/**
 * @swagger
 * /points/me:
 *   get:
 *     summary: Xem điểm tích lũy, lịch sử unlock, và giới hạn gói hiện tại
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin điểm của user
 */
router.get("/me", authenticate, getMyPoints);

/**
 * @swagger
 * /points/unlocked-tracks:
 *   get:
 *     summary: Lấy danh sách ID bài hát đã mở khóa của user
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mảng các trackId đã unlock
 */
router.get("/unlocked-tracks", authenticate, getUnlockedTracksHandler);

/**
 * @swagger
 * /points/unlock/{trackId}:
 *   post:
 *     summary: Mở khóa một bài hát bằng điểm tích lũy
 *     tags: [Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mở khóa thành công
 *       400:
 *         description: Không đủ điểm hoặc vượt giới hạn gói
 *       404:
 *         description: Không tìm thấy bài hát
 *       409:
 *         description: Đã mở khóa rồi
 */
router.post("/unlock/:trackId", authenticate, unlockTrackHandler);

export default router;
