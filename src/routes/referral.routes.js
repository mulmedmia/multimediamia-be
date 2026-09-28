import { Router } from "express";
import {
  checkReferralCode,
  generateReferralCode,
} from "../controllers/referral.controller.js";
import { authenticateToken, optionalAuth } from "../middleware/jwtAuth.js";

const router = Router();

// Validate referral code (optional auth to verify if current user is self-referring)
router.get("/validate", optionalAuth, checkReferralCode);

// Generate referral code for registration
router.post("/generate/:id", authenticateToken, generateReferralCode);

export default router;
