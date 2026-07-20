import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { uploadGeneral } from "../../middlewares/upload.middleware.js";
const router = Router();
router.post("/", authenticate, authorize("ADMIN", "FARMER"), uploadGeneral.single("image"), (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
    }
    return res.status(200).json({
        message: "Upload successful",
        url: req.file.path,
    });
});
export default router;
