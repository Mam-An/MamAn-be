import { z } from "zod";
export const createGardenSchema = z.object({
    name: z.string().min(1).max(255),
    address: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional(),
});
export const updateGardenSchema = createGardenSchema.partial().strict();
