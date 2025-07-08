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
  isAdmin,
  isAdminOrMentor,
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
router.get("/", authenticateToken, isAdminOrMentor, getSubmissions);

// Admin only routes
router.patch(
  "/:id/status",
  authenticateToken,
  isAdmin,
  updateSubmissionStatusById
);

export default router;
