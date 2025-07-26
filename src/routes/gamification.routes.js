import { Router } from "express";
import {
  updateUserPointsController,
  getLeaderboardByCategory,
  redeemProductController,
  getAllRedeemUserController,
  getMyRedeemController, 
} from "../controllers/gamification.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Admin/Mentor only routes
router.patch(
  "/users/:userId/points",
  authenticateToken,
  isAdmin,
  updateUserPointsController
);
router.get("/:category_id", getLeaderboardByCategory);

// Admin only: get all redemption history
router.get(
  "/admin/redeem/all",
  authenticateToken,
  isAdmin,
  getAllRedeemUserController
);

// User redemption route
router.post("/redeem", authenticateToken, redeemProductController);

// User: get own redemption history
router.get("/redeem/my", authenticateToken, getMyRedeemController);

export default router;
