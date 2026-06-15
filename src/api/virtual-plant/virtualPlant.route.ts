import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { start, getMy, getOne, getTimeline, updateNickname, carePlant, getAllAdmin } from "./virtualPlant.controller.js";
import { startVirtualPlantSchema, updateNicknameSchema } from "./virtualPlant.schema.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: VirtualPlant
 *   description: Virtual plant APIs for users
 */

/**
 * @swagger
 * /virtual-plants/start:
 *   post:
 *     summary: User starts a new virtual plant
 *     tags: [VirtualPlant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [flowerTypeId]
 *             properties:
 *               flowerTypeId:
 *                 type: string
 *               nickname:
 *                 type: string
 *     responses:
 *       201:
 *         description: Virtual plant started and assigned to a real plant
 */
router.post("/start", authenticate, authorize("USER"), validateBody(startVirtualPlantSchema), start);

/**
 * @swagger
 * /virtual-plants/all:
 *   get:
 *     summary: Get all virtual plants for admin
 *     tags: [VirtualPlant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all virtual plants
 */
router.get("/all", authenticate, authorize("ADMIN"), getAllAdmin);

/**
 * @swagger
 * /virtual-plants/my:
 *   get:
 *     summary: Get all virtual plants of the current user
 *     tags: [VirtualPlant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of virtual plants
 */
router.get("/my", authenticate, getMy);

/**
 * @swagger
 * /virtual-plants/{id}:
 *   get:
 *     summary: Get virtual plant by ID
 *     tags: [VirtualPlant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Virtual plant details
 */
router.get("/:id", authenticate, getOne);

/**
 * @swagger
 * /virtual-plants/{id}/timeline:
 *   get:
 *     summary: Get update timeline of the real plant linked to this virtual plant
 *     tags: [VirtualPlant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timeline events
 */
router.get("/:id/timeline", authenticate, getTimeline);

/**
 * @swagger
 * /virtual-plants/{id}:
 *   patch:
 *     summary: Update virtual plant nickname
 *     tags: [VirtualPlant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nickname]
 *             properties:
 *               nickname:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nickname updated
 */
router.patch("/:id", authenticate, validateBody(updateNicknameSchema), updateNickname);

/**
 * @swagger
 * /virtual-plants/{id}/care:
 *   post:
 *     summary: Spend resources to care for virtual plant
 *     tags: [VirtualPlant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resourceType]
 *             properties:
 *               resourceType:
 *                 type: string
 *                 example: WATER
 *               amount:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Care action applied
 *       400:
 *         description: Not enough resource
 */
router.post("/:id/care", authenticate, carePlant);

export default router;
