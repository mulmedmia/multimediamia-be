import { Router } from "express";
import authRoutes from "./auth.routes.js";
import blogRoutes from "./blog.routes.js";
import categoryRoutes from "./category.routes.js";
import registrationRoutes from "./registration.routes.js"; 
import peminatanRoutes from "./peminatan.routes.js";
import kelasRoutes from "./kelas.routes.js"; // TAMBAHAN
import gamificationRoutes from "./gamification.routes.js"; // TAMBAHAN

const router = Router();

router.use("/auth", authRoutes);
router.use("/blogs", blogRoutes);
router.use("/categories", categoryRoutes);
router.use("/registrations", registrationRoutes); 
router.use("/peminatan", peminatanRoutes);
router.use("/kelas", kelasRoutes); // TAMBAHAN
router.use("/gamification", gamificationRoutes);

export default router;