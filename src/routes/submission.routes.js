import { Router } from "express";
import {
  getSubmissions,
  getMySubmissions,
  getSubmission,
  createNewSubmission,
  updateExistingSubmission,
  deleteSubmissionById,
  updateSubmissionStatusById,
  updateSubmissionScoreFeedbackById,
} from "../controllers/submission.controller.js";
import {
  authenticateToken,
  isAdmin,
  isJuri,
} from "../middleware/jwtAuth.js";

const router = Router();

// Public routes
router.get("/:id", getSubmission);
router.get("/", getSubmissions);

// User routes (authenticated)
router.get("/my/submissions", authenticateToken, getMySubmissions);
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

// Juri & Admin routes (Fixes QA-05 by allowing both Admin and JURI roles to add scores/feedback)
router.patch(
  "/:id/score-feedback",
  authenticateToken,
  isJuri,
  updateSubmissionScoreFeedbackById
);

export default router;
