import prisma from "../../utils/prisma.js";
import { hashToken } from "../../utils/hash.js";
export const addRefreshToken = (params: {
    refreshToken: string;
    userId: string;
}) => {
    return prisma.refreshToken.create({
        data: {
            hashedToken: hashToken(params.refreshToken),
            userId: params.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });
};
export const findRefreshToken = (refreshToken: string) => {
    return prisma.refreshToken.findFirst({
        where: {
            hashedToken: hashToken(refreshToken),
            revoked: false,
            expiresAt: { gt: new Date() },
        },
    });
};
export const deleteRefreshToken = (refreshToken: string) => {
    return prisma.refreshToken.deleteMany({
        where: { hashedToken: hashToken(refreshToken) },
    });
};
