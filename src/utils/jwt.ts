import jwt from "jsonwebtoken";
import crypto from "crypto";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET)
    throw new Error("Missing JWT_SECRET in environment");
interface JwtPayload {
    id: string;
    email: string;
    role: string;
}
const generateAccessToken = (user: JwtPayload) => {
    return jwt.sign({ ...user }, JWT_SECRET, { expiresIn: "1h" });
};
const generateRefreshToken = () => {
    return crypto.randomBytes(32).toString("hex");
};
const generateTokens = (user: JwtPayload) => {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    return { accessToken, refreshToken };
};
const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
export { generateAccessToken, generateRefreshToken, generateTokens, verifyAccessToken };
