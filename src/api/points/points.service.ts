import prisma from "../../utils/prisma.js";

// Hệ số điểm cho từng loại tài nguyên
export const RESOURCE_POINT_RATE: Record<string, number> = {
  WATER:      1,
  SUNLIGHT:   1,
  FERTILIZER: 2,
  AIR:        1,
  LOVE:       3,
  DEW:        2,
};

// Số điểm cố định mỗi bài cần để mở khóa
export const UNLOCK_COST = 50;

// ── Lấy hoặc khởi tạo điểm của user ────────────────────────────────────────
export async function getOrCreateUserPoints(userId: string) {
  const existing = await prisma.userPoints.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.userPoints.create({
    data: { userId, totalPoints: 0, spentPoints: 0 },
  });
}

// ── Tính điểm tích lũy có thể dùng của user ─────────────────────────────────
export async function getAvailablePoints(userId: string): Promise<number> {
  const points = await getOrCreateUserPoints(userId);
  return points.totalPoints - points.spentPoints;
}

// ── Cộng điểm khi user hoàn thành task ──────────────────────────────────────
// earnedPoints = rewardAmount × rate của loại tài nguyên
export async function addPointsFromTask(
  userId: string,
  resourceType: string,
  amount: number
): Promise<void> {
  const rate = RESOURCE_POINT_RATE[resourceType] ?? 1;
  const earned = amount * rate;
  if (earned <= 0) return;

  await prisma.userPoints.upsert({
    where: { userId },
    update: { totalPoints: { increment: earned } },
    create: { userId, totalPoints: earned, spentPoints: 0 },
  });
}

// ── Mở khóa bài hát bằng điểm ───────────────────────────────────────────────
export async function unlockTrack(userId: string, trackId: string) {
  // 1. Lấy thông tin bài hát
  const track = await prisma.calmMusicTrack.findUnique({ where: { id: trackId } });
  if (!track || !track.isActive) {
    throw new Error("Không tìm thấy bài hát.");
  }
  if (track.isFree) {
    throw new Error("Bài hát này miễn phí, không cần mở khóa.");
  }

  // 2. Kiểm tra đã unlock chưa
  const alreadyUnlocked = await prisma.userUnlockedTrack.findUnique({
    where: { userId_trackId: { userId, trackId } },
  });
  if (alreadyUnlocked) {
    throw new Error("Bạn đã mở khóa bài hát này rồi.");
  }

  // 3. Kiểm tra giới hạn gói dịch vụ
  const plan = await getActiveUserPlan(userId);
  const maxRedeem = plan?.maxRedeemSongs ?? 0;

  const unlockedCount = await prisma.userUnlockedTrack.count({ where: { userId } });
  if (maxRedeem > 0 && unlockedCount >= maxRedeem) {
    throw new Error(
      `Gói hiện tại của bạn chỉ cho phép mở khóa tối đa ${maxRedeem} bài hát.`
    );
  }

  // 4. Kiểm tra đủ điểm
  const available = await getAvailablePoints(userId);
  const cost = track.pointCost;
  if (available < cost) {
    throw new Error(
      `Bạn cần ${cost} điểm để mở khóa bài này. Hiện có: ${available} điểm.`
    );
  }

  // 5. Transaction: trừ điểm + ghi nhận unlock
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

// ── Lấy gói dịch vụ đang active của user ────────────────────────────────────
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

// ── Lấy danh sách trackId đã unlock của user ─────────────────────────────────
export async function getUnlockedTrackIds(userId: string): Promise<string[]> {
  const rows = await prisma.userUnlockedTrack.findMany({
    where: { userId },
    select: { trackId: true },
  });
  return rows.map((r) => r.trackId);
}
