import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getUserById,
  getUsers,
  getRegularUsersOnly
} from "../controllers/user.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// User routes (authenticated users)
router.get("/profile", authenticateToken, getProfile);
router.patch("/profile", authenticateToken, updateProfile);

// Admin routes (Securing regular user directory endpoint - Fixes QA-03)
router.get("/regular", authenticateToken, isAdmin, getRegularUsersOnly);
router.get("/", authenticateToken, isAdmin, getUsers);
router.get("/:id", authenticateToken, isAdmin, getUserById);

export default router;