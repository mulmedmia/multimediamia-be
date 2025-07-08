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

// Admin routes
router.get("/regular", getRegularUsersOnly);
router.get("/", authenticateToken, isAdmin, getUsers);
router.get("/:id", authenticateToken, isAdmin, getUserById);

export default router;