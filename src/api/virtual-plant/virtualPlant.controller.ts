import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
import { generateCareThankYou } from "../mood-journal/aiJournal.service.js";
import { addPointsFromTask } from "../points/points.service.js";
import { refreshUserAchievements } from "../achievement/achievement.service.js";

// ── Tính stage từ ngày trồng (mirror logic frontend) ────────────────────────
// Dùng để tự động cập nhật plant.status vào DB mỗi khi user chăm cây.
type PlantStatusType = "SEED" | "SPROUT" | "GROWING" | "BUDDING" | "BLOOMING" | "RESTING";

const STAGE_ORDER: PlantStatusType[] = ["SEED", "SPROUT", "GROWING", "BUDDING", "BLOOMING"];
const STAGE_RATIOS: Record<PlantStatusType, number> = {
  SEED: 0.10, SPROUT: 0.20, GROWING: 0.35, BUDDING: 0.25, BLOOMING: 0.10, RESTING: 0,
};
const DEFAULT_TOTAL_DAYS = 30;

function computeStatusFromDate(
  createdAt: Date,
  stageDurations?: Record<string, number> | null,
  defaultDuration?: number | null,
): PlantStatusType {
  const total = defaultDuration ?? DEFAULT_TOTAL_DAYS;
  const durations = stageDurations ?? {
    SEED:     Math.round(total * STAGE_RATIOS.SEED),
    SPROUT:   Math.round(total * STAGE_RATIOS.SPROUT),
    GROWING:  Math.round(total * STAGE_RATIOS.GROWING),
    BUDDING:  Math.round(total * STAGE_RATIOS.BUDDING),
    BLOOMING: Math.round(total * STAGE_RATIOS.BLOOMING),
  };

  const daysAlive = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  let cumDays = 0;
  for (const stage of STAGE_ORDER) {
    cumDays += (durations[stage] as number) ?? 0;
    if (daysAlive < cumDays) return stage;
  }
  return "BLOOMING";
}


// POST /api/virtual-plants/start  — user chọn hoa, BE tìm cây thật còn trống rồi tạo cây ảo
export const start = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { flowerTypeId, nickname } = req.body;

    // Check if user has real plant access via active subscriptions or paid orders
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { isActive: true },
          include: { plan: true }
        },
        orders: {
          where: { status: "PAID", plan: { hasRealPlant: true } },
          include: { plan: true }
        }
      }
    });

    let hasRealPlantAccess = false;
    if (user) {
      const hasSub = user.subscriptions.some(sub => sub.plan.hasRealPlant && (!sub.endsAt || sub.endsAt > new Date()));
      const hasOrder = user.orders.length > 0;
      hasRealPlantAccess = hasSub || hasOrder;
    }

    let realPlantId = null;
    let transactions: any[] = [];

    if (hasRealPlantAccess) {
      // Tìm cây thật chưa bị gắn với cây ảo nào
      const availablePlant = await prisma.realPlant.findFirst({
        where: {
          flowerTypeId,
          isAssigned: false,
          status: "SEED",
        },
      });
      if (!availablePlant) {
        return res.status(409).json({ message: "Tạm thời hết cây thật loại này tại vườn, vui lòng thử lại sau." });
      }
      realPlantId = availablePlant.id;
      transactions.push(
        prisma.realPlant.update({
          where: { id: realPlantId },
          data: { isAssigned: true },
        })
      );
    }

    // Kế thừa điểm tích lũy từ cây cũ (để không bị reset điểm khi trồng cây mới)
    const lastPlant = await prisma.virtualPlant.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const carryOverPoints = lastPlant?.growthPoint ?? 0;

    // Tạo cây ảo (gắn realPlantId nếu có)
    transactions.unshift(
      prisma.virtualPlant.create({
        data: { userId, flowerTypeId, realPlantId, nickname, growthPoint: carryOverPoints },
        include: { flowerType: true, realPlant: true },
      })
    );

    const results = await prisma.$transaction(transactions);
    const virtualPlant = results[0];

    return res.status(201).json({ message: "Virtual plant started", data: virtualPlant });
  } catch (err) { next(err); }
};

// GET /api/virtual-plants/all  [ADMIN] — Lấy tất cả cây ảo
export const getAllAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plants = await prisma.virtualPlant.findMany({
      include: {
        flowerType: true,
        realPlant: {
          include: {
            updates: { orderBy: { createdAt: "desc" }, take: 1 }
          }
        },
        user: { select: { id: true, email: true, fullName: true } }
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ data: plants });
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
            updates: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── Tự động sync status vào DB nếu cây đã lên giai đoạn mới ──
    for (const plant of plants) {
      if (plant.status === "RESTING") continue; // đã thu hoạch, không tính lại
      const correctStatus = computeStatusFromDate(
        plant.createdAt,
        plant.flowerType?.stageDurations as Record<string, number> | null,
        (plant.flowerType as any)?.defaultDuration,
      );
      if (correctStatus !== plant.status) {
        await prisma.virtualPlant.update({
          where: { id: plant.id },
          data: { status: correctStatus },
        });
        (plant as any).status = correctStatus; // cập nhật object trả về
      }
    }

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
    const isAdmin = req.user!.role === 'ADMIN';
    const plant = await prisma.virtualPlant.findFirst({
      where: isAdmin ? { id: req.params.id as string } : { id: req.params.id as string, userId },
      select: { realPlantId: true },
    });
    if (!plant) return res.status(404).json({ message: "Virtual plant not found" });

    if (!plant.realPlantId) return res.status(200).json({ data: [] });

    const [updates, reactions, comments] = await Promise.all([
      prisma.plantUpdate.findMany({
        where: { realPlantId: plant.realPlantId },
        include: { farmer: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.plantReaction.findMany({
        where: { realPlantId: plant.realPlantId },
        include: { user: { select: { fullName: true } } },
      }),
      prisma.plantComment.findMany({
        where: { realPlantId: plant.realPlantId },
        include: { user: { select: { fullName: true } } },
      }),
    ]);

    // Merge everything into a unified timeline
    const merged = [
      ...updates.map((u) => ({ ...u, _type: 'UPDATE' })),
      ...reactions.map((r) => ({ ...r, _type: 'REACTION' })),
      ...comments.map((c) => ({ ...c, _type: 'COMMENT' })),
    ];
    // Sort ASCENDING so older events (Updates) appear before newer events (Reactions/Comments)
    merged.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return res.status(200).json({ data: merged });
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
        growthPoint: { increment: amount },
        resourceUsage: newResourceUsage,
        lastCaredAt: now,
      },
    });

    // ── Tự động nâng status nếu cây đã đủ ngày ──
    const plantWithFlower = await prisma.virtualPlant.findUnique({
      where: { id: plant.id },
      include: { flowerType: true },
    });
    if (plantWithFlower && plantWithFlower.status !== "RESTING") {
      const correctStatus = computeStatusFromDate(
        plantWithFlower.createdAt,
        plantWithFlower.flowerType?.stageDurations as Record<string, number> | null,
        (plantWithFlower.flowerType as any)?.defaultDuration,
      );
      if (correctStatus !== plantWithFlower.status) {
        await prisma.virtualPlant.update({
          where: { id: plant.id },
          data: { status: correctStatus },
        });
        (updatedPlant as any).status = correctStatus;
      }
    }

    // Cộng điểm tích lũy cho user khi dùng tài nguyên chăm cây
    await addPointsFromTask(userId, resourceType as string, amount);

    // Refresh achievement progress (background)
    refreshUserAchievements(userId).catch(() => {});

    return res.status(200).json({ message: "Care action applied", data: updatedPlant });
  } catch (err) { next(err); }
};

// ── POST /api/virtual-plants/:id/harvest ────────────────────────────────────
// User thu hoạch cây khi cây đang ở trạng thái BLOOMING.
// Ghi FlowerHarvest, chuyển cây sang RESTING, refresh achievement.
export const harvestPlant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const plantId = req.params.id as string;

    // Tìm cây ảo của user, include loại hoa
    const plant = await prisma.virtualPlant.findFirst({
      where: { id: plantId, userId },
      include: { flowerType: true },
    });

    if (!plant) {
      return res.status(404).json({ message: "Không tìm thấy cây." });
    }

    if (plant.status !== "BLOOMING") {
      return res.status(400).json({
        message: "Chỉ có thể thu hoạch khi cây đang nở hoa (trạng thái BLOOMING).",
      });
    }

    // Tính số ngày từ khi trồng
    const growthDays = Math.floor(
      (Date.now() - new Date(plant.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Transaction: tạo harvest record + cập nhật trạng thái cây
    const [harvest] = await prisma.$transaction([
      prisma.flowerHarvest.create({
        data: {
          userId,
          virtualPlantId: plant.id,
          flowerTypeId: plant.flowerTypeId,
          flowerName: plant.flowerType.name,
          flowerImageUrl: plant.flowerType.imageUrl ?? null,
          nickname: plant.nickname ?? null,
          growthDays,
        },
      }),
      prisma.virtualPlant.update({
        where: { id: plant.id },
        data: { status: "RESTING" },
      }),
    ]);

    // Refresh achievement (background — không block response)
    refreshUserAchievements(userId).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "🌸 Thu hoạch thành công!",
      harvest: {
        id: harvest.id,
        plantId: plant.id,
        flowerTypeId: harvest.flowerTypeId,
        flowerName: harvest.flowerName,
        flowerImageUrl: harvest.flowerImageUrl,
        harvestedAt: harvest.harvestedAt,
        nickname: harvest.nickname,
        growthDays: harvest.growthDays,
      },
    });
  } catch (err) { next(err); }
};
