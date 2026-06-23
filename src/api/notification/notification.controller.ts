import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";

// GET /api/notifications/my
export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.status(200).json({ data: notifications });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id: id as string, userId },
      data: { isRead: true },
    });
    return res.status(200).json({ message: "Marked as read" });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return res.status(200).json({ message: "All marked as read" });
  } catch (err) { next(err); }
};

import { sendFcmNotification } from "../../utils/fcmPush.js";

// POST /api/notifications/register-token
export const registerFcmToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { token, platform } = req.body;

    if (!token) return res.status(400).json({ message: "Token is required" });

    // Cập nhật UserDevice
    const existing = await prisma.userDevice.findUnique({ where: { fcmToken: token } });
    
    if (existing) {
      if (existing.userId !== userId) {
        await prisma.userDevice.update({
          where: { id: existing.id },
          data: { userId, platform }
        });
      }
    } else {
      await prisma.userDevice.create({
        data: { userId, fcmToken: token, platform }
      });
    }

    // Cập nhật lastActiveAt
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() }
    });

    return res.status(200).json({ message: "Token registered successfully" });
  } catch (err) { next(err); }
};

// POST /api/notifications/test-fcm
export const testFcm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    const token = req.body.token || user?.expoPushToken;
    
    if (!token) {
      return res.status(400).json({ message: "Không tìm thấy token. Hãy truyền `token` trong body, hoặc đảm bảo user đang đăng nhập đã có FCM token trong DB." });
    }

    // Cố tình chờ để bắt lỗi nếu sendFcmNotification thất bại (do config sai)
    await sendFcmNotification({
      fcmToken: token,
      title: "Test FCM Push 🌸",
      body: "Nếu bạn nhận được tin này, Firebase Push đã hoạt động 100%!",
      data: { type: 'test' }
    });

    return res.status(200).json({ 
      message: "Lệnh gửi Push đã được thực thi.", 
      token_used: token 
    });
  } catch (err: any) { 
    return res.status(500).json({ 
      message: "Gửi push thất bại", 
      error: err?.message, 
      stack: err?.stack 
    });
  }
};
