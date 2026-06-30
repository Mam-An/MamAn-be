import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "./api/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { setupSwagger } from "./swagger.js";

const app = express();

const isDev = process.env.NODE_ENV !== "production";

const ALLOWED_ORIGINS = [
  // Local development
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:8081",
  // Mobile (Expo) — không có origin cố định, dùng null hoặc skip
  // Production FE — cập nhật khi deploy
  "https://garden-fe.vercel.app",
  "https://garden-fe-two.vercel.app",
  "https://garden-fe.onrender.com",
  "https://garden-admin.vercel.app",
  "https://garden-be.vercel.app",
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Cho phép requests không có origin (mobile app, Postman, curl)
    if (!origin) return callback(null, true);

    if (isDev || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400,
};



app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

setupSwagger(app);

app.get("/", (_req: Request, res: Response) => {
  res.send("Garden-BE Server is running 🌱");
});

app.use("/api/v1", apiRoutes);
app.use(errorHandler);

export default app;
