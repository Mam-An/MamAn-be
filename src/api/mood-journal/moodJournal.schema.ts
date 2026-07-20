import { z } from "zod";
import { MoodType } from "../../generated/prisma/index.js";
export const createMoodJournalSchema = z.object({
    mood: z.nativeEnum(MoodType),
    note: z
        .string()
        .max(2000, "Ghi chú tối đa 2000 ký tự")
        .optional(),
});
export type CreateMoodJournalDto = z.infer<typeof createMoodJournalSchema>;
export const queryMoodJournalSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    mood: z.nativeEnum(MoodType).optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
});
export type QueryMoodJournalDto = z.infer<typeof queryMoodJournalSchema>;
