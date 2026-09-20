import { getUserProfile, updateUserProfile, getAllUsers, getRegularUsers } from "../services/user.service.js";
import { updateProfileSchema } from "../models/user.model.js";
import { response } from "../utils/response.js";
import { createOTP } from "../services/otp.service.js";

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userProfile = await getUserProfile(userId);
    
    return response.success(res, userProfile, "Profile retrieved successfully");
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to retrieve profile", 500, error.message);
  }
};

// Update current user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;

    // Validate input data
    const validation = updateProfileSchema.safeParse(updateData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedUser = await updateUserProfile(userId, validation.data, userId);

    // If email was changed, send OTP for verification
    let message = "Profile updated successfully";
    if (validation.data.email && validation.data.email !== updatedUser.email) {
      try {
        await createOTP(updatedUser.email);
        message = "Profile updated successfully. Please verify your new email address.";
      } catch (otpError) {
        console.error("Failed to send OTP:", otpError);
        message = "Profile updated successfully, but failed to send verification email.";
      }
    }

    return response.success(res, updatedUser, message);
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Email already registered") {
      return response.error(res, error.message, 400);
    }
    if (error.message === "NIM already registered") {
      return response.error(res, error.message, 400);
    }
    if (error.message === "Current password is incorrect") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to update profile", 500, error.message);
  }
};

// Get user profile by ID (admin only)
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const userProfile = await getUserProfile(userId);
    
    return response.success(res, userProfile, "User profile retrieved successfully");
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to retrieve user profile", 500, error.message);
  }
};

// Get all users (admin only)
export const getUsers = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      role: req.query.role,
    };

    const result = await getAllUsers(filters);
    
    return response.success(res, result, "Users retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to retrieve users", 500, error.message);
  }
};

// Get regular users only (role: USER)
export const getRegularUsersOnly = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
    };

    const result = await getRegularUsers(filters);
    
    return response.success(res, result, "Regular users retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to retrieve regular users", 500, error.message);
  }
};