import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

// Define your routes here
router.use("/auth", authRoutes);
