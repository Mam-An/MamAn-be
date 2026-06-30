import { Router } from "express";
import { getAll, getOne, create, update, remove } from "./zenFlower.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: ZenFlower
 *   description: Quản lý danh mục Hoa Thiền (vật phẩm thư giãn/phần thưởng ảo trong app)
 */

/**
 * @swagger
 * /zen-flowers:
 *   get:
 *     summary: Get all Zen Flowers
 *     tags: [ZenFlower]
 *     responses:
 *       200:
 *         description: List of all Zen Flowers
 */
router.get("/", getAll);

/**
 * @swagger
 * /zen-flowers/{id}:
 *   get:
 *     summary: Get Zen Flower by ID
 *     tags: [ZenFlower]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Zen Flower ID
 *     responses:
 *       200:
 *         description: Zen Flower details
 */
router.get("/:id", getOne);

/**
 * @swagger
 * /zen-flowers:
 *   post:
 *     summary: Create a new Zen Flower
 *     tags: [ZenFlower]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Zen Flower created
 */
router.post("/", authenticate, authorize("ADMIN"), create);

/**
 * @swagger
 * /zen-flowers/{id}:
 *   put:
 *     summary: Update a Zen Flower
 *     tags: [ZenFlower]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Zen Flower updated
 */
router.put("/:id", authenticate, authorize("ADMIN"), update);

/**
 * @swagger
 * /zen-flowers/{id}:
 *   delete:
 *     summary: Delete a Zen Flower
 *     tags: [ZenFlower]
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
 *         description: Zen Flower deleted
 */
router.delete("/:id", authenticate, authorize("ADMIN"), remove);

export default router;
