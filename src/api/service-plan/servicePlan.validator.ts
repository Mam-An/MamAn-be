import { z } from "zod";

// ── Tạo đơn hàng ONE_TIME (cây thật) ────────────────────────────────────────
export const createOrderSchema = z.object({
  planCode: z.enum(["SUNFLOWER_COMPANION", "SUNFLOWER_PREMIUM_GIFT"]),
  recipientType: z.enum(["SELF", "FRIEND", "DONATION"]).default("SELF"),
  recipientName: z.string().max(200).optional(),
  recipientPhone: z.string().max(20).optional(),
  recipientAddress: z.string().max(1000).optional(),
  recipientNote: z.string().max(500).optional(),
  // Gift fields (optional cho COMPANION, available cho PREMIUM_GIFT)
  giftMessage: z.string().max(1000).optional(),
  giftCardTheme: z.string().max(100).optional(),
  potCustomOption: z.string().max(255).optional(),
  packagingOption: z.string().max(255).optional(),
});

// ── Tạo subscription Mầm Ảo Plus ───────────────────────────────────────────
export const createVirtualPlusSubscriptionSchema = z.object({
  paymentMethod: z
    .enum(["MANUAL_BANK_TRANSFER", "CASH", "MOMO", "ZALOPAY", "OTHER"])
    .default("MANUAL_BANK_TRANSFER"),
});

// ── Admin: xác nhận thanh toán ──────────────────────────────────────────────
export const confirmPaymentSchema = z.object({
  paymentMethod: z
    .enum(["MANUAL_BANK_TRANSFER", "CASH", "MOMO", "ZALOPAY", "OTHER"])
    .default("MANUAL_BANK_TRANSFER"),
});

// ── Admin: cập nhật status order ────────────────────────────────────────────
export const updateOrderStatusSchema = z.object({
  status: z.enum(["CANCELLED", "FULFILLING", "COMPLETED", "REFUNDED"]),
});

// ── Admin: cập nhật shipping status ─────────────────────────────────────────
export const updateShippingStatusSchema = z.object({
  shippingStatus: z.enum([
    "NOT_REQUIRED",
    "PENDING",
    "PREPARING",
    "SHIPPING",
    "DELIVERED",
    "FAILED",
  ]),
});

// ── Admin: gán cây thật cho order ───────────────────────────────────────────
export const assignRealPlantSchema = z.object({
  realPlantId: z.string().uuid(),
});

// ── Admin: tạo/cập nhật ServicePlan ─────────────────────────────────────────
export const createPlanSchema = z.object({
  code: z.enum(["FREE", "VIRTUAL_PLUS", "SUNFLOWER_COMPANION", "SUNFLOWER_PREMIUM_GIFT"]),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(["FREE", "SUBSCRIPTION", "ONE_TIME"]),
  plantMode: z.enum(["VIRTUAL", "REAL"]),
  price: z.number().int().min(0),
  durationDays: z.number().int().positive().optional(),
  includedSongs: z.number().int().min(0).default(0),
  maxRedeemSongs: z.number().int().min(0).default(0),
  hasAiJournalReply: z.boolean().default(false),
  hasMoodAnalytics: z.boolean().default(false),
  hasMoodTaskSuggest: z.boolean().default(false),
  hasRealPlant: z.boolean().default(false),
  hasFarmerUpdates: z.boolean().default(false),
  updateIntervalDays: z.number().int().positive().optional(),
  includesShipping: z.boolean().default(false),
  hasPotCustom: z.boolean().default(false),
  hasGiftCard: z.boolean().default(false),
  hasGiftPackaging: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updatePlanSchema = createPlanSchema.partial().omit({ code: true });
