import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  listDefinitions,
  getMyAchievements,
  getUserAchievementsById,
  triggerProgressRefresh,
} from "./achievement.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Achievement
 *   description: Achievement management endpoints
 */

/**
 * @swagger
 * /achievements:
 *   get:
 *     summary: Get list of achievement definitions
 *     tags: [Achievement]
 *     responses:
 *       200:
 *         description: List of achievements
 */
router.get("/", listDefinitions);

/**
 * @swagger
 * /achievements/me:
 *   get:
 *     summary: Get my achievement progress
 *     tags: [Achievement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's achievement progress
 */
router.get("/me", authenticate, getMyAchievements);

/**
 * @swagger
 * /achievements/progress:
 *   post:
 *     summary: Trigger progress refresh
 *     tags: [Achievement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress refreshed
 */
router.post("/progress", authenticate, triggerProgressRefresh);

export default router;
