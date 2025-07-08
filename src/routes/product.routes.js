import { Router } from "express";
import {
  getProducts,
  getProduct,
  createNewProduct,
  updateExistingProduct,
  deleteProductById,
} from "../controllers/product.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProduct);

// Admin-only routes (protected)
router.post("/", authenticateToken, isAdmin, createNewProduct);
router.patch("/:id", authenticateToken, isAdmin, updateExistingProduct);
router.delete("/:id", authenticateToken, isAdmin, deleteProductById);

export default router;