interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: 'default' | null;
    badge?: number;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
}
interface ExpoPushTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: {
        error?: string;
    };
}
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export async function sendExpoPushNotification(messages: ExpoPushMessage | ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const payload = Array.isArray(messages) ? messages : [messages];
    const valid = payload.filter((m) => isValidExpoToken(m.to));
    if (valid.length === 0)
        return [];
    try {
        const res = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(valid),
        });
        if (!res.ok) {
            console.error('[Push] Expo API error:', res.status, await res.text());
            return [];
        }
        const json = (await res.json()) as {
            data: ExpoPushTicket[];
        };
        return json.data ?? [];
    }
    catch (err) {
        console.error('[Push] Failed to send:', err);
        return [];
    }
}
export function isValidExpoToken(token: string): boolean {
    return (token.startsWith('ExponentPushToken[') ||
        token.startsWith('ExpoPushToken['));
}
export async function notifyPlantUpdate(opts: {
    expoPushToken: string;
    plantCode: string;
    flowerName: string;
    status: string;
    note?: string;
    farmerName?: string;
}): Promise<void> {
    const statusLabel: Record<string, string> = {
        SEED: 'Hạt giống',
        SPROUT: 'Nảy mầm 🌱',
        GROWING: 'Đang lớn 🌿',
        BUDDING: 'Ra nụ 🌼',
        BLOOMING: 'Nở hoa 🌸',
        RESTING: 'Nghỉ ngơi 😴',
        NEEDS_CARE: 'Cần chăm sóc ⚠️',
        COMPLETED: 'Hoàn thành ✅',
    };
    await sendExpoPushNotification({
        to: opts.expoPushToken,
        title: `🌸 ${opts.flowerName} của bạn có cập nhật mới!`,
        body: opts.note
            ? `Trạng thái: ${statusLabel[opts.status] ?? opts.status} — "${opts.note}"`
            : `Trạng thái mới: ${statusLabel[opts.status] ?? opts.status}`,
        data: {
            type: 'plant_update',
            plantCode: opts.plantCode,
        },
        sound: 'default',
        channelId: 'garden-updates-v2',
        priority: 'high',
    });
}
