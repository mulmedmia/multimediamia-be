import { Router } from "express";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import registrationRoutes from "./registration.routes.js";
import userRoutes from "./user.routes.js";
import submissionRoutes from "./submission.routes.js";
import productRoutes from "./product.routes.js";
import gamificationRoutes from "./gamification.routes.js";
import adminMissionRoutes from "./admin-mission.routes.js";
import participantMissionRoutes from "./participant-mission.routes.js";
import settingRoutes from "./setting.routes.js";
import referralRoutes from "./referral.routes.js";
import adminReferralRoutes from "./admin-referral.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/registrations", registrationRoutes);
router.use("/users", userRoutes);
router.use("/submissions", submissionRoutes);
router.use("/products", productRoutes);
router.use("/gamification", gamificationRoutes);
router.use("/admin/missions", adminMissionRoutes);
router.use("/missions", participantMissionRoutes);
router.use("/settings", settingRoutes);
router.use("/referrals", referralRoutes);
router.use("/admin/referrals", adminReferralRoutes);

export default router;