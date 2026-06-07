import type { Request, Response } from "express";
import multer from "multer";
import path from "path";
import {
  uploadFileToStorage,
  createTrackRecord,
  listTracks,
  getTrackById,
  updateTrackRecord,
  deleteTrack,
  getPublicUrl,
  getSignedUrl,
} from "./calmMusic.service.js";

// ── Chuyển tên file về dạng ASCII an toàn cho Supabase Storage ───────────────
function toSafeFilename(name: string): string {
  return name
    .normalize("NFD")                        // tách dấu ra khỏi ký tự gốc
    .replace(/[\u0300-\u036f]/g, "")         // xoá các dấu thanh/dấu phụ
    .replace(/[đĐ]/g, "d")                   // đ/Đ → d (NFD không tách được)
    .replace(/[^a-zA-Z0-9._\-]/g, "_")      // ký tự còn lại → _
    .replace(/_+/g, "_")                     // nhiều _ liên tiếp → một _
    .replace(/^_|_$/g, "");                  // trim _ đầu/cuối
}

// ── Multer: lưu tạm trong bộ nhớ, không ghi đĩa ──────────────────────────────
const ALLOWED_MIMETYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav",
  "audio/ogg", "audio/flac", "audio/aac",
  "audio/x-m4a", "audio/mp4",
];
const MAX_SIZE_MB = 20;

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file âm thanh: MP3, WAV, OGG, FLAC, AAC, M4A."));
    }
  },
});

// ── POST /calm-music/upload ───────────────────────────────────────────────────
export const uploadTrackHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file âm thanh nào được gửi lên." });
    }

    const { originalname, buffer, mimetype } = req.file;

    // Lấy metadata từ body
    const titleVi: string = (req.body.titleVi as string)?.trim() ||
      path.parse(originalname).name;
    const category: string = (req.body.category as string)?.trim() || "general";
    // hasLyrics: "true" / "1" / true → true; mặc định false (không lời)
    const hasLyrics = ["true", "1", "yes"].includes(
      String(req.body.hasLyrics).toLowerCase()
    );

    // Tạo path an toàn cho Supabase Storage
    const ext = path.extname(originalname).toLowerCase();
    const safeName = toSafeFilename(titleVi) || "track";
    const storagePath = `${category}/${Date.now()}-${safeName}${ext}`;

    // Upload file lên Supabase Storage
    const uploadedPath = await uploadFileToStorage(storagePath, buffer, mimetype);
    const publicUrl = getPublicUrl(uploadedPath);

    // Lưu metadata vào DB
    const track = await createTrackRecord({
      titleVi,
      hasLyrics,
      category,
      storagePath: uploadedPath,
      publicUrl,
      originalName: originalname,
    });

    return res.status(201).json({
      message: "Upload bản nhạc thành công.",
      data: track,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message });
  }
};

// ── GET /calm-music ───────────────────────────────────────────────────────────
// Query params: category?, hasLyrics? (true/false)
export const listTracksHandler = async (req: Request, res: Response) => {
  try {
    const { category, hasLyrics } = req.query;

    const filters: { category?: string; hasLyrics?: boolean } = {};
    if (category) filters.category = category as string;
    if (hasLyrics !== undefined) {
      filters.hasLyrics = ["true", "1", "yes"].includes(
        String(hasLyrics).toLowerCase()
      );
    }

    const tracks = await listTracks(filters);

    return res.status(200).json({
      message: "Lấy danh sách bản nhạc thành công.",
      data: tracks,
      total: tracks.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message });
  }
};

// ── GET /calm-music/:id ───────────────────────────────────────────────────────
export const getTrackByIdHandler = async (req: Request, res: Response) => {
  try {
    const track = await getTrackById(req.params.id);
    return res.status(200).json({ data: track });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(404).json({ message });
  }
};

// ── PATCH /calm-music/:id ─────────────────────────────────────────────────────
export const updateTrackHandler = async (req: Request, res: Response) => {
  try {
    const { titleVi, hasLyrics, category, isActive } = req.body as {
      titleVi?: string;
      hasLyrics?: boolean;
      category?: string;
      isActive?: boolean;
    };

    const updated = await updateTrackRecord(req.params.id, {
      ...(titleVi !== undefined ? { titleVi: titleVi.trim() } : {}),
      ...(hasLyrics !== undefined ? { hasLyrics: Boolean(hasLyrics) } : {}),
      ...(category !== undefined ? { category: category.trim() } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    });

    return res.status(200).json({
      message: "Cập nhật bản nhạc thành công.",
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message });
  }
};

// ── DELETE /calm-music/:id ────────────────────────────────────────────────────
export const deleteTrackHandler = async (req: Request, res: Response) => {
  try {
    await deleteTrack(req.params.id);
    return res.status(200).json({ message: "Xóa bản nhạc thành công." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(404).json({ message });
  }
};

// ── GET /calm-music/:id/signed-url ────────────────────────────────────────────
export const getSignedUrlHandler = async (req: Request, res: Response) => {
  try {
    const track = await getTrackById(req.params.id);
    const expiresIn = parseInt((req.query.expires as string) || "3600", 10);
    const signedUrl = await getSignedUrl(track.storagePath, expiresIn);

    return res.status(200).json({
      message: "Tạo signed URL thành công.",
      signedUrl,
      expiresInSeconds: expiresIn,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message });
  }
};
