import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
import { generateCareThankYou } from "../mood-journal/aiJournal.service.js";
import { addPointsFromTask } from "../points/points.service.js";
import { refreshUserAchievements } from "../achievement/achievement.service.js";

// POST /api/virtual-plants/start  — user chọn hoa, BE tìm cây thật còn trống rồi tạo cây ảo
export const start = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { flowerTypeId, nickname } = req.body;

    // Tìm cây thật chưa bị gắn với cây ảo nào
    const availablePlant = await prisma.realPlant.findFirst({
      where: {
        flowerTypeId,
        isAssigned: false,
        status: "SEED",
      },
    });
    if (!availablePlant) {
      return res.status(409).json({ message: "No available real plant for this flower type" });
    }

    const [virtualPlant] = await prisma.$transaction([
      prisma.virtualPlant.create({
        data: { userId, flowerTypeId, realPlantId: availablePlant.id, nickname },
        include: { flowerType: true, realPlant: true },
      }),
      prisma.realPlant.update({
        where: { id: availablePlant.id },
        data: { isAssigned: true },
      }),
    ]);

    return res.status(201).json({ message: "Virtual plant started", data: virtualPlant });
  } catch (err) { next(err); }
};

// GET /api/virtual-plants/my  — lấy cây ảo của user đang đăng nhập
export const getMy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const plants = await prisma.virtualPlant.findMany({
      where: { userId },
      include: {
        flowerType: true,
        realPlant: {
          include: {
            updates: { orderBy: { createdAt: "desc" }, take: 1 }, // ảnh mới nhất
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ data: plants });
  } catch (err) { next(err); }
};

// GET /api/virtual-plants/:id  — chi tiết cây ảo
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const plant = await prisma.virtualPlant.findFirst({
      where: { id: req.params.id as string, userId },
      include: {
        flowerType: true,
        realPlant: {
          include: { garden: true },
        },
      },
    });
    if (!plant) return res.status(404).json({ message: "Virtual plant not found" });
    return res.status(200).json({ data: plant });
  } catch (err) { next(err); }
};

// GET /api/virtual-plants/:id/timeline  — lịch sử cập nhật của cây thật gắn với cây ảo này
export const getTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const plant = await prisma.virtualPlant.findFirst({
      where: { id: req.params.id as string, userId },
      select: { realPlantId: true },
    });
    if (!plant) return res.status(404).json({ message: "Virtual plant not found" });

    const updates = await prisma.plantUpdate.findMany({
      where: { realPlantId: plant.realPlantId },
      include: { farmer: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ data: updates });
  } catch (err) { next(err); }
};

// PATCH /api/virtual-plants/:id  — user đổi nickname
export const updateNickname = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { nickname } = req.body;
    
    // updateMany returns count, but we want to return the updated object if possible, 
    // or just return success message
    const updated = await prisma.virtualPlant.updateMany({
      where: { id: req.params.id as string, userId },
      data: { nickname },
    });
    
    if (updated.count === 0) return res.status(404).json({ message: "Virtual plant not found" });
    
    return res.status(200).json({ message: "Nickname updated successfully", nickname });
  } catch (err) { next(err); }
};

// POST /api/virtual-plants/:id/care  — user dùng tài nguyên để chăm cây
export const carePlant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { resourceType, amount = 5 } = req.body;
    
    // Check if the plant belongs to the user
    const plant = await prisma.virtualPlant.findFirst({
      where: { id: req.params.id as string, userId },
    });
    if (!plant) return res.status(404).json({ message: "Virtual plant not found" });

    // Validate resource mapping
    const resourceFieldMap: Record<string, keyof typeof plant> = {
      WATER:      "waterAmount",
      SUNLIGHT:   "sunlightAmount",
      FERTILIZER: "fertilizerAmount",
      AIR:        "airAmount",
      LOVE:       "loveAmount",
      DEW:        "dewAmount",
    };
    
    const fieldName = resourceFieldMap[resourceType as string];
    if (!fieldName) return res.status(400).json({ message: "Invalid resource type" });
    
    const resourceLabels: Record<string, string> = {
      WATER: "nước",
      SUNLIGHT: "nắng",
      FERTILIZER: "phân bón",
      AIR: "không khí",
      LOVE: "yêu thương",
      DEW: "sương mai",
    };
    
    const currentVal = plant[fieldName] as number;
    if (currentVal < amount) {
      const label = resourceLabels[resourceType as string] || resourceType;
      return res.status(400).json({ message: `Bạn không có đủ ${label} để chăm cây lúc này.` });
    }

    // Validate resource limits (2 times per day, 4 hours cooldown)
    const now = new Date();
    // Helper to format local date without timezone offset issues, just strictly using YYYY-MM-DD from ISO (UTC day) is usually fine for MVP,
    // but better to use local logic or just UTC day boundary. We'll use UTC day boundary.
    const todayStr = now.toISOString().split("T")[0] ?? '';
    const fourHoursMs = 4 * 60 * 60 * 1000;

    const resourceUsage = (plant.resourceUsage as Record<string, string[]>) || {};
    const usageForResource = resourceUsage[resourceType as string] || [];
    
    // Lọc ra các lần sử dụng trong ngày hôm nay
    const todayUsages = usageForResource.filter(isoStr => isoStr.startsWith(todayStr));
    
    if (todayUsages.length >= 2) {
      return res.status(400).json({ message: "Bạn đã cho cây loại tài nguyên này đủ rồi, ngày mai hãy tiếp tục nhé." });
    }

    if (todayUsages.length > 0) {
      const lastUsageStr = todayUsages[todayUsages.length - 1];
      if (lastUsageStr) {
        const lastUsageDate = new Date(lastUsageStr);
        if (now.getTime() - lastUsageDate.getTime() < fourHoursMs) {
          return res.status(400).json({ message: "Cây đang tiêu hóa tài nguyên này, hãy quay lại sau vài giờ nhé." });
        }
      }
    }

    // Thêm lần sử dụng mới
    todayUsages.push(now.toISOString());
    const newResourceUsage = {
      ...resourceUsage,
      [resourceType as string]: todayUsages
    };

    // Decrement the resource & update usage
    const updatedPlant = await prisma.virtualPlant.update({
      where: { id: plant.id },
      data: {
        [fieldName]: { decrement: amount },
        resourceUsage: newResourceUsage,
        lastCaredAt: now,
      },
    });

    // Cộng điểm tích lũy cho user khi dùng tài nguyên chăm cây
    await addPointsFromTask(userId, resourceType as string, amount);

    // Refresh achievement progress (background)
    refreshUserAchievements(userId).catch(() => {});

    // Lấy lời cảm ơn từ AI (có thể tốn vài giây)
    const aiMessage = await generateCareThankYou(resourceType as string, plant.nickname || undefined);

    return res.status(200).json({ message: "Care action applied", data: updatedPlant, aiMessage });
  } catch (err) { next(err); }
};
