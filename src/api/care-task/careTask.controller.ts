import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
import { deleteCloudinaryImage } from "../../middlewares/upload.middleware.js";
import { addPointsFromTask } from "../points/points.service.js";
import { refreshUserAchievements } from "../achievement/achievement.service.js";

// ── Seeded PRNG (mulberry32) — deterministic random từ seed số nguyên ─────────
function seededRandom(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Seed theo ngày (YYYYMMDD) — đổi mới mỗi 24h ────────────────────────────
function todaySeed(): number {
  const d = new Date();
  return parseInt(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
}

// ── Lấy public_id từ file Cloudinary ────────────────────────────────────────
function getPublicId(file: any): string | undefined {
  // multer-storage-cloudinary lưu public_id trong file.filename hoặc file.public_id
  return file?.filename ?? file?.public_id ?? undefined;
}

// GET /api/care-tasks — trả 10 task/ngày, đảm bảo đủ 6 loại tài nguyên
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allTasks = await prisma.careTask.findMany({
      where: { isActive: true },
    });

    const RESOURCE_TYPES = ["WATER", "SUNLIGHT", "FERTILIZER", "AIR", "LOVE", "DEW"];
    const DAILY_LIMIT = 10;

    // Nhóm task theo loại tài nguyên
    const byResource = new Map<string, typeof allTasks>();
    for (const rt of RESOURCE_TYPES) byResource.set(rt, []);
    for (const t of allTasks) byResource.get(t.rewardResource)?.push(t);

    const rand = seededRandom(todaySeed());

    // Shuffle helper dùng seeded random
    const shuffle = <T>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        const temp = a[i];
        a[i] = a[j] as T;
        a[j] = temp as T;
      }
      return a;
    };

    // Bước 1: lấy 1 task ngẫu nhiên từ mỗi loại tài nguyên (tối đa 6)
    const selected: typeof allTasks = [];
    const usedIds = new Set<string>();
    for (const rt of RESOURCE_TYPES) {
      const group = shuffle(byResource.get(rt) ?? []);
      if (group.length > 0) {
        const first = group[0]!;
        selected.push(first);
        usedIds.add(first.id);
      }
    }

    // Bước 2: điền thêm từ pool còn lại cho đủ DAILY_LIMIT
    const remaining = shuffle(allTasks.filter((t) => !usedIds.has(t.id)));
    for (const t of remaining) {
      if (selected.length >= DAILY_LIMIT) break;
      selected.push(t);
    }

    // Shuffle lại lần cuối để thứ tự hiển thị không cố định
    return res.status(200).json({ data: shuffle(selected) });
  } catch (err) { next(err); }
};

// POST /api/care-tasks  [ADMIN] — multipart/form-data, ảnh image là tùy chọn
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file as any;

    const {
      title, description, type, isDefault,
      rewardResource, rewardAmount, growthReward,
      verifyType, durationSeconds, isShareable,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const task = await prisma.careTask.create({
      data: {
        title,
        description: description ?? undefined,
        type: (type ?? "WATER_PLANT") as any,
        isDefault: isDefault !== undefined ? (isDefault === "true" || isDefault === true) : true,
        isShareable: isShareable !== undefined ? (isShareable === "true" || isShareable === true) : false,
        rewardResource: (rewardResource ?? "WATER") as any,
        rewardAmount: rewardAmount ? parseInt(String(rewardAmount)) : 10,
        growthReward: growthReward ? parseInt(String(growthReward)) : 5,
        verifyType: (verifyType ?? "SELF_CONFIRM") as any,
        durationSeconds: durationSeconds ? parseInt(String(durationSeconds)) : undefined,
        characterImageUrl: file?.path ?? undefined,
      },
    });
    return res.status(201).json({ message: "CareTask created", data: task });
  } catch (err) { next(err); }
};

// PATCH /api/care-tasks/:id  [ADMIN]
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const task = await prisma.careTask.update({
      where: { id: id as string },
      data: req.body,
    });
    return res.status(200).json({ message: "CareTask updated", data: task });
  } catch (err) { next(err); }
};

// POST /api/care-tasks/:id/character-image  [ADMIN]
export const uploadCharacterImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const file = req.file as any;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const task = await prisma.careTask.update({
      where: { id: id as string },
      data: { characterImageUrl: file.path },
    });
    return res.status(200).json({
      message: "Character image uploaded successfully",
      data: { id: task.id, characterImageUrl: task.characterImageUrl },
    });
  } catch (err) { next(err); }
};

// DELETE /api/care-tasks/:id/character-image  [ADMIN]
export const deleteCharacterImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const task = await prisma.careTask.update({
      where: { id: id as string },
      data: { characterImageUrl: null },
    });
    return res.status(200).json({ message: "Character image removed", data: { id: task.id } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/care-task-logs — user hoàn thành task (có thể kèm ảnh)
// Content-Type: multipart/form-data
// ─────────────────────────────────────────────────────────────────────────────
export const completeTask = async (req: Request, res: Response, next: NextFunction) => {
  const file = req.file as any;
  let uploadedPublicId: string | undefined;

  try {
    const userId = req.user!.id;
    const {
      careTaskId,
      virtualPlantId,
      note,
      shareToCommunity: shareRaw,
      visibility: visibilityRaw,
    } = req.body;

    const shareToCommunity = shareRaw === true || shareRaw === "true";
    const visibility = visibilityRaw === "PUBLIC" ? "PUBLIC" : "ANONYMOUS";

    // ── 1. Tìm task ──────────────────────────────────────────────────────────
    const careTask = await prisma.careTask.findUnique({ where: { id: careTaskId } });
    if (!careTask || !careTask.isActive) {
      // Nếu ảnh đã upload lên Cloudinary nhưng task không tồn tại, xóa ảnh
      if (file) uploadedPublicId = getPublicId(file);
      if (uploadedPublicId) await deleteCloudinaryImage(uploadedPublicId);
      return res.status(404).json({ message: "Không tìm thấy nhiệm vụ hoặc nhiệm vụ đã bị vô hiệu hóa." });
    }

    // ── 2. Kiểm tra verifyType ───────────────────────────────────────────────
    if (careTask.verifyType === "PHOTO_REQUIRED" && !file) {
      return res.status(400).json({ message: "Task này cần ảnh để hoàn thành." });
    }

    // ── 3. Kiểm tra đã hoàn thành hôm nay chưa ──────────────────────────────
    const taskDate = new Date();
    taskDate.setHours(0, 0, 0, 0);

    const existing = await prisma.careTaskLog.findUnique({
      where: { userId_careTaskId_taskDate: { userId, careTaskId, taskDate } },
    });
    if (existing) {
      if (file) {
        uploadedPublicId = getPublicId(file);
        if (uploadedPublicId) await deleteCloudinaryImage(uploadedPublicId);
      }
      return res.status(409).json({ message: "Bạn đã hoàn thành nhiệm vụ này hôm nay rồi." });
    }

    // ── 4. Lấy photo info nếu có ảnh ────────────────────────────────────────
    let photoUrl: string | undefined;
    let cloudinaryPublicId: string | undefined;
    if (file) {
      photoUrl = file.path;            // secure_url từ Cloudinary
      cloudinaryPublicId = getPublicId(file);
      uploadedPublicId = cloudinaryPublicId;
    }

    // ── 5. Tạo CareTaskLog ───────────────────────────────────────────────────
    const log = await prisma.careTaskLog.create({
      data: {
        userId,
        careTaskId,
        virtualPlantId: virtualPlantId ?? undefined,
        taskDate,
        completedAt: new Date(),
        note: note ?? undefined,
        photoUrl,
        cloudinaryPublicId,
        sharedToCommunity: false, // Cập nhật sau nếu share thành công
      },
      include: { careTask: true },
    });

    // ── 6. Cộng tài nguyên + growthPoint cho cây ảo ──────────────────────────
    let updatedPlant = null;
    if (virtualPlantId) {
      const resourceField: Record<string, object> = {
        WATER:      { waterAmount:      { increment: careTask.rewardAmount } },
        SUNLIGHT:   { sunlightAmount:   { increment: careTask.rewardAmount } },
        FERTILIZER: { fertilizerAmount: { increment: careTask.rewardAmount } },
        AIR:        { airAmount:        { increment: careTask.rewardAmount } },
        LOVE:       { loveAmount:       { increment: careTask.rewardAmount } },
        DEW:        { dewAmount:        { increment: careTask.rewardAmount } },
      };

      const resourceUpdate = resourceField[careTask.rewardResource] ?? {};

      // Streak: kiểm tra hôm qua
      const yesterday = new Date(taskDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayLog = await prisma.careTaskLog.findFirst({
        where: { userId, taskDate: yesterday, virtualPlantId },
      });

      updatedPlant = await prisma.virtualPlant.update({
        where: { id: virtualPlantId },
        data: {
          ...resourceUpdate,
          growthPoint: { increment: careTask.growthReward },
          lastCaredAt: new Date(),
          streakCount: yesterdayLog ? { increment: 1 } : 1,
        },
      });

      // Cộng điểm tích lũy — chỉ khi task gắn với cây ảo (user đã dùng tài nguyên)
      await addPointsFromTask(userId, careTask.rewardResource, careTask.rewardAmount);
    }

    // ── 7. Tạo CommunityPost nếu user muốn chia sẻ ───────────────────────────
    // Yêu cầu có ảnh mới được share (bảo vệ nội dung cộng đồng)
    let communityPost = null;
    let shareBonus: { resourceType: string; bonusAmount: number } | null = null;

    if (shareToCommunity && photoUrl) {
      communityPost = await prisma.communityPost.create({
        data: {
          userId,
          taskLogId: log.id,
          content:  note ?? null,
          imageUrl: photoUrl,
          visibility: visibility as any,
        },
      });

      // Cập nhật flag sharedToCommunity trong log
      await prisma.careTaskLog.update({
        where: { id: log.id },
        data:  { sharedToCommunity: true },
      });

      // ── Thưởng +5 tài nguyên khi share thành công ──
      const SHARE_BONUS = 5;
      if (virtualPlantId) {
        const bonusResourceField: Record<string, object> = {
          WATER:      { waterAmount:      { increment: SHARE_BONUS } },
          SUNLIGHT:   { sunlightAmount:   { increment: SHARE_BONUS } },
          FERTILIZER: { fertilizerAmount: { increment: SHARE_BONUS } },
          AIR:        { airAmount:        { increment: SHARE_BONUS } },
          LOVE:       { loveAmount:       { increment: SHARE_BONUS } },
          DEW:        { dewAmount:        { increment: SHARE_BONUS } },
        };
        const bonusUpdate = bonusResourceField[careTask.rewardResource] ?? {};
        updatedPlant = await prisma.virtualPlant.update({
          where: { id: virtualPlantId },
          data: bonusUpdate,
        });
      }
      shareBonus = { resourceType: careTask.rewardResource, bonusAmount: SHARE_BONUS };
    } else if (shareToCommunity && !photoUrl) {
      console.log(`[Community] Share requested but no photo — skipping (photo required).`);
    }

    // ── 8. Refresh achievement progress (background, không block response) ────
    refreshUserAchievements(userId)
      .then(({ newlyUnlocked }) => {
        if (newlyUnlocked.length > 0) {
          console.log(`[Achievement] User ${userId} unlocked: ${newlyUnlocked.join(", ")}`);
        }
      })
      .catch((err) => console.error("[Achievement] refresh failed:", err));

    return res.status(201).json({
      message: "Task completed successfully",
      metadata: {
        taskLog: { ...log, sharedToCommunity: !!communityPost },
        updatedPlant,
        communityPost,
        shareBonus,
      },
    });
  } catch (err: any) {
    // Nếu DB lỗi nhưng ảnh đã upload → dọn rác Cloudinary
    if (uploadedPublicId) {
      await deleteCloudinaryImage(uploadedPublicId);
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/care-task-logs/my — lịch sử task của user (có phân trang + lọc ngày)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { page = "1", limit = "20", fromDate, toDate } = req.query as Record<string, string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100);

    const where: any = { userId };

    // Nếu không truyền fromDate/toDate thì mặc định lấy task hôm nay
    if (fromDate || toDate) {
      where.completedAt = {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate   ? { lte: new Date(toDate)   } : {}),
      };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.taskDate = today;
    }

    const [logs, total] = await Promise.all([
      prisma.careTaskLog.findMany({
        where,
        include: {
          careTask:     true,
          virtualPlant: { select: { id: true, nickname: true } },
        },
        orderBy: { completedAt: "desc" },
        skip,
        take,
      }),
      prisma.careTaskLog.count({ where }),
    ]);

    return res.status(200).json({
      data: logs,
      pagination: { page: parseInt(page), limit: take, total },
    });
  } catch (err) { next(err); }
};
