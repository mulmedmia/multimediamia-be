import { registerUser, loginUser, verifyUserOtp } from "../services/auth.service.js";
import { createOTP, verifyOTP } from "../services/otp.service.js";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { response } from "../utils/response.js";

// Register user and send OTP
export const register = async (req, res) => {
  try {
    const {name, email, password } = req.body;
    
    // Register user (will be unverified)
    const user = await registerUser({ name, email, password });
    
    // Generate and send OTP
    await createOTP(email);
    
    return response.success(
      res,
      {
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        otp_sent: true
      },
      "OTP sent to your email",
      201
    );
  } catch (error) {
    if (error.message === "Email already registered") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to register user", 500, error.message);
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Verify OTP
    const isOtpValid = await verifyOTP(email, otp);
    
    if (!isOtpValid) {
      return response.error(res, "Invalid or expired OTP", 400);
    }
    
    // Update user verification status
    const verifiedUser = await verifyUserOtp(email, otp);
    
    return response.success(
      res,
      {
        users_id: verifiedUser.users_id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        role: verifiedUser.role,
        is_verified: verifiedUser.is_verified
      },
      "OTP verified successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "User already verified") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to verify OTP", 500, error.message);
  }
};

// Request OTP (if user wants to resend)
export const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
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

export const login = async (req, res) => {
  try {
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
    if (error.message === "Please verify your email first") {
      return response.error(res, error.message, 401);
    }
    return response.error(res, "Failed to login", 500, error.message);
  }
};

// JURI: 
export const createJuri = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return response.error(res, "Name, email, and password are required", 400);
    }

    // Cek email sudah terdaftar
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return response.error(res, "Email already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const juri = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "JURI",
        is_verified: true,
      },
    });

    return response.success(res, {
      users_id: juri.users_id,
      name: juri.name,
      email: juri.email,
      role: juri.role,
    }, "JURI created successfully", 201);
  } catch (error) {
    return response.error(res, "Failed to create JURI", 500, error.message);
  }
};

// Hapus JURI (hanya admin)
export const deleteJuri = async (req, res) => {
  try {
    const { id } = req.params;
    // Pastikan user dengan id tsb adalah JURI
    const user = await prisma.user.findUnique({ where: { users_id: id } });
    if (!user || user.role !== "JURI") {
      return response.error(res, "JURI not found", 404);
    }
    await prisma.user.delete({ where: { users_id: id } });
    return response.success(res, null, "JURI deleted successfully");
  } catch (error) {
    return response.error(res, "Failed to delete JURI", 500, error.message);
  }
};