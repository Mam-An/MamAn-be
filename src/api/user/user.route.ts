import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { getAllUsers, toggleActive, savePushToken, getUserVirtualPlants, getUserRealPlants, getUserMoodJournals, getMyFlowerGarden } from "./user.controller.js";

const router = Router();

// Lưu push token — bất kỳ user đã login (USER, FARMER, ADMIN)
router.patch("/push-token", authenticate, savePushToken);

// ── Routes dành cho user hiện tại (USER) ────────────────────────────────────
/**
 * @swagger
 * /users/me/flower-garden:
 *   get:
 *     summary: Get the current user's flower garden (harvest collection)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Flower garden data with species list and harvest stats
 */
router.get("/me/flower-garden", authenticate, authorize("USER"), getMyFlowerGarden);

// Các route dưới đây chỉ ADMIN
router.use(authenticate, authorize("ADMIN"));
router.get("/", getAllUsers);
router.get("/:id/virtual-plants", getUserVirtualPlants);
router.get("/:id/real-plants", getUserRealPlants);
router.get("/:id/mood-journals", getUserMoodJournals);
router.patch("/:id", toggleActive);

export default router;
