import cron from "node-cron";
import prisma from "../../utils/prisma.js";
import { sendNotification } from "./notification.service.js";
import { ReminderType } from "../../generated/prisma/index.js";

const PLANT_MESSAGES = [
  "Cây nhỏ đang chờ bạn ghé thăm 🌱",
  "Một chút chăm sóc hôm nay sẽ giúp cây trưởng thành hơn.",
  "Mầm cây của bạn đang chờ được tiếp thêm yêu thương 🍃"
];

const JOURNAL_MESSAGES = [
  "Hôm nay bạn cảm thấy thế nào? Hãy viết vài dòng để Mầm An cùng lắng nghe 💚",
  "Mỗi cảm xúc đều đáng được ghi nhận.",
  "Dành vài phút cuối ngày để nhìn lại cảm xúc của bạn nhé."
];

const GARDEN_YEN_MESSAGES = [
  "Một khoảng bình yên đang chờ bạn 🌿",
  "Hãy dành vài phút nghỉ ngơi cùng Vườn Yên hôm nay.",
  "Cây và bạn đều cần những khoảng thời gian thư giãn."
];

function getRandomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function initNotificationScheduler() {
  console.log("[Scheduler] Khởi tạo Cron Job cho Push Notification...");

  // Chạy mỗi ngày lúc 21:00
  cron.schedule("0 21 * * *", async () => {
    console.log("[Scheduler] Bắt đầu quét thông báo nhắc nhở (21:00)...");
    
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    try {
      // Lấy tất cả user có cài đặt notification
      const users = await prisma.user.findMany({
        include: {
          notificationSetting: true,
          moodJournals: {
            where: { createdAt: { gte: todayStart } },
            take: 1
          },
          // Kiểm tra xem user có cây ảo không
          virtualPlants: {
            take: 1
          },
          // Kiểm tra xem user đã từng nghe nhạc (dùng Vườn Yên) chưa
          unlockedTracks: {
            take: 1,
            orderBy: { unlockedAt: "desc" }
          }
        }
      });

      for (const user of users) {
        const settings = user.notificationSetting;

        // 1. 🌱 Nhắc chăm cây
        if (settings?.enablePlantReminder !== false && user.virtualPlants.length > 0) {
          if (user.lastActiveAt < twentyFourHoursAgo) {
            await sendNotification(
              user.id,
              "Chăm sóc Mầm An",
              getRandomMessage(PLANT_MESSAGES),
              ReminderType.PLANT_REMINDER
            );
          }
        }

        // 2. 📝 Nhắc viết nhật ký cảm xúc
        if (settings?.enableJournalReminder !== false) {
          if (user.moodJournals.length === 0) {
            await sendNotification(
              user.id,
              "Nhật ký cảm xúc",
              getRandomMessage(JOURNAL_MESSAGES),
              ReminderType.JOURNAL_REMINDER
            );
          }
        }

        // 3. 🌿 Nhắc Vườn Yên
        if (settings?.enableGardenYenReminder !== false && user.unlockedTracks.length > 0) {
          const lastTrack = user.unlockedTracks[0];
          if (lastTrack && lastTrack.unlockedAt < threeDaysAgo && user.lastActiveAt < threeDaysAgo) {
            await sendNotification(
              user.id,
              "Vườn Yên",
              getRandomMessage(GARDEN_YEN_MESSAGES),
              ReminderType.GARDEN_YEN_REMINDER
            );
          }
        }
      }
    } catch (error) {
      console.error("[Scheduler] Lỗi khi chạy Cron Job:", error);
    }
  });
}
