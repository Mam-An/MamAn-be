import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { listDefinitions, getMyAchievements, getUserAchievementsById, triggerProgressRefresh, } from "./achievement.controller.js";
const router = Router();
router.get("/", listDefinitions);
router.get("/me", authenticate, getMyAchievements);
router.post("/progress", authenticate, triggerProgressRefresh);
export default router;
