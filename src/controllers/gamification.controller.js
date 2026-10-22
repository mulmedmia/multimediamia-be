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
import { eq, and, sql, desc, or, ilike, asc } from "drizzle-orm";

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
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";

    // 1. Subquery: Compute true category rank for all verified teams in this category
    const rankedSubquery = db
      .select({
        registration_id: schema.Registration.registration_id,
        user_id: schema.Registration.user_id,
        category_id: schema.Registration.category_id,
        team_name: schema.Registration.team_name,
        team_members: schema.Registration.team_members,
        xp: schema.Registration.xp,
        diamond: schema.Registration.diamond,
        created_at: schema.Registration.created_at,
        user_name: sql`${schema.User.name}`.as("user_name"),
        category_name: sql`${schema.Category.name}`.as("category_name"),
        category_slug: sql`${schema.Category.slug}`.as("category_slug"),
        rank: sql`ROW_NUMBER() OVER (ORDER BY ${schema.Registration.xp} DESC, ${schema.Registration.diamond} DESC, ${schema.Registration.created_at} DESC)`.as("rank"),
      })
      .from(schema.Registration)
      .leftJoin(schema.User, eq(schema.Registration.user_id, schema.User.users_id))
      .leftJoin(schema.Category, eq(schema.Registration.category_id, schema.Category.category_id))
      .where(
        and(
          ...(category_id === "all"
            ? []
            : [eq(schema.Registration.category_id, category_id)]),
          eq(schema.Registration.is_verified, true),
        )
      )
      .as("ranked_leaderboard");

    // 2. Filter conditions for outer query (search by team name or user/leader name)
    const searchCondition = search
      ? or(
          ilike(rankedSubquery.team_name, `%${search}%`),
          ilike(rankedSubquery.user_name, `%${search}%`)
        )
      : undefined;

    const rowsQuery = db
      .select()
      .from(rankedSubquery);

    const countQuery = db
      .select({ count: sql`count(*)` })
      .from(rankedSubquery);

    if (searchCondition) {
      rowsQuery.where(searchCondition);
      countQuery.where(searchCondition);
    }

    const [rows, [countResult]] = await Promise.all([
      rowsQuery
        .orderBy(asc(rankedSubquery.rank))
        .limit(limit)
        .offset(skip),
      countQuery,
    ]);

    const total = Number(countResult?.count || 0);

    const leaderboard = rows.map((row) => ({
      rank: Number(row.rank),
      registration_id: row.registration_id,
      team_name: row.team_name,
      team_members: row.team_members,
      xp: Number(row.xp ?? 0),
      diamond: Number(row.diamond ?? 0),
      created_at: row.created_at,
      user: {
        name: row.user_name,
      },
      category: {
        category_id: row.category_id,
        name: row.category_name,
        category_name: row.category_name,
        slug: row.category_slug,
      },
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
      category_id: req.query.category_id,
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
