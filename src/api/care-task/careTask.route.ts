import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { uploadCharacter, uploadTaskPhoto } from "../../middlewares/upload.middleware.js";
import {
  getAll, create, updateTask,
  uploadCharacterImage, deleteCharacterImage,
  completeTask, getMyLogs,
} from "./careTask.controller.js";
import { updateCareTaskSchema } from "./careTask.schema.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: CareTask
 *   description: Micro care tasks and logs
 */

// ── Task CRUD (ADMIN) ────────────────────────────────────────────────────────

router.get("/", authenticate, getAll);

router.post(
  "/",
  authenticate,
  // authorize("ADMIN"),
  uploadCharacter.single("image"),
  create,
);

router.patch("/:id", authenticate, updateTask);

router.post(
  "/:id/character-image",
  authenticate,
  uploadCharacter.single("image"),
  uploadCharacterImage,
);

router.delete("/:id/character-image", authenticate, deleteCharacterImage);

// ── Task Logs ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /care-tasks/logs:
 *   post:
 *     summary: Hoàn thành một nhiệm vụ (hỗ trợ upload ảnh)
 *     tags: [CareTask]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [careTaskId]
 *             properties:
 *               careTaskId:
 *                 type: string
 *               virtualPlantId:
 *                 type: string
 *               note:
 *                 type: string
 *               shareToCommunity:
 *                 type: boolean
 *               visibility:
 *                 type: string
 *                 enum: [PUBLIC, ANONYMOUS]
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh hoàn thành task (JPEG/PNG/WebP, max 5MB). Bắt buộc nếu task.verifyType = PHOTO_REQUIRED.
 *     responses:
 *       201:
 *         description: Task logged, trả về taskLog + updatedPlant + communityPost (nếu có)
 *       400:
 *         description: Task cần ảnh nhưng không có ảnh, hoặc file không hợp lệ
 *       409:
 *         description: Đã hoàn thành task này hôm nay rồi
 */
router.post(
  "/logs",
  authenticate,
  uploadTaskPhoto.single("photo"),
  completeTask,
);

/**
 * @swagger
 * /care-tasks/logs/my:
 *   get:
 *     summary: Lịch sử hoàn thành task của user
 *     tags: [CareTask]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Danh sách task logs
 */
router.get("/logs/my", authenticate, getMyLogs);

export default router;
