import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { uploadGeneral } from "../../middlewares/upload.middleware.js";
import {
  createRequest,
  listRequests,
  cancelRequest,
  matchRequest,
  getMyCompanionship,
  getMyRequest,
  endCompanionship,
  sharePlant,
  getMessages,
  sendMessage,
  markMessagesRead,
  adminListCompanionships,
  adminGetStats,
  adminListRequests,
  adminEndCompanionship,
} from "./companion.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── User routes (USER only) ──────────────────────────────────────

// Yêu cầu tìm bạn
router.post("/request", authorize("USER"), createRequest);
router.get("/requests", authorize("USER"), listRequests);
router.delete("/request", authorize("USER"), cancelRequest);

// Ghép nối
router.post("/match/:requestId", authorize("USER"), matchRequest);

// Companionship của tôi
router.get("/my", authorize("USER"), getMyCompanionship);
router.get("/my/request", authorize("USER"), getMyRequest);
router.delete("/my", authorize("USER"), endCompanionship);
router.patch("/my/share-plant", authorize("USER"), sharePlant);

// Tin nhắn
router.get("/messages", authorize("USER"), getMessages);
router.post("/messages", authorize("USER"), uploadGeneral.single("photo"), sendMessage);
router.patch("/messages/read", authorize("USER"), markMessagesRead);

// ── Admin routes ─────────────────────────────────────────────────

router.get("/admin/all", authorize("ADMIN"), adminListCompanionships);
router.get("/admin/stats", authorize("ADMIN"), adminGetStats);
router.get("/admin/requests", authorize("ADMIN"), adminListRequests);
router.delete("/admin/:id", authorize("ADMIN"), adminEndCompanionship);

export default router;
