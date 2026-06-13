import prisma from "../../utils/prisma.js";

// ── Mapping progressKey → cách tính giá trị thực từ DB ────────────────────────
// Mỗi progressKey có 1 hàm tính giá trị thực của user từ các bảng khác nhau
type ProgressKeyFn = (userId: string) => Promise<number>;

const PROGRESS_CALCULATORS: Record<string, ProgressKeyFn> = {
  /** Tổng số lần tưới/chăm cây (CareTaskLog có virtualPlantId) */
  carePlantCount: async (userId) => {
    return prisma.careTaskLog.count({
      where: { userId, virtualPlantId: { not: null } },
    });
  },

  /** Tổng số lần bón tài nguyên cho cây ảo (virtualPlant.carePlant endpoint) */
  resourceFeedCount: async (userId) => {
    return prisma.careTaskLog.count({ where: { userId, virtualPlantId: { not: null } } });
  },

  /** Số phiên Vườn Yên đã hoàn thành — FocusSession nếu có, hiện dùng proxy */
  zenSessionCount: async (userId) => {
    // Dùng growthPoint tổng từ cây ảo làm proxy cho zen sessions (1 session = 1 growthPoint)
    const plant = await prisma.virtualPlant.findFirst({
      where: { userId },
      select: { growthPoint: true },
    });
    return plant?.growthPoint ?? 0;
  },

  /** Tổng phút Vườn Yên — hiện dùng growthPoint × 25 phút mỗi session */
  zenTotalMinutes: async (userId) => {
    const plant = await prisma.virtualPlant.findFirst({
      where: { userId },
      select: { growthPoint: true },
    });
    return (plant?.growthPoint ?? 0) * 25;
  },

  /** Tổng số nhật ký đã viết */
  journalCount: async (userId) => {
    return prisma.moodJournal.count({ where: { userId } });
  },

  /** Số ngày duy nhất có nhật ký */
  journalDays: async (userId) => {
    const journals = await prisma.moodJournal.findMany({
      where: { userId },
      select: { createdAt: true },
    });
    const uniqueDays = new Set(
      journals.map((j) => j.createdAt.toISOString().split("T")[0]),
    );
    return uniqueDays.size;
  },

  /** Số ngày streak liên tiếp của cây ảo */
  streakDays: async (userId) => {
    const plant = await prisma.virtualPlant.findFirst({
      where: { userId },
      select: { streakCount: true },
    });
    return plant?.streakCount ?? 0;
  },
};

// ── Lấy tất cả achievement definitions ────────────────────────────────────────
export async function getAllDefinitions() {
  return prisma.achievementDefinition.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

// ── Lấy danh sách achievement của 1 user ──────────────────────────────────────
// Merge definitions + userAchievement records
export async function getUserAchievements(userId: string) {
  const [definitions, userRecords] = await Promise.all([
    getAllDefinitions(),
    prisma.userAchievement.findMany({
      where: { userId },
      select: {
        achievementId: true,
        progress: true,
        unlocked: true,
        unlockedAt: true,
      },
    }),
  ]);

  const recordMap = new Map(userRecords.map((r) => [r.achievementId, r]));

  return definitions.map((def) => {
    const record = recordMap.get(def.id);
    return {
      id: def.id,
      slug: def.slug,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      category: def.category,
      requirement: def.requirement,
      progressKey: def.progressKey,
      targetProgress: def.targetProgress,
      currentProgress: record?.progress ?? 0,
      unlocked: record?.unlocked ?? false,
      unlockedAt: record?.unlockedAt ?? null,
    };
  });
}

// ── Cập nhật tiến trình cho TẤT CẢ achievements của 1 user ──────────────────
// Được gọi sau mỗi hành động quan trọng (hoàn thành task, viết journal, v.v.)
export async function refreshUserAchievements(userId: string): Promise<{
  newlyUnlocked: string[];  // danh sách slug vừa được unlock
}> {
  const definitions = await getAllDefinitions();

  // Tính tất cả progress keys cần cho user này
  const neededKeys = [...new Set(definitions.map((d) => d.progressKey))];

  // Tính song song
  const progressValues = await Promise.all(
    neededKeys.map(async (key) => {
      const fn = PROGRESS_CALCULATORS[key];
      const value = fn ? await fn(userId) : 0;
      return [key, value] as [string, number];
    }),
  );
  const progressMap = Object.fromEntries(progressValues);

  const newlyUnlocked: string[] = [];

  // Upsert từng achievement
  for (const def of definitions) {
    const currentProgress = progressMap[def.progressKey] ?? 0;
    const shouldUnlock = currentProgress >= def.targetProgress;

    // Kiểm tra trạng thái hiện tại
    const existing = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: def.id } },
    });

    const wasAlreadyUnlocked = existing?.unlocked ?? false;

    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: def.id } },
      update: {
        progress: currentProgress,
        unlocked: shouldUnlock,
        unlockedAt: shouldUnlock && !wasAlreadyUnlocked ? new Date() : existing?.unlockedAt,
      },
      create: {
        userId,
        achievementId: def.id,
        progress: currentProgress,
        unlocked: shouldUnlock,
        unlockedAt: shouldUnlock ? new Date() : null,
      },
    });

    if (shouldUnlock && !wasAlreadyUnlocked) {
      newlyUnlocked.push(def.slug);
    }
  }

  return { newlyUnlocked };
}
