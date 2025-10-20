import { Router } from "express";
import {
  getCategories,
  getCategory,
  createNewCategory,
  updateExistingCategory,
  deleteCategoryById,
  upload,
} from "../controllers/category.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategory);

// Admin-only routes (protected)
// Create category with image upload in one request
router.post(
  "/",
  authenticateToken,
  isAdmin,
  upload.single("image"),
  createNewCategory
);

// Update category with optional image upload using PATCH
router.patch(
  "/:id",
  authenticateToken,
  isAdmin,
  upload.single("image"),
  updateExistingCategory
);

// Delete category
router.delete("/:id", authenticateToken, isAdmin, deleteCategoryById);

export default router;


