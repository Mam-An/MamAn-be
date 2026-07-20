import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { getMyPoints, unlockTrackHandler, getUnlockedTracksHandler, } from "./points.controller.js";
const router = Router();
router.get("/me", authenticate, getMyPoints);
router.get("/unlocked-tracks", authenticate, getUnlockedTracksHandler);
router.post("/unlock/:trackId", authenticate, unlockTrackHandler);
export default router;
