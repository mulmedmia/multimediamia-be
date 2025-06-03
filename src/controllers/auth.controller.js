import { registerUser, loginUser } from "../services/auth.service.js";
import { createOTP, verifyOTP } from "../services/otp.service.js";
import { response } from "../utils/response.js";
import prisma from "../config/prisma.js";

// New function to request OTP
export const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if email already exists before sending OTP
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return response.error(res, "Email already registered", 400);
    }
    
    // Generate and send OTP
    await createOTP(email);
    
    return response.success(
      res,
      { email },
      "OTP sent to your email",
      200
    );
  } catch (error) {
    return response.error(res, "Failed to send OTP", 500, error.message);
  }
};

// Modified register function to require OTP verification
export const register = async (req, res) => {
  try {
    const { email, otp, ...userData } = req.body;
    
    // Verify OTP
    const isOtpValid = await verifyOTP(email, otp);
    
    if (!isOtpValid) {
      return response.error(res, "Invalid or expired OTP", 400);
    }
    
    // Register user after OTP verification
    const user = await registerUser({ email, ...userData });
    
    return response.success(
      res,
      user,
      "User registered successfully",
      201
    );
  } catch (error) {
    if (error.message === "Email already registered") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to register user", 500, error.message);
  }
};

export const login = async (req, res) => {
  try {
    // Login user (validation happens in middleware)
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    
    return response.success(
      res,
      result,
      "Login successful"
    );
  } catch (error) {
    if (error.message === "User not found" || error.message === "Invalid password") {
      return response.error(res, "Invalid email or password", 401);
    }
    return response.error(res, "Failed to login", 500, error.message);
  }
};

// Di user.controller.js atau gamification.controller.js
export const updateUserPoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, badge } = req.body;

    const updatedUser = await updateUserPointsAndBadge(userId, { points, badge });
    
    return response.success(res, updatedUser, "User points and badge updated successfully");
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update user points", 500, error.message);
  }
};