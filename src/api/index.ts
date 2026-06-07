import { Router, type Request, type Response } from "express";
import { paginateMiddleware } from "../middlewares/paginate.js";
import authRoutes from "./auth/auth.route.js";
import flowerTypeRoutes from "./flower-type/flowerType.route.js";
import gardenRoutes from "./garden/garden.route.js";
import realPlantRoutes from "./real-plant/realPlant.route.js";
import virtualPlantRoutes from "./virtual-plant/virtualPlant.route.js";
import plantUpdateRoutes from "./plant-update/plantUpdate.route.js";
import moodJournalRoutes from "./mood-journal/moodJournal.route.js";
import careTaskRoutes from "./care-task/careTask.route.js";
import notificationRoutes from "./notification/notification.route.js";
import userRoutes from "./user/user.route.js";
import uploadRoutes from "./upload/upload.route.js";
import communityRoutes from "./community/community.route.js";
import calmMusicRoutes from "./calm-music/calmMusic.route.js";
import supabase from "../utils/supabase.js";

const router = Router();

router.use(paginateMiddleware);

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Garden-BE API v1" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/flower-types", flowerTypeRoutes);
router.use("/gardens", gardenRoutes);
router.use("/real-plants", realPlantRoutes);
router.use("/virtual-plants", virtualPlantRoutes);
router.use("/plant-updates", plantUpdateRoutes);
router.use("/mood-journals", moodJournalRoutes);
router.use("/care-tasks", careTaskRoutes);
router.use("/notifications", notificationRoutes);
router.use("/upload", uploadRoutes);
router.use("/community", communityRoutes);
router.use("/calm-music", calmMusicRoutes);

// ---- Supabase connection test (remove in production) ----
router.get("/test-supabase", async (_req: Request, res: Response) => {
  try {
    // Ping Supabase by listing tables via REST metadata endpoint
    const { data, error } = await supabase.from("_prisma_migrations").select("id").limit(1);
    if (error) {
      // Table might not exist in Supabase, but a successful auth error means connection works
      res.json({
        connected: true,
        note: "Supabase reachable. Query error (expected if table not in Supabase): " + error.message,
      });
      return;
    }
    res.json({ connected: true, sample: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ connected: false, error: message });
  }
});

export default router;
