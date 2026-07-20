import prisma from "../../utils/prisma.js";
export const RESOURCE_POINT_RATE: Record<string, number> = {
    WATER: 1,
    SUNLIGHT: 1,
    FERTILIZER: 2,
    AIR: 1,
    LOVE: 3,
    DEW: 2,
};
export const UNLOCK_COST = 50;
export async function getOrCreateUserPoints(userId: string) {
    const existing = await prisma.userPoints.findUnique({ where: { userId } });
    if (existing)
        return existing;
    return prisma.userPoints.create({
        data: { userId, totalPoints: 0, spentPoints: 0 },
    });
}
export async function getAvailablePoints(userId: string): Promise<number> {
    const points = await getOrCreateUserPoints(userId);
    return points.totalPoints - points.spentPoints;
}
export async function addPointsFromTask(userId: string, resourceType: string, amount: number): Promise<void> {
    const rate = RESOURCE_POINT_RATE[resourceType] ?? 1;
    const earned = amount * rate;
    if (earned <= 0)
        return;
    await prisma.userPoints.upsert({
        where: { userId },
        update: { totalPoints: { increment: earned } },
        create: { userId, totalPoints: earned, spentPoints: 0 },
    });
}
export async function unlockTrack(userId: string, trackId: string) {
    const track = await prisma.calmMusicTrack.findUnique({ where: { id: trackId } });
    if (!track || !track.isActive) {
        throw new Error("Không tìm thấy bài hát.");
    }
    if (track.isFree) {
        throw new Error("Bài hát này miễn phí, không cần mở khóa.");
    }
    const alreadyUnlocked = await prisma.userUnlockedTrack.findUnique({
        where: { userId_trackId: { userId, trackId } },
    });
    if (alreadyUnlocked) {
        throw new Error("Bạn đã mở khóa bài hát này rồi.");
    }
    const plan = await getActiveUserPlan(userId);
    const maxRedeem = plan?.maxRedeemSongs ?? 0;
    const unlockedCount = await prisma.userUnlockedTrack.count({ where: { userId } });
    if (maxRedeem > 0 && unlockedCount >= maxRedeem) {
        throw new Error(`Gói hiện tại của bạn chỉ cho phép mở khóa tối đa ${maxRedeem} bài hát.`);
    }
    const available = await getAvailablePoints(userId);
    const cost = track.pointCost;
    if (available < cost) {
        throw new Error(`Bạn cần ${cost} điểm để mở khóa bài này. Hiện có: ${available} điểm.`);
    }
    const [unlockedTrack] = await prisma.$transaction([
        prisma.userUnlockedTrack.create({
            data: { userId, trackId, pointsSpent: cost },
        }),
        prisma.userPoints.update({
            where: { userId },
            data: { spentPoints: { increment: cost } },
        }),
    ]);
    return unlockedTrack;
}
async function getActiveUserPlan(userId: string) {
    const sub = await prisma.userSubscription.findFirst({
        where: {
            userId,
            isActive: true,
            OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        include: { plan: { select: { maxRedeemSongs: true, code: true } } },
        orderBy: { startsAt: "desc" },
    });
    return sub?.plan ?? null;
}
export async function getUnlockedTrackIds(userId: string): Promise<string[]> {
    const rows = await prisma.userUnlockedTrack.findMany({
        where: { userId },
        select: { trackId: true },
    });
    return rows.map((r) => r.trackId);
}
