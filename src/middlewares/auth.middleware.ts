import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken ||
            req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }
        const payload = verifyAccessToken(token);
        req.user = { id: payload.id, email: payload.email, role: payload.role };
        return next();
    }
    catch {
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
};
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role ?? "")) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }
        return next();
    };
};
