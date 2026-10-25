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
import upload from "../lib/multer.js";

const handleThumbnailUpload = (req, res, next) => {
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to process thumbnail file",
      });
    }
    next();
  });
};

const router = Router();

// User routes (authenticated)
router.get("/my/submissions", authenticateToken, getMySubmissions);

// Public / visitor routes (with optional auth to detect Admin / Juri)
router.get("/", optionalAuth, getSubmissions);
router.get("/:id", optionalAuth, getSubmission);

// User CRUD routes (authenticated)
router.post("/", authenticateToken, handleThumbnailUpload, createNewSubmission);
router.patch("/:id", authenticateToken, handleThumbnailUpload, updateExistingSubmission);
router.delete("/:id", authenticateToken, deleteSubmissionById);


// Admin only routes
router.patch(
  "/:id/status",
  authenticateToken,
  isAdmin,
  updateSubmissionStatusById
);

export default router;
