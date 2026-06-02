import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import type { Request } from "express";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ── Storage cho ảnh nhân vật task (ADMIN) ─────────────────────────────────────
const characterStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "garden/task-characters",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation:  [{ width: 400, height: 400, crop: "limit", quality: "auto" }],
  } as any,
});

// ── Storage cho ảnh task của user (chụp bằng camera khi hoàn thành) ───────────
const taskPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          process.env.CLOUDINARY_FOLDER ?? "mam-an/tasks",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1080, height: 1080, crop: "limit", quality: "auto:good" }],
  } as any,
});

// ── Storage chung (garden, plant update...) ───────────────────────────────────
const generalStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "garden/general",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
  } as any,
});

// ── File filter: chỉ nhận jpeg / png / webp ───────────────────────────────────
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WebP."));
  }
};

export const uploadCharacter = multer({
  storage: characterStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/** Multer cho ảnh task user (JPEG/PNG/WebP, 5MB) */
export const uploadTaskPhoto = multer({
  storage:    taskPhotoStorage,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter,
});

export const uploadGeneral = multer({
  storage: generalStorage,
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/** Tiện ích: xóa ảnh khỏi Cloudinary theo public_id */
export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("[Cloudinary] Failed to delete image:", publicId, err);
  }
}

