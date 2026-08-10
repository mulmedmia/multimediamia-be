import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import router from "./src/routes/index.routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 100, // Higher limit for test environment
  message: "Too many requests from this IP, please try again later.",
});

app.use(limiter);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

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

export default app;
