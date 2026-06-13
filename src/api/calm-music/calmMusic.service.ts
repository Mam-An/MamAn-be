import supabase from "../../utils/supabase.js";
import prisma from "../../utils/prisma.js";

const BUCKET = "calm-music";

// ── Lấy public URL của một bản nhạc ───────────────────────────────────────────
export function getPublicUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

// ── Upload file lên Supabase Storage ──────────────────────────────────────────
export async function uploadFileToStorage(
  filePath: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) throw new Error(`Upload thất bại: ${error.message}`);
  return data.path;
}

// ── Lấy Signed Upload URL (Client-side upload bypass Vercel limit) ───────────
export async function generateUploadUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) throw new Error(`Không thể tạo upload URL: ${error.message}`);
  return data; // { signedUrl, token, path }
}

// ── Tạo bản ghi metadata trong DB ────────────────────────────────────────────
export async function createTrackRecord(params: {
  titleVi: string;
  hasLyrics: boolean;
  category: string;
  storagePath: string;
  publicUrl: string;
  originalName: string;
  isFree?: boolean;
  pointCost?: number;
}) {
  return prisma.calmMusicTrack.create({ data: params });
}

// ── Lấy danh sách bản nhạc từ DB (có filter + trạng thái unlock) ─────────────────
export async function listTracks(
  filters: { category?: string; hasLyrics?: boolean; isActive?: boolean },
  userId?: string
) {
  const tracks = await prisma.calmMusicTrack.findMany({
    where: {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.hasLyrics !== undefined ? { hasLyrics: filters.hasLyrics } : {}),
      isActive: filters.isActive ?? true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!userId) return tracks.map((t) => ({ ...t, isUnlocked: t.isFree }));

  const unlocked = await prisma.userUnlockedTrack.findMany({
    where: { userId },
    select: { trackId: true },
  });
  const unlockedSet = new Set(unlocked.map((u) => u.trackId));

  return tracks.map((t) => ({
    ...t,
    isUnlocked: t.isFree || unlockedSet.has(t.id),
  }));
}

// ── Lấy chi tiết một bản nhạc ─────────────────────────────────────────────────
export async function getTrackById(id: string) {
  const track = await prisma.calmMusicTrack.findUnique({ where: { id } });
  if (!track) throw new Error("Không tìm thấy bản nhạc.");
  return track;
}

// ── Cập nhật metadata bản nhạc ────────────────────────────────────────────────
export async function updateTrackRecord(
  id: string,
  data: {
    titleVi?: string;
    hasLyrics?: boolean;
    category?: string;
    isActive?: boolean;
    isFree?: boolean;
    pointCost?: number;
  }
) {
  return prisma.calmMusicTrack.update({ where: { id }, data });
}

// ── Xóa bản nhạc: xóa file trên Storage + record trong DB ────────────────────
export async function deleteTrack(id: string): Promise<void> {
  const track = await prisma.calmMusicTrack.findUnique({ where: { id } });
  if (!track) throw new Error("Không tìm thấy bản nhạc.");

  // Xóa file khỏi Supabase Storage
  const { error } = await supabase.storage.from(BUCKET).remove([track.storagePath]);
  if (error) throw new Error(`Xóa file thất bại: ${error.message}`);

  // Xóa record trong DB
  await prisma.calmMusicTrack.delete({ where: { id } });
}

// ── Lấy signed URL tạm thời (khi bucket là private) ──────────────────────────
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw new Error(`Tạo signed URL thất bại: ${error.message}`);
  return data.signedUrl;
}
