import { 
  updateUserPointsAndBadge, 
  getUserLeaderboard, 
  getUserStats,
  updateUserProfile,
  getKelasLeaderboard
} from "../services/gamification.service.js";
import { response } from "../utils/response.js";
import { updatePointsSchema, updateProfileSchema } from "../models/gamification.model.js";

// Update user points and badge (Admin/Mentor only)
export const updateUserPoints = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, badge } = req.body;

    // Validasi input
    const validation = updatePointsSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedUser = await updateUserPointsAndBadge(userId, validation.data);
    
    return response.success(
      res, 
      updatedUser, 
      "User points and badge updated successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update user points", 500, error.message);
  }
};

// Get leaderboard (Public)
export const getLeaderboard = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    const leaderboard = await getUserLeaderboard({
      limit: parseInt(limit),
      page: parseInt(page)
    });
    
    return response.success(
      res, 
      leaderboard, 
      "Leaderboard retrieved successfully"
    );
  } catch (error) {
    return response.error(res, "Failed to get leaderboard", 500, error.message);
  }
};

// Get user stats (User can see their own, Admin can see anyone's)
export const getUserStatistics = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.userId;
    const userRole = req.user.role;

    // Check authorization: user can only see their own stats, admin/mentor can see anyone's
    if (userRole !== "ADMIN" && userRole !== "MENTOR" && userId !== requesterId) {
      return response.error(res, "Forbidden: You can only view your own statistics", 403);
    }

    const stats = await getUserStats(userId);
    
    return response.success(
      res, 
      stats, 
      "User statistics retrieved successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to get user statistics", 500, error.message);
  }
};

// Get current user's profile with gamification data
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const stats = await getUserStats(userId);
    
    return response.success(
      res,
      stats,
      "Profile retrieved successfully"
    );
  } catch (error) {
    return response.error(res, "Failed to get profile", 500, error.message);
  }
};

// Update current user's profile (name, nim)
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, nim } = req.body;

    // Validasi input
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedUser = await updateUserProfile(userId, validation.data);
    
    return response.success(
      res,
      updatedUser,
      "Profile updated successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "NIM already taken by another user") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to update profile", 500, error.message);
  }
};

// Get leaderboard by kelas
export const getKelasLeaderboardController = async (req, res) => {
  try {
    const { kelasId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    const leaderboard = await getKelasLeaderboard(kelasId, {
      limit: parseInt(limit),
      page: parseInt(page)
    });
    
    return response.success(
      res, 
      leaderboard, 
      "Kelas leaderboard retrieved successfully"
    );
  } catch (error) {
    if (error.message === "Kelas not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to get kelas leaderboard", 500, error.message);
  }
};