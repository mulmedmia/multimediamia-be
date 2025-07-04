import { Router } from "express";
import { register, login, requestOTP, verifyOtp } from "../controllers/auth.controller.js";
import { validateRegister, validateLogin, validateRequestOtp, validateVerifyOtp } from "../middleware/auth.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/verify-otp", validateVerifyOtp, verifyOtp);
router.post("/request-otp", validateRequestOtp, requestOTP);
router.post("/login", validateLogin, login);

export default router;  