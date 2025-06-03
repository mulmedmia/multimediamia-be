import { Router } from "express";
import {
  updateUserPoints,
  getLeaderboard,
  getUserStatistics,
  getMyProfile,
  updateMyProfile
} from "../controllers/gamification.controller.js";
import { authenticateToken, isAdminOrMentor } from "../middleware/jwtAuth.js";

const router = Router();

// Public routes
router.get("/leaderboard", getLeaderboard);

// Protected routes - User can access their own data
router.get("/profile", authenticateToken, getMyProfile);
router.patch("/profile", authenticateToken, updateMyProfile);
router.put("/profile", authenticateToken, updateMyProfile); // Add PUT support
router.get("/stats/:userId", authenticateToken, getUserStatistics);

// Admin/Mentor only routes
router.patch("/users/:userId/points", authenticateToken, isAdminOrMentor, updateUserPoints);

export default router;