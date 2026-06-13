import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { getAll, getOne, create, update, batchCreate } from "./realPlant.controller.js";
import { createRealPlantSchema, updateRealPlantSchema } from "./realPlant.schema.js";
import {
  reactToPlant, getReactions,
  addComment, getComments,
  getFeedbackSummary,
} from "./plantFeedback.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: RealPlant
 *   description: Real plant tracking APIs
 */

/**
 * @swagger
 * /real-plants:
 *   get:
 *     summary: Get all real plants
 *     tags: [RealPlant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gardenId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of real plants
 */
router.get("/", authenticate, authorize("ADMIN", "FARMER"), getAll);

/**
 * @swagger
 * /real-plants/batch:
 *   post:
 *     summary: Batch create real plants of the same type into a garden
 *     tags: [RealPlant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [flowerTypeId, gardenId, quantity]
 *             properties:
 *               flowerTypeId:
 *                 type: string
 *               gardenId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *               plantedAt:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Plants created
 */
router.post("/batch", authenticate, authorize("ADMIN", "FARMER"), batchCreate);

/**
 * @swagger
 * /real-plants/{id}:
 *   get:
 *     summary: Get a real plant by ID
 *     tags: [RealPlant]
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
 *         description: Real plant data
 */
router.get("/:id", authenticate, authorize("ADMIN", "FARMER"), getOne);

/**
 * @swagger
 * /real-plants:
 *   post:
 *     summary: Register a single real plant
 *     tags: [RealPlant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, flowerTypeId, gardenId]
 *             properties:
 *               code:
 *                 type: string
 *               flowerTypeId:
 *                 type: string
 *               gardenId:
 *                 type: string
 *               plantedAt:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: RealPlant created
 */
router.post("/", authenticate, authorize("ADMIN", "FARMER"), validateBody(createRealPlantSchema), create);

/**
 * @swagger
 * /real-plants/{id}:
 *   put:
 *     summary: Update a real plant
 *     tags: [RealPlant]
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
 *             properties:
 *               flowerTypeId:
 *                 type: string
 *               gardenId:
 *                 type: string
 *               plantedAt:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: RealPlant updated
 */
router.put("/:id", authenticate, authorize("ADMIN", "FARMER"), validateBody(updateRealPlantSchema), update);

// ── Feedback routes (user: react + comment; farmer: summary) ─────────────

// GET /real-plants/feedback-summary  [FARMER | ADMIN]
router.get("/feedback-summary", authenticate, authorize("ADMIN", "FARMER"), getFeedbackSummary);

// POST /real-plants/:id/react  [USER]
router.post("/:id/react", authenticate, reactToPlant);

// GET  /real-plants/:id/reactions  [authenticated]
router.get("/:id/reactions", authenticate, getReactions);

// POST /real-plants/:id/comments  [USER]
router.post("/:id/comments", authenticate, addComment);

// GET  /real-plants/:id/comments  [authenticated]
router.get("/:id/comments", authenticate, getComments);

export default router;
