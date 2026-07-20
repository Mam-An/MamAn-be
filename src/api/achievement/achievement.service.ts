import prisma from "../../utils/prisma.js";
type ProgressKeyFn = (userId: string) => Promise<number>;
const PROGRESS_CALCULATORS: Record<string, ProgressKeyFn> = {
    carePlantCount: async (userId) => {
        return prisma.careTaskLog.count({
            where: { userId, virtualPlantId: { not: null } },
        });
    },
    resourceFeedCount: async (userId) => {
        return prisma.careTaskLog.count({ where: { userId, virtualPlantId: { not: null } } });
    },
    zenSessionCount: async (userId) => {
        const plant = await prisma.virtualPlant.findFirst({
            where: { userId },
            select: { growthPoint: true },
        });
        return plant?.growthPoint ?? 0;
    },
    zenTotalMinutes: async (userId) => {
        const plant = await prisma.virtualPlant.findFirst({
            where: { userId },
            select: { growthPoint: true },
        });
        return (plant?.growthPoint ?? 0) * 25;
    },
    journalCount: async (userId) => {
        return prisma.moodJournal.count({ where: { userId } });
    },
    journalDays: async (userId) => {
        const journals = await prisma.moodJournal.findMany({
            where: { userId },
            select: { createdAt: true },
        });
        const uniqueDays = new Set(journals.map((j) => j.createdAt.toISOString().split("T")[0]));
        return uniqueDays.size;
    },
    streakDays: async (userId) => {
        const plant = await prisma.virtualPlant.findFirst({
            where: { userId },
            select: { streakCount: true },
        });
        return plant?.streakCount ?? 0;
    },
};
export async function getAllDefinitions() {
    return prisma.achievementDefinition.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
    });
}
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
export async function refreshUserAchievements(userId: string): Promise<{
    newlyUnlocked: string[];
}> {
    const definitions = await getAllDefinitions();
    const neededKeys = [...new Set(definitions.map((d) => d.progressKey))];
    const progressValues = await Promise.all(neededKeys.map(async (key) => {
        const fn = PROGRESS_CALCULATORS[key];
        const value = fn ? await fn(userId) : 0;
        return [key, value] as [
            string,
            number
        ];
    }));
    const progressMap = Object.fromEntries(progressValues);
    const newlyUnlocked: string[] = [];
    for (const def of definitions) {
        const currentProgress = progressMap[def.progressKey] ?? 0;
        const shouldUnlock = currentProgress >= def.targetProgress;
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
