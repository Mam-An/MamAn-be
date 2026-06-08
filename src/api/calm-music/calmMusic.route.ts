import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  audioUpload,
  uploadTrackHandler,
  listTracksHandler,
  getTrackByIdHandler,
  updateTrackHandler,
  deleteTrackHandler,
  getSignedUrlHandler,
  getUploadUrlHandler,
  createTrackHandler,
} from "./calmMusic.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: CalmMusic
 *   description: API quản lý bản nhạc thư giãn cho tính năng Vườn Yên
 */

/**
 * @swagger
 * /calm-music/upload:
 *   post:
 *     summary: Upload bản nhạc mới lên bucket calm-music (chỉ ADMIN)
 *     tags: [CalmMusic]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [audio, titleVi]
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: File âm thanh (MP3, WAV, OGG, FLAC, AAC – tối đa 20MB)
 *               titleVi:
 *                 type: string
 *                 example: "Tiếng mưa rơi nhẹ"
 *                 description: Tên tiếng Việt hiển thị trên mobile
 *               hasLyrics:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *                 description: true = có lời, false = không lời (nhạc nền)
 *               category:
 *                 type: string
 *                 example: "rain"
 *                 description: Danh mục (rain | nature | piano | lofi | general)
 *     responses:
 *       201:
 *         description: Upload thành công, trả về record đầy đủ
 *       400:
 *         description: Không có file hoặc sai định dạng
 *       403:
 *         description: Không có quyền (chỉ ADMIN)
 */
router.post(
  "/upload",
  authenticate,
  authorize("ADMIN"),
  audioUpload.single("audio"),
  uploadTrackHandler
);

/**
 * @swagger
 * /calm-music/upload-url:
 *   post:
 *     summary: Lấy signed URL để upload trực tiếp từ client lên Supabase
 *     tags: [CalmMusic]
 */
router.post(
  "/upload-url",
  authenticate,
  authorize("ADMIN"),
  getUploadUrlHandler
);

/**
 * @swagger
 * /calm-music/track:
 *   post:
 *     summary: Lưu metadata bản nhạc sau khi client đã upload file thành công
 *     tags: [CalmMusic]
 */
router.post(
  "/track",
  authenticate,
  authorize("ADMIN"),
  createTrackHandler
);

/**
 * @swagger
 * /calm-music:
 *   get:
 *     summary: Lấy danh sách bản nhạc (có thể lọc theo danh mục hoặc có lời/không lời)
 *     tags: [CalmMusic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [rain, nature, piano, lofi, general]
 *         description: Lọc theo danh mục
 *       - in: query
 *         name: hasLyrics
 *         schema:
 *           type: boolean
 *         description: "true = chỉ nhạc có lời | false = chỉ nhạc không lời | bỏ trống = tất cả"
 *     responses:
 *       200:
 *         description: Danh sách bản nhạc kèm metadata đầy đủ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       titleVi:
 *                         type: string
 *                         example: "Tiếng mưa rơi nhẹ"
 *                       hasLyrics:
 *                         type: boolean
 *                       category:
 *                         type: string
 *                       publicUrl:
 *                         type: string
 *                       storagePath:
 *                         type: string
 *                       createdAt:
 *                         type: string
 */
router.get("/", authenticate, listTracksHandler);

/**
 * @swagger
 * /calm-music/{id}:
 *   get:
 *     summary: Lấy chi tiết một bản nhạc
 *     tags: [CalmMusic]
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
 *         description: Chi tiết bản nhạc
 *       404:
 *         description: Không tìm thấy
 */
router.get("/:id", authenticate, getTrackByIdHandler);

/**
 * @swagger
 * /calm-music/{id}:
 *   patch:
 *     summary: Cập nhật metadata bản nhạc (tên tiếng Việt, phân loại, danh mục...)
 *     tags: [CalmMusic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titleVi:
 *                 type: string
 *                 example: "Tiếng mưa rơi nhẹ (cập nhật)"
 *               hasLyrics:
 *                 type: boolean
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 */
router.patch("/:id", authenticate, authorize("ADMIN"), updateTrackHandler);

/**
 * @swagger
 * /calm-music/{id}:
 *   delete:
 *     summary: Xóa bản nhạc khỏi Storage và DB (chỉ ADMIN)
 *     tags: [CalmMusic]
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
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy
 */
router.delete("/:id", authenticate, authorize("ADMIN"), deleteTrackHandler);

/**
 * @swagger
 * /calm-music/{id}/signed-url:
 *   get:
 *     summary: Lấy signed URL tạm thời để stream nhạc (dùng khi bucket private)
 *     tags: [CalmMusic]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: expires
 *         schema:
 *           type: integer
 *           default: 3600
 *         description: Thời gian hết hạn (giây), mặc định 1 giờ
 *     responses:
 *       200:
 *         description: Signed URL hợp lệ
 *       404:
 *         description: Không tìm thấy bản nhạc
 */
router.get("/:id/signed-url", authenticate, getSignedUrlHandler);

export default router;
