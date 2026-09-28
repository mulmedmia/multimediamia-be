import { Router } from "express";
import {
  getAdminReferrals,
  approveAdminReferral,
  rejectAdminReferral,
} from "../controllers/referral.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Apply auth & admin guard to all admin referral endpoints
router.use(authenticateToken, isAdmin);

// List all referral logs
router.get("/", getAdminReferrals);

// Approve (ACC) referral
router.post("/:id/approve", approveAdminReferral);

// Reject (Batal) referral
router.post("/:id/reject", rejectAdminReferral);

export default router;
