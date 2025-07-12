import { updateUserPoints } from "../services/gamification.service.js";
import { response } from "../utils/response.js";
import prisma from "../config/prisma.js";

// Update user points (Admin)
export const updateUserPointsController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points } = req.body;

    // Validasi input
    if (typeof points !== "number") {
      return response.validation(res, { points: "Points must be a number" });
    }

    const updatedUser = await updateUserPoints(userId, points);

    return response.success(
      res,
      updatedUser,
      "User points updated successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update user points", 500, error.message);
  }
};

// Get leaderboard by category
export const getLeaderboardByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const { limit = 10 } = req.query;

    // Ambil submission dengan score terbesar, hanya yang sudah diverifikasi
    const submissions = await prisma.submission.findMany({
      where: {
        category_id,
        is_verified: true,
        score: { not: null },
      },
      orderBy: {
        score: "desc",
      },
      take: Number(limit),
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { category_name: true, name: true } },
      },
    });

    return response.success(res, submissions, "Leaderboard retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to get leaderboard", 500, error.message);
  }
};