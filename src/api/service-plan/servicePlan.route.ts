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
  adminGetUserCurrentPlan,
} from "./servicePlan.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ServicePlan
 *   description: Service Plan and Order management endpoints
 */

// ── PUBLIC ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Get active service plans
 *     tags: [ServicePlan]
 *     responses:
 *       200:
 *         description: List of active plans
 */
router.get("/plans", getActivePlans);

// ── USER (Auth Required) ──────────────────────────────────────────────────────

/**
 * @swagger
 * /plans/my-current:
 *   get:
 *     summary: Get my current service plan
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user plan details
 */
router.get("/plans/my-current", authenticate, getMyCurrentPlan);

/**
 * @swagger
 * /me/entitlements:
 *   get:
 *     summary: Get my feature entitlements
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Entitlements summary
 */
router.get("/me/entitlements", authenticate, getMyEntitlements);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order for a real plant
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *               shippingAddress:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 */
router.post("/orders", authenticate, createOrderHandler);

/**
 * @swagger
 * /orders/my:
 *   get:
 *     summary: Get my orders history
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user orders
 */
router.get("/orders/my", authenticate, getMyOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get("/orders/:id", authenticate, getOrderByIdHandler);

/**
 * @swagger
 * /subscriptions/virtual-plus:
 *   post:
 *     summary: Subscribe to Virtual Plus
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Subscribed successfully
 */
router.post("/subscriptions/virtual-plus", authenticate, subscribeVirtualPlus);

/**
 * @swagger
 * /orders/{id}/shipping-info:
 *   patch:
 *     summary: Update order shipping info
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipping info updated
 */
router.patch("/orders/:id/shipping-info", authenticate, updateOrderShippingInfoHandler);

// ── ADMIN ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/plans:
 *   get:
 *     summary: (Admin) Get all plans
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all plans
 */
router.get("/admin/plans", authenticate, authorize("ADMIN"), adminGetPlans);

/**
 * @swagger
 * /admin/users/{id}/current-plan:
 *   get:
 *     summary: (Admin) Get user's current plan
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's plan details
 */
router.get("/admin/users/:id/current-plan", authenticate, authorize("ADMIN"), adminGetUserCurrentPlan);

/**
 * @swagger
 * /admin/plans:
 *   post:
 *     summary: (Admin) Create a new plan
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Plan created
 */
router.post("/admin/plans", authenticate, authorize("ADMIN"), adminCreatePlan);

/**
 * @swagger
 * /admin/plans/{id}:
 *   patch:
 *     summary: (Admin) Update a plan
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Plan updated
 */
router.patch("/admin/plans/:id", authenticate, authorize("ADMIN"), adminUpdatePlan);

/**
 * @swagger
 * /admin/plans/{id}/toggle-active:
 *   patch:
 *     summary: (Admin) Toggle plan active status
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan active status toggled
 */
router.patch("/admin/plans/:id/toggle-active", authenticate, authorize("ADMIN"), adminTogglePlanActive);

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: (Admin) Get all orders
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 */
router.get("/admin/orders", authenticate, authorize("ADMIN"), adminGetOrders);

/**
 * @swagger
 * /admin/orders/{id}:
 *   get:
 *     summary: (Admin) Get order by ID
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get("/admin/orders/:id", authenticate, authorize("ADMIN"), adminGetOrderById);

/**
 * @swagger
 * /admin/orders/{id}/confirm-payment:
 *   patch:
 *     summary: (Admin) Confirm manual payment
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
 */
router.patch("/admin/orders/:id/confirm-payment", authenticate, authorize("ADMIN"), adminConfirmPaymentHandler);

/**
 * @swagger
 * /admin/orders/{id}/status:
 *   patch:
 *     summary: (Admin) Update order status
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch("/admin/orders/:id/status", authenticate, authorize("ADMIN"), adminUpdateOrderStatusHandler);

/**
 * @swagger
 * /admin/orders/{id}/shipping-status:
 *   patch:
 *     summary: (Admin) Update shipping status
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipping status updated
 */
router.patch("/admin/orders/:id/shipping-status", authenticate, authorize("ADMIN"), adminUpdateShippingStatusHandler);

/**
 * @swagger
 * /admin/real-plants/available:
 *   get:
 *     summary: (Admin) Get available real plants
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available real plants
 */
router.get("/admin/real-plants/available", authenticate, authorize("ADMIN"), adminGetAvailableRealPlants);

/**
 * @swagger
 * /admin/orders/{id}/assign-real-plant:
 *   patch:
 *     summary: (Admin) Assign real plant to order
 *     tags: [ServicePlan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               realPlantId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Plant assigned successfully
 */
router.patch("/admin/orders/:id/assign-real-plant", authenticate, authorize("ADMIN"), adminAssignRealPlantHandler);

export default router;
