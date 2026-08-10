import { Router } from "express";
import {
  getRegistrations,
  getRegistration,
  createNewRegistration,
  updateExistingRegistration,
  deleteRegistrationById,
  verifyRegistrationByAdmin,
  giveRegistrationFeedback,
} from "../controllers/registration.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Get routes (authenticated users can fetch registrations; non-admin users get automatically filtered to their own registrations)
router.get("/", authenticateToken, getRegistrations);
router.get("/:id", authenticateToken, getRegistration);

// User routes (must be authenticated)
router.post("/", authenticateToken, createNewRegistration);
router.patch("/:id", authenticateToken, updateExistingRegistration);
router.delete("/:id", authenticateToken, deleteRegistrationById);

// Admin only: verify registration
router.patch("/:id/verify", authenticateToken, isAdmin, verifyRegistrationByAdmin);

// PATCH feedback (admin only)
router.patch(
  "/:id/feedback",
  authenticateToken,
  isAdmin,
  giveRegistrationFeedback
);

export default router;