import prisma from "../../utils/prisma.js";
import { sendFcmNotification } from "../../utils/fcmPush.js";
import { ReminderType, NotificationStatus } from "../../generated/prisma/index.js";

/**
 * Gửi Notification có lưu log và xử lý token hỏng
 */
export async function sendNotification(userId: string, title: string, body: string, type: ReminderType) {
  // 1. Kiểm tra hôm nay đã gửi loại nhắc nhở này chưa để tránh spam/duplicate
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existingLog = await prisma.notificationLog.findFirst({
    where: {
      userId,
      type,
      sentAt: { gte: todayStart },
      status: NotificationStatus.SUCCESS
    }
  });

  if (existingLog) {
    console.log(`[Notification] Đã gửi ${type} cho user ${userId} hôm nay. Bỏ qua.`);
    return false;
  }

  // 2. Lấy danh sách thiết bị của user
  const devices = await prisma.userDevice.findMany({
    where: { userId }
  });

  if (devices.length === 0) {
    console.log(`[Notification] User ${userId} không có thiết bị nào.`);
    return false;
  }

  // 3. Ghi log trạng thái PENDING
  const log = await prisma.notificationLog.create({
    data: {
      userId,
      type,
      title,
      body,
      status: NotificationStatus.PENDING
    }
  });

  let successCount = 0;
  let lastError = "";

  // 4. Lặp qua gửi cho tất cả thiết bị (multi-device)
  for (const device of devices) {
    try {
      await sendFcmNotification({
        fcmToken: device.fcmToken,
        title,
        body,
        data: { type }
      });
      successCount++;
    } catch (error: any) {
      console.error(`[Notification] Lỗi khi gửi push cho token ${device.fcmToken}:`, error);
      
      const errMsg = error?.message || String(error);
      lastError = errMsg;

      // Xử lý token hết hạn hoặc không hợp lệ -> Xóa khỏi DB
      if (
        errMsg.includes("messaging/invalid-registration-token") ||
        errMsg.includes("messaging/registration-token-not-registered") ||
        errMsg.includes("not-registered")
      ) {
        console.log(`[Notification] Xóa token không hợp lệ: ${device.fcmToken}`);
        await prisma.userDevice.delete({ where: { id: device.id } }).catch(() => {});
      }
    }
  }

  // 5. Cập nhật trạng thái Log
  if (successCount > 0) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: NotificationStatus.SUCCESS }
    });
    return true;
  } else {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: NotificationStatus.FAILED, error: lastError }
    });
    return false;
  }
}
