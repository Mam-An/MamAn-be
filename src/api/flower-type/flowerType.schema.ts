import { z } from "zod";
const PLANT_STATUS = ["SEED", "SPROUT", "GROWING", "BUDDING", "BLOOMING", "RESTING"] as const;
const stageImagesSchema = z
    .record(z.enum(PLANT_STATUS), z.string().url().or(z.literal('')).optional())
    .nullish();
const stageDurationsSchema = z
    .record(z.enum(PLANT_STATUS), z.number().int().positive().optional())
    .nullish();
export const createFlowerTypeSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().nullish(),
    imageUrl: z.string().url().or(z.literal('')).nullish(),
    defaultDuration: z.number().int().positive().nullish(),
    stageImages: stageImagesSchema,
    stageDurations: stageDurationsSchema,
});
export const updateFlowerTypeSchema = createFlowerTypeSchema.partial().strict();
