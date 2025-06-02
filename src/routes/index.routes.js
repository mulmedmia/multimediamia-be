import { Router } from "express";
import authRoutes from "./auth.routes.js";
import blogRoutes from "./blog.routes.js";
import categoryRoutes from "./category.routes.js";
import registrationRoutes from "./registration.routes.js"; 
import peminatanRoutes from "./peminatan.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/blogs", blogRoutes);
router.use("/categories", categoryRoutes);
router.use("/registrations", registrationRoutes); 
router.use("/peminatan", peminatanRoutes);

export default router;