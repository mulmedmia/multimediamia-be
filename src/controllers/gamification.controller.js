import {
  updateUserPoints,
  redeemProduct,
  getAllRedeemUser,
  getMyRedeem,
} from "../services/gamification.service.js";
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
    return response.error(
      res,
      "Failed to update user points",
      500,
      error.message
    );
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

    return response.success(
      res,
      submissions,
      "Leaderboard retrieved successfully"
    );
  } catch (error) {
    return response.error(res, "Failed to get leaderboard", 500, error.message);
  }
};

// Redeem product (user)
export const redeemProductController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
      return response.validation(res, { productId: "Product ID is required" });
    }

    const result = await redeemProduct(userId, productId);

    return response.success(res, result, "Product redeemed successfully");
  } catch (error) {
    if (
      error.message === "User not found" ||
      error.message === "Product not found"
    ) {
      return response.error(res, error.message, 404);
    }
    if (
      error.message === "Insufficient points" ||
      error.message === "Product is out of stock" ||
      error.message === "Product is not active"
    ) {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to redeem product", 500, error.message);
  }
};

// Get all redemption history (admin only)
export const getAllRedeemUserController = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      user_id: req.query.user_id,
      product_id: req.query.product_id,
    };

    const result = await getAllRedeemUser(filters);
    return response.success(
      res,
      result,
      "All user redemption history retrieved successfully"
    );
  } catch (error) {
    return response.error(
      res,
      "Failed to get redemption history",
      500,
      error.message
    );
  }
};
// Get my redemption history
export const getMyRedeemController = async (req, res) => {
  try {
    const userId = req.user.userId;
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      product_id: req.query.product_id,
    };

    const result = await getMyRedeem(userId, filters);
    return response.success(
      res,
      result,
      "Your redemption history retrieved successfully"
    );
  } catch (error) {
    return response.error(
      res,
      "Failed to get your redemption history",
      500,
      error.message
    );
  }
};
