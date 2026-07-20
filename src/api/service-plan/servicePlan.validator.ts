import { z } from "zod";
export const createOrderSchema = z.object({
    planCode: z.enum(["SUNFLOWER_COMPANION", "SUNFLOWER_PREMIUM_GIFT"]),
    recipientType: z.enum(["SELF", "FRIEND", "DONATION"]).default("SELF"),
    recipientName: z.string().max(200).optional(),
    recipientPhone: z.string().max(20).optional(),
    recipientAddress: z.string().max(1000).optional(),
    recipientNote: z.string().max(500).optional(),
    giftMessage: z.string().max(1000).optional(),
    giftCardTheme: z.string().max(100).optional(),
    potCustomOption: z.string().max(255).optional(),
    packagingOption: z.string().max(255).optional(),
});
export const createVirtualPlusSubscriptionSchema = z.object({
    paymentMethod: z
        .enum(["MANUAL_BANK_TRANSFER", "CASH", "MOMO", "ZALOPAY", "OTHER"])
        .default("MANUAL_BANK_TRANSFER"),
});
export const confirmPaymentSchema = z.object({
    paymentMethod: z
        .enum(["MANUAL_BANK_TRANSFER", "CASH", "MOMO", "ZALOPAY", "OTHER"])
        .default("MANUAL_BANK_TRANSFER"),
});
export const updateOrderStatusSchema = z.object({
    status: z.enum(["CANCELLED", "FULFILLING", "COMPLETED", "REFUNDED"]),
});
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
export const assignRealPlantSchema = z.object({
    realPlantId: z.string().uuid(),
});
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
