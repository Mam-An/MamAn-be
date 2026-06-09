import { Router } from "express";
import { getAll, getOne, create, update, remove } from "./zenFlower.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Public / User routes
router.get("/", getAll);
router.get("/:id", getOne);

// Admin routes
router.post("/", authenticate, authorize("ADMIN"), create);
router.put("/:id", authenticate, authorize("ADMIN"), update);
router.delete("/:id", authenticate, authorize("ADMIN"), remove);

export default router;
