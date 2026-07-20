import { z } from "zod";
import { PlantStatus } from "../../generated/prisma/index.js";
export const createRealPlantSchema = z.object({
    code: z.string().min(1).max(50),
    flowerTypeId: z.string().uuid(),
    gardenId: z.string().uuid(),
    plantedAt: z.string().date().optional(),
    status: z.nativeEnum(PlantStatus).optional(),
});
export const updateRealPlantSchema = createRealPlantSchema.omit({ code: true }).partial().strict();
