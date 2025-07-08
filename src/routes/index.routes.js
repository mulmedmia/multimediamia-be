import { Router } from "express";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import registrationRoutes from "./registration.routes.js";
import userRoutes from "./user.routes.js";
import submissionRoutes from "./submission.routes.js";
import productRoutes from "./product.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/registrations", registrationRoutes);
router.use("/users", userRoutes);
router.use("/submissions", submissionRoutes);
router.use("/products", productRoutes);

export default router;