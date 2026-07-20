import type { Request, Response, NextFunction } from "express";
import prisma from "../../utils/prisma.js";
import { generateJournalReply } from "./aiJournal.service.js";
import type { QueryMoodJournalDto } from "./moodJournal.schema.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { refreshUserAchievements } from "../achievement/achievement.service.js";
export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { mood, note } = req.body;
        const recentEntries = await prisma.moodJournal.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { mood: true },
        });
        const recentMoods = recentEntries.map((e) => e.mood);
        const aiResult = await generateJournalReply({ mood, note, recentMoods });
        const journal = await prisma.moodJournal.create({
            data: {
                userId,
                mood,
                note: note?.trim() || null,
                aiReply: aiResult.reply,
                aiMetadata: aiResult.metadata as Prisma.InputJsonValue ?? undefined,
            },
        });
        refreshUserAchievements(userId).catch(() => { });
        return res.status(201).json({
            message: "Journal created successfully",
            metadata: {
                id: journal.id,
                mood: journal.mood,
                note: journal.note,
                aiReply: journal.aiReply,
                createdAt: journal.createdAt,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
export const getMy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { queryMoodJournalSchema } = await import("./moodJournal.schema.js");
        const parsed = queryMoodJournalSchema.safeParse(req.query);
        const { page, limit, mood, fromDate, toDate }: QueryMoodJournalDto = parsed.success
            ? parsed.data
            : { page: 1, limit: 10 };
        const where: Prisma.MoodJournalWhereInput = { userId };
        if (mood)
            where.mood = mood;
        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate)
                where.createdAt.gte = fromDate;
            if (toDate)
                where.createdAt.lte = toDate;
        }
        const skip = (page - 1) * limit;
        const [journals, total] = await Promise.all([
            prisma.moodJournal.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip,
                select: {
                    id: true,
                    mood: true,
                    note: true,
                    aiReply: true,
                    createdAt: true,
                },
            }),
            prisma.moodJournal.count({ where }),
        ]);
        return res.paginate(journals, {
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            itemCount: journals.length,
            currentPage: page,
        });
    }
    catch (err) {
        next(err);
    }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;
        const journal = await prisma.moodJournal.findFirst({
            where: { id: id as string, userId },
            select: {
                id: true,
                mood: true,
                note: true,
                aiReply: true,
                aiMetadata: true,
                createdAt: true,
            },
        });
        if (!journal) {
            return res.status(404).json({ message: "Journal not found" });
        }
        return res.status(200).json({
            message: "Get journal successfully",
            metadata: journal,
        });
    }
    catch (err) {
        next(err);
    }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const deleted = await prisma.moodJournal.deleteMany({
            where: { id: req.params.id as string, userId },
        });
        if (deleted.count === 0) {
            return res.status(404).json({ message: "Journal not found" });
        }
        return res.status(200).json({ message: "Journal deleted successfully" });
    }
    catch (err) {
        next(err);
    }
};
