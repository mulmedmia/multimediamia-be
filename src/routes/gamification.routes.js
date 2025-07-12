import { Router } from "express";
import {
  updateUserPointsController,
  getLeaderboardByCategory
} from "../controllers/gamification.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Admin/Mentor only routes
router.patch("/users/:userId/points", authenticateToken, isAdmin, updateUserPointsController);
router.get("/:category_id", getLeaderboardByCategory);
export default router;  