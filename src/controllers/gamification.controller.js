import {
  updateUserPoints,
  updateRegistrationGamification,
  redeemProduct,
  getAllRedeemUser,
  getMyRedeem,
} from "../services/gamification.service.js";
import { response } from "../utils/response.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";

// Update user points (Admin - legacy compatibility)
export const updateUserPointsController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points } = req.body;

    // Validasi input
    if (typeof points !== "number") {
      return response.validation(res, { points: "Points must be a number" });
    }

    const updatedUser = await updateUserPoints(userId, points, req.user?.userId);

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

// Update registration gamification (Diamond & XP) by Admin
export const updateRegistrationGamificationController = async (req, res) => {
  try {
    const registrationId = req.params.registrationId || req.params.id;
    const rawDiamond =
      req.body.diamond !== undefined
        ? req.body.diamond
        : req.body.points !== undefined
        ? req.body.points
        : undefined;
    const rawXp = req.body.xp;

    if (rawDiamond === undefined && rawXp === undefined) {
      return response.validation(res, {
        message: "At least diamond or xp must be provided",
      });
    }

    if (rawDiamond !== undefined) {
      const numDiamond = Number(rawDiamond);
      if (isNaN(numDiamond) || numDiamond < 0) {
        return response.validation(res, {
          diamond: "Diamond must be a non-negative number",
        });
      }
    }

    if (rawXp !== undefined) {
      const numXp = Number(rawXp);
      if (isNaN(numXp) || numXp < 0) {
        return response.validation(res, {
          xp: "XP must be a non-negative number",
        });
      }
    }

    const updated = await updateRegistrationGamification(
      registrationId,
      {
        diamond: rawDiamond !== undefined ? Number(rawDiamond) : undefined,
        xp: rawXp !== undefined ? Number(rawXp) : undefined,
      },
      req.user?.userId
    );

    return response.success(
      res,
      updated,
      "Gamifikasi tim (Diamond & XP) berhasil diperbarui"
    );
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(
      res,
      "Gagal memperbarui gamifikasi tim",
      500,
      error.message
    );
  }
};

// Get leaderboard by category (Ranked by XP only with pagination)
export const getLeaderboardByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const whereClause = and(
      eq(schema.Registration.category_id, category_id),
      eq(schema.Registration.is_verified, true)
    );

    const [rows, [countResult]] = await Promise.all([
      db
        .select({
          registration: schema.Registration,
          user: {
            users_id: schema.User.users_id,
            name: schema.User.name,
            email: schema.User.email,
          },
          category: {
            category_id: schema.Category.category_id,
            name: schema.Category.name,
            category_name: schema.Category.name,
            slug: schema.Category.slug,
          },
        })
        .from(schema.Registration)
        .leftJoin(schema.User, eq(schema.Registration.user_id, schema.User.users_id))
        .leftJoin(schema.Category, eq(schema.Registration.category_id, schema.Category.category_id))
        .where(whereClause)
        .orderBy(desc(schema.Registration.xp), desc(schema.Registration.diamond), desc(schema.Registration.created_at))
        .limit(limit)
        .offset(skip),
      db
        .select({ count: sql`count(*)` })
        .from(schema.Registration)
        .where(whereClause),
    ]);

    const total = Number(countResult?.count || 0);

    const leaderboard = rows.map((row, index) => ({
      rank: skip + index + 1,
      registration_id: row.registration.registration_id,
      team_name: row.registration.team_name,
      team_members: row.registration.team_members,
      xp: Number(row.registration.xp ?? 0),
      diamond: Number(row.registration.diamond ?? 0),
      created_at: row.registration.created_at,
      user: row.user,
      category: row.category,
    }));

    return response.success(
      res,
      {
        leaderboard,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
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
    const { productId, quantity, categoryId, registrationId } = req.body;

    if (!productId) {
      return response.validation(res, { productId: "Product ID is required" });
    }

    const qty = quantity !== undefined ? Number(quantity) : 1;
    if (!Number.isInteger(qty) || qty < 1) {
      return response.validation(res, { quantity: "Quantity must be a positive integer" });
    }

    const result = await redeemProduct(userId, productId, qty, categoryId, registrationId);

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
      error.message === "Product is not active" ||
      error.message.includes("1 kali") ||
      error.message.includes("hanya dapat di-redeem")
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
      category_id: req.query.category_id,
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
