import type { Request, Response } from "express";
import { listActivePlans, listAllPlans, getPlanById, createPlan, updatePlan, togglePlanActive, getUserCurrentPlan, getUserEntitlements, createOrder, createVirtualPlusOrder, getUserOrders, getOrderById, adminListOrders, adminConfirmPayment, adminUpdateOrderStatus, adminUpdateShippingStatus, getAvailableRealPlants, adminAssignRealPlant, updateOrderShippingInfo, } from "./servicePlan.service.js";
import { createOrderSchema, createVirtualPlusSubscriptionSchema, confirmPaymentSchema, updateOrderStatusSchema, updateShippingStatusSchema, assignRealPlantSchema, createPlanSchema, updatePlanSchema, } from "./servicePlan.validator.js";
import type { PaymentMethod, GiftRecipientType } from "../../generated/prisma/index.js";
export const getActivePlans = async (_req: Request, res: Response) => {
    try {
        const plans = await listActivePlans();
        return res.json({ message: "Lấy danh sách gói thành công.", metadata: plans });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const getMyCurrentPlan = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { plan, subscription } = await getUserCurrentPlan(userId);
        return res.json({
            message: "Lấy gói hiện tại thành công.",
            metadata: {
                plan,
                subscriptionEndsAt: subscription?.endsAt ?? null,
            },
        });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const getMyEntitlements = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const entitlements = await getUserEntitlements(userId);
        return res.json({ message: "Lấy quyền tính năng thành công.", metadata: entitlements });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const createOrderHandler = async (req: Request, res: Response) => {
    try {
        const parsed = createOrderSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const userId = req.user!.id;
        const { planCode, recipientType, ...rest } = parsed.data;
        const order = await createOrder(userId, {
            planCode,
            recipientType: recipientType as GiftRecipientType,
            ...rest,
        });
        return res.status(201).json({ message: "Tạo đơn hàng thành công.", metadata: order });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const getMyOrders = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const orders = await getUserOrders(userId);
        return res.json({ message: "Lấy đơn hàng thành công.", metadata: orders });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const getOrderByIdHandler = async (req: Request, res: Response) => {
    try {
        const isAdmin = req.user!.role === "ADMIN";
        const userId = isAdmin ? undefined : req.user!.id;
        const order = await getOrderById(req.params.id as string, userId);
        return res.json({ message: "Lấy chi tiết đơn hàng thành công.", metadata: order });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(404).json({ message });
    }
};
export const subscribeVirtualPlus = async (req: Request, res: Response) => {
    try {
        const parsed = createVirtualPlusSubscriptionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const userId = req.user!.id;
        const order = await createVirtualPlusOrder(userId, parsed.data.paymentMethod as PaymentMethod);
        return res.status(201).json({
            message: "Tạo đơn đăng ký Mầm Ảo Plus thành công. Vui lòng thanh toán và chờ admin xác nhận.",
            metadata: order,
        });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const updateOrderShippingInfoHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const orderId = req.params.id as string;
        const data = req.body;
        const updatedOrder = await updateOrderShippingInfo(orderId, userId, data);
        return res.json({ message: "Cập nhật thông tin giao hàng thành công.", metadata: updatedOrder });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const adminGetPlans = async (_req: Request, res: Response) => {
    try {
        const plans = await listAllPlans();
        return res.json({ message: "Lấy danh sách gói thành công.", metadata: plans });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const adminGetUserCurrentPlan = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id as string;
        const { plan, subscription } = await getUserCurrentPlan(userId);
        return res.json({
            message: "Lấy gói hiện tại của người dùng thành công.",
            metadata: {
                plan,
                subscriptionEndsAt: subscription?.endsAt ?? null,
            },
        });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const adminCreatePlan = async (req: Request, res: Response) => {
    try {
        const parsed = createPlanSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const plan = await createPlan(parsed.data as never);
        return res.status(201).json({ message: "Tạo gói dịch vụ thành công.", metadata: plan });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const adminUpdatePlan = async (req: Request, res: Response) => {
    try {
        const parsed = updatePlanSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const plan = await updatePlan(req.params.id as string, parsed.data as never);
        return res.json({ message: "Cập nhật gói thành công.", metadata: plan });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const adminTogglePlanActive = async (req: Request, res: Response) => {
    try {
        const plan = await togglePlanActive(req.params.id as string);
        return res.json({ message: `Gói đã ${plan.isActive ? "bật" : "tắt"}.`, metadata: plan });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const adminGetOrders = async (req: Request, res: Response) => {
    try {
        const { status, planCode, keyword, page, limit } = req.query;
        const result = await adminListOrders({
            status: status as string | undefined,
            planCode: planCode as string | undefined,
            keyword: keyword as string | undefined,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 20,
        });
        return res.json({ message: "Lấy danh sách đơn hàng thành công.", metadata: result });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const adminGetOrderById = async (req: Request, res: Response) => {
    try {
        const order = await getOrderById(req.params.id as string);
        return res.json({ message: "Lấy chi tiết đơn hàng thành công.", metadata: order });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(404).json({ message });
    }
};
export const adminConfirmPaymentHandler = async (req: Request, res: Response) => {
    try {
        const parsed = confirmPaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const order = await adminConfirmPayment(req.params.id as string, parsed.data.paymentMethod as PaymentMethod);
        return res.json({ message: "Xác nhận thanh toán thành công.", metadata: order });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const adminUpdateOrderStatusHandler = async (req: Request, res: Response) => {
    try {
        const parsed = updateOrderStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const order = await adminUpdateOrderStatus(req.params.id as string, parsed.data.status);
        return res.json({ message: "Cập nhật trạng thái đơn hàng thành công.", metadata: order });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const adminUpdateShippingStatusHandler = async (req: Request, res: Response) => {
    try {
        const parsed = updateShippingStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const order = await adminUpdateShippingStatus(req.params.id as string, parsed.data.shippingStatus);
        return res.json({ message: "Cập nhật trạng thái vận chuyển thành công.", metadata: order });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
export const adminGetAvailableRealPlants = async (_req: Request, res: Response) => {
    try {
        const plants = await getAvailableRealPlants();
        return res.json({ message: "Lấy danh sách cây thật chưa gán thành công.", metadata: plants });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ message });
    }
};
export const adminAssignRealPlantHandler = async (req: Request, res: Response) => {
    try {
        const parsed = assignRealPlantSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Dữ liệu không hợp lệ.", errors: parsed.error.flatten() });
        }
        const order = await adminAssignRealPlant(req.params.id as string, parsed.data.realPlantId);
        return res.json({ message: "Gán cây thật thành công.", metadata: order });
    }
    catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return res.status(400).json({ message });
    }
};
