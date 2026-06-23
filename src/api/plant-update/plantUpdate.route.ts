import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { create, getByRealPlant, getAll, deleteUpdate } from "./plantUpdate.controller.js";
import { createPlantUpdateSchema } from "./plantUpdate.schema.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: PlantUpdate
 *   description: Real plant updates by Farmers
 */

/**
 * @swagger
 * /plant-updates/all:
 *   get:
 *     summary: Get all plant updates (Admin and Farmer)
 *     tags: [PlantUpdate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gardenId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of all updates
 */
router.get("/all", authenticate, authorize("ADMIN", "FARMER"), getAll);

/**
 * @swagger
 * /plant-updates:
 *   post:
 *     summary: Create an update for a real plant
 *     tags: [PlantUpdate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [realPlantId, imageUrl, status]
 *             properties:
 *               realPlantId:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               status:
 *                 type: string
 *               note:
 *                 type: string
 *               healthNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Plant update created
 */
router.post("/", authenticate, authorize("FARMER"), validateBody(createPlantUpdateSchema), create);

/**
 * @swagger
 * /plant-updates/{realPlantId}:
 *   get:
 *     summary: Get all updates for a real plant
 *     tags: [PlantUpdate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: realPlantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of updates
 */
router.get("/:realPlantId", authenticate, getByRealPlant);

/**
 * @swagger
 * /plant-updates/{id}:
 *   delete:
 *     summary: Delete a plant update (ADMIN)
 *     tags: [PlantUpdate]
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
 *         description: Deleted
 */
router.delete("/:id", authenticate, authorize("ADMIN"), deleteUpdate);

export default router;
