import { Router } from "express";
import { register, login, requestOTP } from "../controllers/auth.controller.js";
import { validateRegister, validateLogin, validateRequestOtp } from "../middleware/auth.js";

const router = Router();

router.post("/request-otp", validateRequestOtp, requestOTP);
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);

export default router;