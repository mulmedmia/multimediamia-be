import { Router } from "express";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import registrationRoutes from "./registration.routes.js"; 


const router = Router();

router.use("/auth", authRoutes);    
router.use("/categories", categoryRoutes);
router.use("/registrations", registrationRoutes); 

export default router;