import { Router } from "express";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";
import { register, login, requestOTP, verifyOtp, createJuri, deleteJuri } from "../controllers/auth.controller.js";
import { validateRegister, validateLogin, validateRequestOtp, validateVerifyOtp } from "../middleware/auth.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/verify-otp", validateVerifyOtp, verifyOtp);
router.post("/request-otp", validateRequestOtp, requestOTP);
router.post("/login", validateLogin, login);

// juri 
router.post("/juri", authenticateToken, isAdmin, createJuri);
router.delete("/juri/:id", authenticateToken, isAdmin, deleteJuri);

export default router;  