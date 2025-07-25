import { Router } from "express";
import {
  getRegistrations,
  getRegistration,
  createNewRegistration,
  updateExistingRegistration,
  deleteRegistrationById,
  verifyRegistrationByAdmin,
  giveRegistrationFeedback,
  getMyRegistrations,
} from "../controllers/registration.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Public routes
router.get("/", getRegistrations);
router.get("/:id", getRegistration);

// User routes (must be authenticated)
router.get("/my-registrations", authenticateToken, getMyRegistrations);
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