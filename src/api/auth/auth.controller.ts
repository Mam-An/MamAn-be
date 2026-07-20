import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../utils/prisma.js";
import { generateTokens } from "../../utils/jwt.js";
import { addRefreshToken, deleteRefreshToken, findRefreshToken } from "./auth.service.js";
const COOKIE_OPTS = (maxAge: number) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge,
    path: "/",
});
export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, fullName, avatarUrl } = req.body;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(409).json({ message: "Email already in use" });
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, passwordHash, fullName, avatarUrl },
            select: { id: true, email: true, fullName: true, role: true, createdAt: true },
        });
        return res.status(201).json({ message: "Registered successfully", user });
    }
    catch (err) {
        next(err);
    }
};
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, passwordHash: true, role: true, fullName: true, isActive: true },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        if (!bcrypt.compareSync(password, user.passwordHash)) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const { accessToken, refreshToken } = generateTokens({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        await addRefreshToken({ refreshToken, userId: user.id });
        res.cookie("accessToken", accessToken, COOKIE_OPTS(60 * 60 * 1000));
        res.cookie("refreshToken", refreshToken, COOKIE_OPTS(7 * 24 * 60 * 60 * 1000));
        return res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
        });
    }
    catch (err) {
        next(err);
    }
};
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, fullName: true, avatarUrl: true,
                role: true, isActive: true, createdAt: true,
            },
        });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ user });
    }
    catch (err) {
        next(err);
    }
};
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        await prisma.user.update({ where: { id: userId }, data: req.body });
        return res.status(200).json({ message: "Profile updated successfully" });
    }
    catch (err) {
        next(err);
    }
};
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const { currentPassword, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
        return res.status(200).json({ message: "Password updated successfully" });
    }
    catch (err) {
        next(err);
    }
};
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const oldToken = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!oldToken)
            return res.status(401).json({ message: "Missing refresh token" });
        const stored = await findRefreshToken(oldToken);
        if (!stored || !stored.userId)
            return res.status(401).json({ message: "Invalid refresh token" });
        await deleteRefreshToken(oldToken);
        const user = await prisma.user.findUnique({
            where: { id: stored.userId },
            select: { id: true, email: true, role: true },
        });
        if (!user)
            return res.status(401).json({ message: "Unauthorized" });
        const { accessToken, refreshToken } = generateTokens({ id: user.id, email: user.email, role: user.role });
        await addRefreshToken({ refreshToken, userId: user.id });
        res.cookie("accessToken", accessToken, COOKIE_OPTS(60 * 60 * 1000));
        res.cookie("refreshToken", refreshToken, COOKIE_OPTS(7 * 24 * 60 * 60 * 1000));
        return res.status(200).json({
            message: "Token refreshed",
            accessToken,
        });
    }
    catch (err) {
        next(err);
    }
};
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (token)
            await deleteRefreshToken(token);
        res.clearCookie("accessToken", { path: "/" });
        res.clearCookie("refreshToken", { path: "/" });
        return res.status(200).json({ message: "Logged out successfully" });
    }
    catch (err) {
        next(err);
    }
};
