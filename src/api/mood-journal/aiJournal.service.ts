import { MoodType } from "../../generated/prisma/index.js";
const FALLBACK_REPLIES: Record<MoodType, string> = {
    HAPPY: "Cây nhận được một chút ánh sáng từ niềm vui của bạn. Mong bạn giữ lại khoảnh khắc nhỏ này cho hôm nay.",
    CALM: "Sự bình yên hôm nay cũng là một món quà nhỏ. Cây sẽ cùng bạn giữ lại cảm giác nhẹ nhàng đó.",
    NORMAL: "Một ngày bình thường cũng đáng được ghi nhận. Không cần phải đặc biệt, chỉ cần bạn vẫn đang ở đây.",
    SAD: "Buồn cũng không sao. Cây vẫn ở đây cùng bạn, và hôm nay chỉ cần một việc nhỏ thôi cũng đủ.",
    ANXIOUS: "Hãy thử thở chậm lại một chút. Bạn không cần phải giải quyết mọi thứ ngay lúc này.",
    TIRED: "Hôm nay nghỉ một chút cũng được. Cây vẫn đang chờ bạn, không vội đâu.",
};
const CRISIS_KEYWORDS = [
    "muốn chết",
    "tự tử",
    "không muốn sống",
    "biến mất",
    "tự làm đau",
    "tự hại",
    "kết thúc cuộc sống",
    "chết đi cho rồi",
    "không ai cần mình",
];
const CRISIS_RESPONSE = "Mình rất tiếc vì bạn đang phải trải qua cảm giác nặng nề như vậy. " +
    "Bạn không cần phải ở một mình lúc này — nếu có thể, hãy liên hệ ngay " +
    "với người thân, người bạn tin tưởng hoặc dịch vụ hỗ trợ khẩn cấp tại nơi bạn sống.";
export interface AiJournalInput {
    mood: MoodType;
    note?: string;
    recentMoods?: MoodType[];
    plantName?: string;
}
export interface AiJournalResult {
    reply: string;
    source: "ai" | "fallback" | "crisis";
    metadata?: Record<string, unknown>;
}
function containsCrisisContent(text?: string): boolean {
    if (!text)
        return false;
    const lower = text.toLowerCase();
    return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}
export async function generateJournalReply(input: AiJournalInput): Promise<AiJournalResult> {
    const { mood, note } = input;
    if (containsCrisisContent(note)) {
        console.warn("[AI-Journal] Crisis content detected — returning safe response");
        return { reply: CRISIS_RESPONSE, source: "crisis" };
    }
    return {
        reply: FALLBACK_REPLIES[mood],
        source: "fallback",
    };
}
