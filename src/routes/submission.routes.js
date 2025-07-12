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

// User routes (authenticated)
router.get("/my/submissions", authenticateToken, getMySubmissions);
router.post("/", authenticateToken, createNewSubmission);
router.patch("/:id", authenticateToken, updateExistingSubmission);
router.delete("/:id", authenticateToken, deleteSubmissionById);

// Admin/Mentor routes
router.get("/", authenticateToken, getSubmissions);

// Admin only routes
router.patch(
  "/:id/status",
  authenticateToken,
  isAdmin,
  updateSubmissionStatusById
);

router.patch(
  "/:id/score-feedback",
  authenticateToken,
  isAdmin,
  updateSubmissionScoreFeedbackById
);

export default router;
