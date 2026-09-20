import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import router from "./src/routes/index.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./src/middleware/errorHandler.js";
import { generalLimiter } from "./src/middleware/rateLimiter.js";

dotenv.config();

const app = express();

// Trust reverse proxy (Render, Vercel, Cloudflare) to accurately capture real client IP
app.set("trust proxy", 1);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Lightweight Health Check endpoint (digunakan oleh UptimeRobot/Cron untuk keep-alive Render)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Terapkan rate limiter umum
app.use(generalLimiter);

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  const currentTime = new Date().toLocaleString();
  const serverUptime = process.uptime().toFixed(2) + " seconds";

  res.json({
    message: "Welcome to KSM Multimedia API",
    version: "1.0.0",
    serverTime: currentTime,
    serverUptime: serverUptime,
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      base: "/api/v1",
      users: "/api/v1/users",
    },
    status: "operational",
  });
});

app.use("/api/v1", router);

app.use(errorHandler);
app.use(notFoundHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
