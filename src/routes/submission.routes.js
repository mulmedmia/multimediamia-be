import { Router } from "express";
import {
  getSubmissions,
  getMySubmissions,
  getSubmission,
  createNewSubmission,
  updateExistingSubmission,
  deleteSubmissionById,
  updateSubmissionStatusById,
} from "../controllers/submission.controller.js";
import {
  authenticateToken,
  optionalAuth,
  isAdmin,
} from "../middleware/jwtAuth.js";

const router = Router();

// User routes (authenticated)
router.get("/my/submissions", authenticateToken, getMySubmissions);

// Public / visitor routes (with optional auth to detect Admin / Juri)
router.get("/", optionalAuth, getSubmissions);
router.get("/:id", optionalAuth, getSubmission);

// User CRUD routes (authenticated)
router.post("/", authenticateToken, createNewSubmission);
router.patch("/:id", authenticateToken, updateExistingSubmission);
router.delete("/:id", authenticateToken, deleteSubmissionById);


// Admin only routes
router.patch(
  "/:id/status",
  authenticateToken,
  isAdmin,
  updateSubmissionStatusById
);

export default router;
