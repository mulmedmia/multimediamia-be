import { Router } from "express";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";
import { register, login, requestOTP, verifyOtp, createJuri, deleteJuri, getAllJuri, getJuriById, assignJuriCategory, forgotPassword, verifyResetOtp, resetPassword } from "../controllers/auth.controller.js";
import { validateRegister, validateLogin, validateRequestOtp, validateVerifyOtp, validateForgotPassword, validateVerifyResetOtp, validateResetPassword } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", authLimiter, validateRegister, register);
router.post("/verify-otp", authLimiter, validateVerifyOtp, verifyOtp);
router.post("/request-otp", authLimiter, validateRequestOtp, requestOTP);
router.post("/login", authLimiter, validateLogin, login);

// Password Reset
router.post("/forgot-password", authLimiter, validateForgotPassword, forgotPassword);
router.post("/verify-reset-otp", authLimiter, validateVerifyResetOtp, verifyResetOtp);
router.post("/reset-password", authLimiter, validateResetPassword, resetPassword);

// juri 
router.post("/juri", authenticateToken, isAdmin, createJuri);
router.delete("/juri/:id", authenticateToken, isAdmin, deleteJuri);
router.get("/juri", authenticateToken, isAdmin, getAllJuri); // Get all juri
router.get("/juri/:id", authenticateToken, isAdmin, getJuriById); // Get juri by id
router.patch("/juri/:id/category", authenticateToken, isAdmin, assignJuriCategory); // Assign category to juri

export default router;
