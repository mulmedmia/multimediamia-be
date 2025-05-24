import { Router } from "express";
import authRoutes from "./auth.routes.js";
import blogRoutes from "./blog.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/blogs", blogRoutes);

export default router;