import prisma from "../../utils/prisma.js";
import type {
  PlanCode,
  PaymentMethod,
  GiftRecipientType,
} from "../../generated/prisma/index.js";

// ── Helper: tạo orderCode ngắn gọn theo format GON-XXXXXXXX ──────────────────
function generateOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GON-${ts}-${rand}`;
}

// ── Helper: xác định thứ tự ưu tiên gói ─────────────────────────────────────
const PLAN_PRIORITY: Record<PlanCode, number> = {
  FREE: 0,
  VIRTUAL_PLUS: 1,
  SUNFLOWER_COMPANION: 2,
  SUNFLOWER_PREMIUM_GIFT: 3,
};

// ============================================================================
// SERVICE PLAN SERVICE
// ============================================================================

/** Lấy danh sách gói active */
export async function listActivePlans() {
  return prisma.servicePlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** Lấy tất cả gói (admin) */
export async function listAllPlans() {
  return prisma.servicePlan.findMany({ orderBy: { sortOrder: "asc" } });
}

/** Lấy 1 gói theo id */
export async function getPlanById(id: string) {
  const plan = await prisma.servicePlan.findUnique({ where: { id } });
  if (!plan) throw new Error("Không tìm thấy gói dịch vụ.");
  return plan;
}

/** Tạo gói mới */
export async function createPlan(data: Parameters<typeof prisma.servicePlan.create>[0]["data"]) {
  return prisma.servicePlan.create({ data });
}

/** Cập nhật gói */
export async function updatePlan(
  id: string,
  data: Parameters<typeof prisma.servicePlan.update>[0]["data"]
) {
  return prisma.servicePlan.update({ where: { id }, data });
}

/** Bật/tắt gói */
export async function togglePlanActive(id: string) {
  const plan = await getPlanById(id);
  return prisma.servicePlan.update({
    where: { id },
    data: { isActive: !plan.isActive },
  });
}

// ============================================================================
// ENTITLEMENTS (QUYỀN TÍNH NĂNG) SERVICE
// ============================================================================

/** Lấy gói hiện tại cao nhất của user */
export async function getUserCurrentPlan(userId: string) {
  // 1. Kiểm tra subscription active (Mầm Ảo Plus)
  const activeSub = await prisma.userSubscription.findFirst({
    where: {
      userId,
      isActive: true,
      endsAt: { gt: new Date() },
    },
    include: { plan: true },
    orderBy: { startsAt: "desc" },
  });

  // 2. Kiểm tra order PAID cho gói cây thật
  const paidRealOrder = await prisma.order.findFirst({
    where: {
      userId,
      status: "PAID",
      plan: { hasRealPlant: true },
    },
    include: { plan: true },
    orderBy: { paidAt: "desc" },
  });

  // 3. Lấy gói FREE làm fallback
  const freePlan = await prisma.servicePlan.findUnique({
    where: { code: "FREE" },
  });

  // 4. Chọn gói cao nhất
  const candidates = [activeSub?.plan, paidRealOrder?.plan, freePlan].filter(
    Boolean
  ) as Awaited<ReturnType<typeof listActivePlans>>;

  const highestPlan = candidates.reduce((prev, curr) => {
    const prevPriority = PLAN_PRIORITY[prev.code as PlanCode] ?? 0;
    const currPriority = PLAN_PRIORITY[curr.code as PlanCode] ?? 0;
    return currPriority > prevPriority ? curr : prev;
  });

  return {
    plan: highestPlan,
    subscription: activeSub ?? null,
    paidRealOrder: paidRealOrder ?? null,
  };
}

/** Tính entitlement (quyền tính năng) từ gói cao nhất */
export async function getUserEntitlements(userId: string) {
  const { plan, subscription, paidRealOrder } = await getUserCurrentPlan(userId);

  // Cumulative: gói cao hơn kế thừa quyền gói thấp hơn
  const planCode = plan.code as PlanCode;
  const priority = PLAN_PRIORITY[planCode];

  return {
    planCode,
    planName: plan.name,
    subscriptionEndsAt: subscription?.endsAt ?? null,
    hasRealPlantOrder: !!paidRealOrder,

    // Nhạc
    includedSongs: plan.includedSongs,
    maxRedeemSongs: plan.maxRedeemSongs,

    // Features — cumulative theo priority
    canUseAiJournalReply: priority >= PLAN_PRIORITY.VIRTUAL_PLUS || plan.hasAiJournalReply,
    canViewMoodAnalytics: priority >= PLAN_PRIORITY.VIRTUAL_PLUS || plan.hasMoodAnalytics,
    canUseMoodTaskSuggest: priority >= PLAN_PRIORITY.VIRTUAL_PLUS || plan.hasMoodTaskSuggest,
    hasRealPlant: priority >= PLAN_PRIORITY.SUNFLOWER_COMPANION || plan.hasRealPlant,
    hasFarmerUpdates: priority >= PLAN_PRIORITY.SUNFLOWER_COMPANION || plan.hasFarmerUpdates,
    includesShipping: plan.includesShipping,
    hasPotCustom: plan.hasPotCustom,
    hasGiftCard: plan.hasGiftCard,
    hasGiftPackaging: plan.hasGiftPackaging,
  };
}

// ============================================================================
// ORDER SERVICE
// ============================================================================

/** Tạo đơn hàng ONE_TIME (cây thật) */
export async function createOrder(
  userId: string,
  input: {
    planCode: "SUNFLOWER_COMPANION" | "SUNFLOWER_PREMIUM_GIFT";
    recipientType: GiftRecipientType;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    recipientNote?: string;
    giftMessage?: string;
    giftCardTheme?: string;
    potCustomOption?: string;
    packagingOption?: string;
  }
) {
  const plan = await prisma.servicePlan.findUnique({
    where: { code: input.planCode },
  });
  if (!plan || !plan.isActive) throw new Error("Gói dịch vụ không tồn tại hoặc đã bị tắt.");
  if (plan.type !== "ONE_TIME") throw new Error("Chỉ được tạo đơn hàng cho gói ONE_TIME.");

  // Gói cây thật bao ship → shippingFee = 0
  const shippingFee = plan.includesShipping ? 0 : 30_000;
  const totalAmount = plan.price + shippingFee;

  return prisma.order.create({
    data: {
      orderCode: generateOrderCode(),
      userId,
      planId: plan.id,
      status: "PENDING",
      subtotalAmount: plan.price,
      shippingFee,
      discountAmount: 0,
      totalAmount,
      recipientType: input.recipientType,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      recipientAddress: input.recipientAddress,
      recipientNote: input.recipientNote,
      giftMessage: input.giftMessage,
      giftCardTheme: input.giftCardTheme,
      potCustomOption: input.potCustomOption,
      packagingOption: input.packagingOption,
      shippingStatus: plan.includesShipping ? "PENDING" : "NOT_REQUIRED",
    },
    include: { plan: true },
  });
}

/** Tạo order PENDING cho subscription Mầm Ảo Plus (MVP: admin xác nhận thủ công) */
export async function createVirtualPlusOrder(
  userId: string,
  paymentMethod: PaymentMethod
) {
  const plan = await prisma.servicePlan.findUnique({
    where: { code: "VIRTUAL_PLUS" },
  });
  if (!plan || !plan.isActive) throw new Error("Gói Mầm Ảo Plus chưa được cấu hình.");

  return prisma.order.create({
    data: {
      orderCode: generateOrderCode(),
      userId,
      planId: plan.id,
      status: "PENDING",
      paymentMethod,
      subtotalAmount: plan.price,
      shippingFee: 0,
      discountAmount: 0,
      totalAmount: plan.price,
      shippingStatus: "NOT_REQUIRED",
    },
    include: { plan: true },
  });
}

/** Lấy danh sách order của user */
export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: { plan: true, realPlant: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Lấy chi tiết 1 order (user chỉ xem của mình) */
export async function getOrderById(orderId: string, userId?: string) {
  const where = userId
    ? { id: orderId, userId } // user chỉ thấy của mình
    : { id: orderId };        // admin thấy tất cả
  const order = await prisma.order.findFirst({
    where,
    include: {
      plan: true,
      realPlant: { include: { flowerType: true, garden: true } },
      user: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  return order;
}

// ============================================================================
// ADMIN ORDER SERVICE
// ============================================================================

/** Lấy danh sách order (admin) với filter */
export async function adminListOrders(params: {
  status?: string;
  planCode?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}) {
  const { status, planCode, keyword, page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (planCode) where.plan = { code: planCode };
  if (keyword) {
    where.OR = [
      { orderCode: { contains: keyword, mode: "insensitive" } },
      { recipientName: { contains: keyword, mode: "insensitive" } },
      { recipientPhone: { contains: keyword, mode: "insensitive" } },
      { user: { email: { contains: keyword, mode: "insensitive" } } },
      { user: { fullName: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        plan: { select: { code: true, name: true, price: true } },
        user: { select: { id: true, fullName: true, email: true } },
        realPlant: { select: { id: true, code: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return { total, page, limit, data };
}

/** Admin xác nhận thanh toán */
export async function adminConfirmPayment(
  orderId: string,
  paymentMethod: PaymentMethod
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { plan: true },
  });
  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  if (order.status !== "PENDING") throw new Error("Chỉ xác nhận được đơn đang PENDING.");

  return prisma.$transaction(async (tx) => {
    // 1. Cập nhật order thành PAID
    const nextStatus =
      order.plan.hasRealPlant ? "FULFILLING" : "COMPLETED";

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        paymentMethod,
        paidAt: new Date(),
      },
      include: { plan: true },
    });

    // 2. Nếu là gói subscription (Mầm Ảo Plus) → tạo UserSubscription
    if (order.plan.type === "SUBSCRIPTION" && order.plan.durationDays) {
      const startsAt = new Date();
      const endsAt = new Date(
        startsAt.getTime() + order.plan.durationDays * 24 * 60 * 60 * 1000
      );

      // Vô hiệu hoá subscription cũ nếu có
      await tx.userSubscription.updateMany({
        where: { userId: order.userId, planId: order.planId, isActive: true },
        data: { isActive: false },
      });

      await tx.userSubscription.create({
        data: {
          userId: order.userId,
          planId: order.planId,
          startsAt,
          endsAt,
          isActive: true,
        },
      });
    }

    // 3. Nếu là gói cây thật → tìm cây thật chưa gán và gán vào order
    if (order.plan.hasRealPlant && !order.realPlantId) {
      const availablePlant = await tx.realPlant.findFirst({
        where: { isAssigned: false, status: "SEED" },
      });

      if (availablePlant) {
        await tx.realPlant.update({
          where: { id: availablePlant.id },
          data: { isAssigned: true },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { realPlantId: availablePlant.id },
        });
      }
    }

    return updatedOrder;
  });
}

/** Admin cập nhật trạng thái order */
export async function adminUpdateOrderStatus(
  orderId: string,
  status: "CANCELLED" | "FULFILLING" | "COMPLETED" | "REFUNDED"
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  return prisma.order.update({ where: { id: orderId }, data: { status } });
}

/** Admin cập nhật trạng thái vận chuyển */
export async function adminUpdateShippingStatus(
  orderId: string,
  shippingStatus: string
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  return prisma.order.update({
    where: { id: orderId },
    data: { shippingStatus: shippingStatus as never },
  });
}

/** Admin lấy danh sách cây thật chưa gán */
export async function getAvailableRealPlants() {
  return prisma.realPlant.findMany({
    where: { isAssigned: false },
    include: { flowerType: true, garden: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Admin gán cây thật cho order */
export async function adminAssignRealPlant(orderId: string, realPlantId: string) {
  const [order, plant] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, include: { plan: true } }),
    prisma.realPlant.findUnique({ where: { id: realPlantId } }),
  ]);

  if (!order) throw new Error("Không tìm thấy đơn hàng.");
  if (!plant) throw new Error("Không tìm thấy cây thật.");
  if (plant.isAssigned) throw new Error("Cây này đã được gán cho đơn khác.");

  return prisma.$transaction(async (tx) => {
    await tx.realPlant.update({
      where: { id: realPlantId },
      data: { isAssigned: true },
    });
    return tx.order.update({
      where: { id: orderId },
      data: { realPlantId },
      include: { plan: true, realPlant: true },
    });
  });
}
