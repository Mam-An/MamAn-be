import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate.js";
import {
  listDefinitions,
  getMyAchievements,
  getUserAchievementsById,
  triggerProgressRefresh,
} from "./achievement.controller.js";

const router = Router();

// GET  /achievements           — danh sách definitions (không cần auth)
router.get("/", listDefinitions);

// GET  /achievements/me        — tiến trình của user đang đăng nhập
router.get("/me", authenticate, getMyAchievements);

// POST /achievements/progress  — trigger refresh từ server
router.post("/progress", authenticate, triggerProgressRefresh);

export default router;
