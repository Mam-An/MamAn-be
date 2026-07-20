import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
let messaging: any = null;
async function getFirebaseAdmin() {
    try {
        if (!getApps().length) {
            if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
                const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
                initializeApp({
                    credential: cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey,
                    })
                });
            }
            else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
                initializeApp({ credential: cert(serviceAccount) });
            }
            else {
                try {
                    const __dirname = dirname(fileURLToPath(import.meta.url));
                    const serviceAccount = require(join(__dirname, 'firebase-service-account.json'));
                    initializeApp({ credential: cert(serviceAccount) });
                }
                catch {
                    console.warn('[FCM] Không tìm thấy Firebase Config nào hợp lệ.');
                    return null;
                }
            }
            console.log('[FCM] Firebase Admin SDK khởi tạo thành công.');
        }
        if (!messaging) {
            messaging = getMessaging();
        }
        return messaging;
    }
    catch (err) {
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
    }
    catch (err: any) {
        console.error('[FCM] Lỗi khi gửi push:', err?.message ?? err);
    }
}
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
