import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
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

// Disable X-Powered-By header for security (MIA-SEC-007)
app.disable("x-powered-by");

// Trust reverse proxy (Render, Vercel, Cloudflare) to accurately capture real client IP
app.set("trust proxy", 1);

// Baseline HTTP Security Headers using Helmet (MIA-SEC-007)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Handled by frontend Next.js CSP
  })
);

// HTTP Response Compression for Gzip / Deflate (Bandwidth optimization)
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses above 1KB
  })
);

// Whitelisted CORS configuration (MIA-SEC-007)
const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://mia2026.com",
  "https://www.mia2026.com",
  "https://multimediainaction.id",
  "https://www.multimediainaction.id",
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/+$/, "").toLowerCase())
  : [];

const allowedOrigins = Array.from(
  new Set([...defaultOrigins.map((o) => o.replace(/\/+$/, "").toLowerCase()), ...envOrigins])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, server-to-server, health check, mobile apps)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "").toLowerCase();

      // Check if origin is explicitly whitelisted, matches Vercel deployment, or in dev mode
      const isVercel = /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(normalizedOrigin);
      const isAllowed = allowedOrigins.includes(normalizedOrigin);

      if (isAllowed || isVercel || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy does not allow access from this origin."));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
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

// Logging: Skip endpoint /health agar tidak membanjiri log stdout
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    skip: (req) => req.url === "/health",
  })
);
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
