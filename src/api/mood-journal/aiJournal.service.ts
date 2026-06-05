// ═══════════════════════════════════════════════════════════════════════
// AI Journal Service — sinh lời động viên nhẹ nhàng cho nhật ký cảm xúc
// ═══════════════════════════════════════════════════════════════════════
//
// Giai đoạn MVP: gọi GitHub AI (gpt-4o-mini) hoặc fallback tĩnh.
// Config qua .env: AI_BASE_URL, AI_API_KEY, AI_MODEL
// ═══════════════════════════════════════════════════════════════════════

import { MoodType } from "../../generated/prisma/index.js";

// ── Fallback replies khi AI không khả dụng ──────────────────────────
const FALLBACK_REPLIES: Record<MoodType, string> = {
  HAPPY:
    "Cây nhận được một chút ánh sáng từ niềm vui của bạn. Mong bạn giữ lại khoảnh khắc nhỏ này cho hôm nay.",
  CALM:
    "Sự bình yên hôm nay cũng là một món quà nhỏ. Cây sẽ cùng bạn giữ lại cảm giác nhẹ nhàng đó.",
  NORMAL:
    "Một ngày bình thường cũng đáng được ghi nhận. Không cần phải đặc biệt, chỉ cần bạn vẫn đang ở đây.",
  SAD:
    "Buồn cũng không sao. Cây vẫn ở đây cùng bạn, và hôm nay chỉ cần một việc nhỏ thôi cũng đủ.",
  ANXIOUS:
    "Hãy thử thở chậm lại một chút. Bạn không cần phải giải quyết mọi thứ ngay lúc này.",
  TIRED:
    "Hôm nay nghỉ một chút cũng được. Cây vẫn đang chờ bạn, không vội đâu.",
};

// ── Từ khoá nguy cơ tự hại (kiểm tra an toàn) ──────────────────────
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

const CRISIS_RESPONSE =
  "Mình rất tiếc vì bạn đang phải trải qua cảm giác nặng nề như vậy. " +
  "Bạn không cần phải ở một mình lúc này — nếu có thể, hãy liên hệ ngay " +
  "với người thân, người bạn tin tưởng hoặc dịch vụ hỗ trợ khẩn cấp tại nơi bạn sống.";

// ── Mood label (tiếng Việt) cho prompt ──────────────────────────────
const MOOD_LABEL_VI: Record<MoodType, string> = {
  HAPPY: "Vui",
  CALM: "Bình yên",
  NORMAL: "Bình thường",
  SAD: "Buồn",
  ANXIOUS: "Lo lắng",
  TIRED: "Mệt mỏi",
};

// ── System prompt ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là một trợ lý đồng hành tinh thần trong app chăm cây.
Nhiệm vụ của bạn là viết một lời động viên ngắn, dịu dàng, không phán xét, bằng tiếng Việt.
Ngữ cảnh: người dùng vừa chọn cảm xúc và viết nhật ký trong ngày.
Quy tắc bắt buộc:
- Không chẩn đoán bệnh.
- Không nói người dùng bị trầm cảm.
- Không đưa lời khuyên y tế.
- Không thay thế bác sĩ/chuyên gia tâm lý.
- Không dùng câu sáo rỗng kiểu "hãy vui lên".
- Không hứa rằng mọi chuyện chắc chắn sẽ ổn.
- Nếu mood là Buồn, Lo lắng hoặc Mệt mỏi, hãy công nhận cảm xúc và gợi ý một hành động rất nhỏ như thở chậm, uống nước, nghỉ một chút, hoặc chia sẻ với người thân.
- Nếu nội dung note có dấu hiệu rất tiêu cực hoặc nguy cơ tự làm hại, hãy khuyến khích người dùng liên hệ người thân, chuyên gia hoặc hỗ trợ khẩn cấp.
- Trả lời 1 đến 3 câu.
- Giọng văn ấm áp, dịu, phù hợp app trồng cây.
- Có thể nhắc hình ảnh cây một cách nhẹ nhàng. Nếu người dùng có đặt tên cho cây (cung cấp trong Input), hãy dùng tên đó (ví dụ: "Mầm Nhỏ", "Bé Nắng") thay vì gọi chung chung là "Cây".`;

// ── Input / Output types ────────────────────────────────────────────
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

// ── Kiểm tra an toàn ────────────────────────────────────────────────
function containsCrisisContent(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Gọi OpenAI-compatible API ───────────────────────────────────────
async function callChatCompletion(userMessage: string, systemMessage?: string): Promise<{
  text: string;
  metadata: Record<string, unknown>;
}> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  if (!baseUrl || !apiKey) {
    throw new Error("AI_BASE_URL or AI_API_KEY not configured");
  }

  const url = `${baseUrl}/chat/completions`;
  const startTime = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMessage || SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 256,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string };
    }>;
    usage?: Record<string, unknown>;
    model?: string;
  };

  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("AI returned empty response");

  return {
    text,
    metadata: {
      model: data.model ?? model,
      provider: "openai-compatible",
      latencyMs: Date.now() - startTime,
      usage: data.usage ?? null,
    },
  };
}

// ── Hàm chính ───────────────────────────────────────────────────────
export async function generateJournalReply(
  input: AiJournalInput
): Promise<AiJournalResult> {
  const { mood, note, recentMoods } = input;

  // 1. Kiểm tra nội dung nguy cơ tự hại
  if (containsCrisisContent(note)) {
    // Log cảnh báo nội bộ — KHÔNG log nội dung note
    console.warn("[AI-Journal] Crisis content detected — returning safe response");
    return { reply: CRISIS_RESPONSE, source: "crisis" };
  }

  // 2. Cố gắng gọi AI
  try {
    const moodLabel = MOOD_LABEL_VI[mood];
    let userMessage = `Mood: ${moodLabel}`;
    if (note) userMessage += `\nNote: ${note}`;
    if (input.plantName) userMessage += `\nTên cây ảo của tôi: ${input.plantName}`;
    if (recentMoods?.length) {
      const labels = recentMoods.map((m) => MOOD_LABEL_VI[m]).join(", ");
      userMessage += `\n3 mood gần nhất: ${labels}`;
    }

    const result = await callChatCompletion(userMessage);
    return {
      reply: result.text,
      source: "ai",
      metadata: result.metadata,
    };
  } catch (err) {
    // 3. Fallback khi AI lỗi
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[AI-Journal] AI unavailable, using fallback. Reason: ${errorMsg}`);
    return {
      reply: FALLBACK_REPLIES[mood],
      source: "fallback",
      metadata: { error: errorMsg },
    };
  }
}

// ── Hàm sinh câu cảm ơn khi chăm cây ────────────────────────────────
export async function generateCareThankYou(
  resourceType: string,
  plantName?: string
): Promise<string> {
  const resourceLabels: Record<string, string> = {
    WATER: "nước",
    SUNLIGHT: "ánh sáng",
    FERTILIZER: "phân bón",
    AIR: "không khí",
    LOVE: "yêu thương",
    DEW: "sương mai",
  };
  const label = resourceLabels[resourceType] || resourceType;
  const nameText = plantName ? `Tên của tôi là ${plantName}.` : "Tôi là một cái cây ảo.";
  
  const systemMessage = `Bạn là một cái cây đang được người dùng chăm sóc. ${nameText}
Nhiệm vụ: Viết 1 câu nói ngắn gọn (dưới 15 từ), dễ thương, ấm áp bằng tiếng Việt để cảm ơn người dùng vì đã cho bạn ${label}.
Không dùng icon (emoji) vì app đã hiển thị hiệu ứng rồi. Không xưng tôi-bạn chung chung mà hãy xưng là cây (hoặc tên của bạn) với người dùng.`;

  try {
    const result = await callChatCompletion(`Người dùng vừa cho tôi ${label}. Hãy nói cảm ơn.`, systemMessage);
    return result.text;
  } catch (err) {
    console.warn(`[AI-ThankYou] Failed to generate thank you:`, err);
    return `Cảm ơn bạn vì chút ${label} nhé!`;
  }
}
