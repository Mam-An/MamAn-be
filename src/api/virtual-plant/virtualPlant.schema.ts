import { z } from "zod";
export const startVirtualPlantSchema = z.object({
    flowerTypeId: z.string().uuid(),
    nickname: z.string().max(100).optional(),
});
export const updateNicknameSchema = z.object({
    nickname: z.string().max(100),
});
