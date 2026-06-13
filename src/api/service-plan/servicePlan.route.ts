import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  // Public / User
  getActivePlans,
  getMyCurrentPlan,
  getMyEntitlements,
  createOrderHandler,
  getMyOrders,
  getOrderByIdHandler,
  subscribeVirtualPlus,
  updateOrderShippingInfoHandler,
  // Admin
  adminGetPlans,
  adminCreatePlan,
  adminUpdatePlan,
  adminTogglePlanActive,
  adminGetOrders,
  adminGetOrderById,
  adminConfirmPaymentHandler,
  adminUpdateOrderStatusHandler,
  adminUpdateShippingStatusHandler,
  adminGetAvailableRealPlants,
  adminAssignRealPlantHandler,
} from "./servicePlan.controller.js";

const router = Router();

// ── PUBLIC ────────────────────────────────────────────────────────────────────

/** GET /api/v1/plans — Danh sách gói dịch vụ đang active */
router.get("/plans", getActivePlans);

// ── USER (Auth Required) ──────────────────────────────────────────────────────

/** GET /api/v1/plans/my-current — Gói hiện tại + subscription info */
router.get("/plans/my-current", authenticate, getMyCurrentPlan);

/** GET /api/v1/me/entitlements — Tổng hợp quyền tính năng của user */
router.get("/me/entitlements", authenticate, getMyEntitlements);

/** POST /api/v1/orders — Tạo đơn hàng cây thật */
router.post("/orders", authenticate, createOrderHandler);

/** GET /api/v1/orders/my — Lịch sử đơn hàng của user */
router.get("/orders/my", authenticate, getMyOrders);

/** GET /api/v1/orders/:id — Chi tiết đơn hàng (user chỉ xem của mình, admin thấy tất cả) */
router.get("/orders/:id", authenticate, getOrderByIdHandler);

/** POST /api/v1/subscriptions/virtual-plus — Tạo đơn đăng ký Mầm Ảo Plus */
router.post("/subscriptions/virtual-plus", authenticate, subscribeVirtualPlus);

/** PATCH /api/v1/orders/:id/shipping-info — Sửa địa chỉ nhận hàng của user */
router.patch("/orders/:id/shipping-info", authenticate, updateOrderShippingInfoHandler);

// ── ADMIN ─────────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/plans — Danh sách tất cả gói (kể cả inactive) */
router.get("/admin/plans", authenticate, authorize("ADMIN"), adminGetPlans);

/** POST /api/v1/admin/plans — Tạo gói mới */
router.post("/admin/plans", authenticate, authorize("ADMIN"), adminCreatePlan);

/** PATCH /api/v1/admin/plans/:id — Cập nhật thông tin gói */
router.patch("/admin/plans/:id", authenticate, authorize("ADMIN"), adminUpdatePlan);

/** PATCH /api/v1/admin/plans/:id/toggle-active — Bật/tắt gói */
router.patch("/admin/plans/:id/toggle-active", authenticate, authorize("ADMIN"), adminTogglePlanActive);

/** GET /api/v1/admin/orders — Danh sách đơn hàng với filter */
router.get("/admin/orders", authenticate, authorize("ADMIN"), adminGetOrders);

/** GET /api/v1/admin/orders/:id — Chi tiết đơn hàng */
router.get("/admin/orders/:id", authenticate, authorize("ADMIN"), adminGetOrderById);

/** PATCH /api/v1/admin/orders/:id/confirm-payment — Xác nhận thanh toán thủ công */
router.patch("/admin/orders/:id/confirm-payment", authenticate, authorize("ADMIN"), adminConfirmPaymentHandler);

/** PATCH /api/v1/admin/orders/:id/status — Cập nhật trạng thái đơn hàng */
router.patch("/admin/orders/:id/status", authenticate, authorize("ADMIN"), adminUpdateOrderStatusHandler);

/** PATCH /api/v1/admin/orders/:id/shipping-status — Cập nhật trạng thái vận chuyển */
router.patch("/admin/orders/:id/shipping-status", authenticate, authorize("ADMIN"), adminUpdateShippingStatusHandler);

/** GET /api/v1/admin/real-plants/available — Cây thật chưa được gán */
router.get("/admin/real-plants/available", authenticate, authorize("ADMIN"), adminGetAvailableRealPlants);

/** PATCH /api/v1/admin/orders/:id/assign-real-plant — Gán cây thật thủ công */
router.patch("/admin/orders/:id/assign-real-plant", authenticate, authorize("ADMIN"), adminAssignRealPlantHandler);

export default router;
