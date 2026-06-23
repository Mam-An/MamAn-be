import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { getMyNotifications, markRead, markAllRead } from "./notification.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notification
 *   description: In-app notification APIs
 */

/**
 * @swagger
 * /notifications/my:
 *   get:
 *     summary: Get notifications for current user
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications (newest first)
 */
router.get("/my", authenticate, getMyNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notification]
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
 *         description: Marked as read
 */
router.patch("/:id/read", authenticate, markRead);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.patch("/read-all", authenticate, markAllRead);

/**
 * @swagger
 * /notifications/test-fcm:
 *   post:
 *     summary: Test sending an FCM push notification
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: (Tùy chọn) FCM token. Nếu không truyền sẽ lấy từ tài khoản hiện tại.
 *     responses:
 *       200:
 *         description: Lệnh push đã được thực thi
 *       500:
 *         description: Lỗi từ Firebase Admin (nếu sai config)
 */
import { testFcm, registerFcmToken } from "./notification.controller.js";

/**
 * @swagger
 * /notifications/register-token:
 *   post:
 *     summary: Register FCM token for push notifications
 *     tags: [Notification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               platform:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token registered
 */
router.post("/register-token", authenticate, registerFcmToken);

router.post("/test-fcm", authenticate, testFcm);

export default router;
