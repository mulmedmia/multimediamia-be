import { Router } from "express";
import {
  getProducts,
  getProduct,
  createNewProduct,
  updateExistingProduct,
  deleteProductById,
} from "../controllers/product.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";
import upload from "../lib/multer.js";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProduct);

// Admin-only routes with image upload
router.post(
  "/",
  authenticateToken,
  isAdmin,
  upload.single("image"),
  createNewProduct
);
router.patch(
  "/:id",
  authenticateToken,
  isAdmin,
  upload.single("image"),
  updateExistingProduct
);
router.delete("/:id", authenticateToken, isAdmin, deleteProductById);

export default router;
