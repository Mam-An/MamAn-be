import { z } from "zod";
import { PlantStatus } from "../../generated/prisma/index.js";
export const createPlantUpdateSchema = z.object({
    realPlantId: z.string().uuid(),
    imageUrl: z.string().url(),
    status: z.nativeEnum(PlantStatus),
    note: z.string().optional(),
    healthNote: z.string().max(500).optional(),
});
