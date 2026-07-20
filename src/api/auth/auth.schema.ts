import { z } from "zod";
export const registerSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(6, "Password must be at least 6 characters"),
    fullName: z.string().min(1).max(150).optional(),
    avatarUrl: z.string().url().optional(),
});
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password required"),
});
export const updateProfileSchema = z.object({
    fullName: z.string().min(1).max(150).optional(),
    avatarUrl: z.string().url().optional(),
}).strict();
export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
});
