/**
 * FCM Push Notification Service
 * Gửi push notification trực tiếp qua Firebase Cloud Messaging (FCM).
 * Yêu cầu: file service account key đặt ở `src/utils/firebase-service-account.json`
 * Download từ: Firebase Console → Project Settings → Service Accounts → Generate new private key
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let admin: any = null;
let messaging: any = null;

async function getFirebaseAdmin() {
  if (admin) return admin;
  try {
    const firebaseAdmin = await import('firebase-admin');
    admin = firebaseAdmin.default ?? firebaseAdmin;

    if (!admin.apps.length) {
      // Lấy service account từ biến môi trường hoặc file JSON
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      let credential;

      if (serviceAccountJson) {
        // Dùng biến môi trường (khuyến nghị cho production)
        const serviceAccount = JSON.parse(serviceAccountJson);
        credential = admin.credential.cert(serviceAccount);
      } else {
        // Fallback: dùng file JSON local (chỉ dùng cho dev)
        try {
          const serviceAccount = require('./firebase-service-account.json');
          credential = admin.credential.cert(serviceAccount);
        } catch {
          console.warn('[FCM] firebase-service-account.json không tìm thấy và FIREBASE_SERVICE_ACCOUNT_JSON chưa được set.');
          return null;
        }
      }

      admin.initializeApp({ credential });
      console.log('[FCM] Firebase Admin SDK khởi tạo thành công.');
    }
    messaging = admin.messaging();
    return admin;
  } catch (err) {
    console.error('[FCM] Không thể khởi tạo Firebase Admin:', err);
    return null;
  }
}

const STATUS_LABEL: Record<string, string> = {
  SEED: 'Hạt giống',
  SPROUT: 'Nảy mầm 🌱',
  GROWING: 'Đang lớn 🌿',
  BUDDING: 'Ra nụ 🌼',
  BLOOMING: 'Nở hoa 🌸',
  RESTING: 'Nghỉ ngơi 😴',
  NEEDS_CARE: 'Cần chăm sóc ⚠️',
  COMPLETED: 'Hoàn thành ✅',
};

/**
 * Gửi push notification qua FCM tới một thiết bị Android.
 * @param fcmToken - FCM registration token của thiết bị
 */
export async function sendFcmNotification(opts: {
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  await getFirebaseAdmin();
  if (!messaging) {
    console.warn('[FCM] Messaging chưa được khởi tạo, bỏ qua push.');
    return;
  }

  try {
    const message = {
      token: opts.fcmToken,
      notification: {
        title: opts.title,
        body: opts.body,
      },
      data: opts.data ?? {},
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'garden-updates-v2',
          sound: 'default',
        },
      },
    };

    const response = await messaging.send(message);
    console.log('[FCM] Push gửi thành công, message ID:', response);
  } catch (err: any) {
    // Không throw — push không phải critical path
    console.error('[FCM] Lỗi khi gửi push:', err?.message ?? err);
  }
}

/**
 * Helper: Gửi thông báo "Cây của bạn được cập nhật" đến user
 */
export async function notifyPlantUpdateFcm(opts: {
  fcmToken: string;
  plantCode: string;
  flowerName: string;
  status: string;
  note?: string;
  farmerName?: string;
}): Promise<void> {
  const statusText = STATUS_LABEL[opts.status] ?? opts.status;
  const title = `🌸 ${opts.flowerName} của bạn có cập nhật mới!`;
  const body = opts.note
    ? `Trạng thái: ${statusText} — "${opts.note}"`
    : `Trạng thái mới: ${statusText}`;

  await sendFcmNotification({
    fcmToken: opts.fcmToken,
    title,
    body,
    data: {
      type: 'plant_update',
      plantCode: opts.plantCode,
    },
  });
}
