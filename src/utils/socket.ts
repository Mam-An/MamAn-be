import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { verifyAccessToken } from "./jwt.js";

let io: Server;

export interface CompanionMessagePayload {
  id: string;
  companionshipId: string;
  senderId: string;
  senderName: string | null;
  senderAvatar: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export function initSocket(httpServer: HttpServer): Server {
  const isDev = process.env.NODE_ENV !== "production";
  const ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:8081",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:8081",
    "https://garden-fe.vercel.app",
    "https://garden-fe-two.vercel.app",
    "https://garden-fe.onrender.com",
    "https://garden-admin.vercel.app",
    "https://garden-be.vercel.app",
  ];

  io = new Server(httpServer, {
    cors: {
      origin: isDev ? "*" : ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  // Authenticate socket connections
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token || typeof token !== "string") {
        return next(new Error("Unauthorized: No token provided"));
      }

      const payload = verifyAccessToken(token);
      // Attach user info to socket data
      (socket as Socket & { userId: string; userRole: string }).userId = payload.id;
      (socket as Socket & { userId: string; userRole: string }).userRole = payload.role;
      return next();
    } catch {
      return next(new Error("Unauthorized: Invalid token"));
    }
  });

  // Companion namespace
  const companion = io.of("/companion");

  companion.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token || typeof token !== "string") {
        return next(new Error("Unauthorized"));
      }

      const payload = verifyAccessToken(token);
      (socket.data as { userId: string; role: string }).userId = payload.id;
      (socket.data as { userId: string; role: string }).role = payload.role;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  companion.on("connection", (socket) => {
    const userId: string = (socket.data as { userId: string }).userId;
    console.log(`[Socket.IO] Companion connected: ${userId}`);

    // Join personal room (for notifications like "you've been matched")
    socket.join(`user:${userId}`);

    // Join companionship chat room
    socket.on("companion:join", (companionshipId: string) => {
      if (companionshipId) {
        socket.join(`companionship:${companionshipId}`);
        console.log(`[Socket.IO] ${userId} joined room companionship:${companionshipId}`);
      }
    });

    socket.on("companion:leave", (companionshipId: string) => {
      if (companionshipId) {
        socket.leave(`companionship:${companionshipId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Companion disconnected: ${userId}`);
    });
  });

  console.log("[Socket.IO] Initialized");
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocket() first.");
  }
  return io;
}

/**
 * Emit a new companion message to the companionship room
 */
export function emitCompanionMessage(
  companionshipId: string,
  message: CompanionMessagePayload
): void {
  const ns = getIO().of("/companion");
  ns.to(`companionship:${companionshipId}`).emit("companion:message", message);
}

/**
 * Notify a user they have been matched with someone
 */
export function emitCompanionMatched(
  userId: string,
  data: { companionshipId: string; partnerId: string; partnerName: string | null; partnerAvatar: string | null }
): void {
  const ns = getIO().of("/companion");
  ns.to(`user:${userId}`).emit("companion:matched", data);
}

/**
 * Notify users their companionship has ended
 */
export function emitCompanionEnded(userId: string, companionshipId: string, reason?: string): void {
  const ns = getIO().of("/companion");
  ns.to(`user:${userId}`).emit("companion:ended", { companionshipId, reason });
}

/**
 * Notify the other user that messages have been read
 */
export function emitMessagesRead(companionshipId: string, readByUserId: string): void {
  const ns = getIO().of("/companion");
  ns.to(`companionship:${companionshipId}`).emit("companion:read", { readByUserId });
}
