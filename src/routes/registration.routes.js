import { Router } from "express";
import {
  getRegistrations,
  getRegistration,
  createNewRegistration,
  updateExistingRegistration,
  deleteRegistrationById,
  verifyRegistrationByAdmin,
  giveRegistrationFeedback,
  checkTeamNameAvailabilityController,
  verifyRegistrationByFinanceController,
  getRegistrationStatsController,
} from "../controllers/registration.controller.js";
import { authenticateToken, isAdmin, isAdminOrFinance } from "../middleware/jwtAuth.js";
import { generateReferralCode } from "../controllers/referral.controller.js";

const router = Router();

// Check team name availability (must be placed before /:id)
router.get("/check-team-name", authenticateToken, checkTeamNameAvailabilityController);

// Registration summary statistics (Admin & Finance only, must be placed before /:id)
router.get("/stats", authenticateToken, isAdminOrFinance, getRegistrationStatsController);

// Get routes (authenticated users can fetch registrations; non-admin users get automatically filtered to their own registrations)
router.get("/", authenticateToken, getRegistrations);
router.get("/:id", authenticateToken, getRegistration);

// User routes (must be authenticated)
router.post("/", authenticateToken, createNewRegistration);
router.post("/:id/generate-referral-code", authenticateToken, generateReferralCode);
router.patch("/:id", authenticateToken, updateExistingRegistration);
router.delete("/:id", authenticateToken, deleteRegistrationById);

// Admin only: verify registration
router.patch("/:id/verify", authenticateToken, isAdmin, verifyRegistrationByAdmin);

// Finance & Admin: verify registration payment
router.patch("/:id/verify-finance", authenticateToken, isAdminOrFinance, verifyRegistrationByFinanceController);

// PATCH feedback (admin only)
router.patch(
  "/:id/feedback",
  authenticateToken,
  isAdmin,
  giveRegistrationFeedback
);

export default router;