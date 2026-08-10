import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc } from "drizzle-orm";
import { generateCuid } from "../db/cuid.js";

// Update user points (Admin/Mentor only)
export const updateUserPoints = async (userId, pointsToAdd) => {
  // Cari user
  const [user] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.users_id, userId))
    .limit(1);
    
  if (!user) throw new Error("User not found");

  const newPoints = user.points + pointsToAdd;

  // Update points
  const [updated] = await db
    .update(schema.User)
    .set({ points: newPoints, updated_at: new Date() })
    .where(eq(schema.User.users_id, userId))
    .returning();

  return {
    users_id: updated.users_id,
    name: updated.name,
    email: updated.email,
    points: updated.points,
    role: updated.role,
  };
};

// Redeem product with points (with Atomic decrement to prevent race conditions - Fixes QA-04)
export const redeemProduct = async (userId, productId) => {
  // Ambil user dan produk
  const [user] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.users_id, userId))
    .limit(1);
    
  if (!user) throw new Error("User not found");

  const [product] = await db
    .select()
    .from(schema.product)
    .where(eq(schema.product.product_id, productId))
    .limit(1);
    
  if (!product) throw new Error("Product not found");

  if (!product.is_active) throw new Error("Product is not active");
  if (product.stock <= 0) throw new Error("Product is out of stock");

  // Pastikan poin cukup
  if (user.points < product.price) throw new Error("Insufficient points");

  const redemptionId = generateCuid();

  // Kurangi poin user dan stok produk atomically
  await db.transaction(async (tx) => {
    // Update user points atomically
    await tx
      .update(schema.User)
      .set({ points: sql`${schema.User.points} - ${product.price}`, updated_at: new Date() })
      .where(eq(schema.User.users_id, userId));

    // Update product stock atomically
    await tx
      .update(schema.product)
      .set({ stock: sql`${schema.product.stock} - 1`, updated_at: new Date() })
      .where(eq(schema.product.product_id, productId));

    // Create redemption record
    await tx
      .insert(schema.Redemption)
      .values({
        redemption_id: redemptionId,
        user_id: userId,
        product_id: productId,
        points_used: Math.round(product.price),
      });
  });

  // Re-fetch updated structures
  const [updatedUser] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.users_id, userId))
    .limit(1);

  const [updatedProduct] = await db
    .select()
    .from(schema.product)
    .where(eq(schema.product.product_id, productId))
    .limit(1);

  return {
    user: {
      users_id: updatedUser.users_id,
      name: updatedUser.name,
      email: updatedUser.email,
      points: updatedUser.points,
    },
    product: {
      product_id: updatedProduct.product_id,
      name: updatedProduct.name,
      stock: updatedProduct.stock,
    },
    redemption_id: redemptionId,
  };
};

// Get all redemption history (admin only)
export const getAllRedeemUser = async (filters = {}) => {
  const { page = 1, limit = 10, search, user_id, product_id } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [];

  if (user_id) conditions.push(eq(schema.Redemption.user_id, user_id));
  if (product_id) conditions.push(eq(schema.Redemption.product_id, product_id));

  if (search) {
    conditions.push(
      or(
        like(schema.User.name, `%${search}%`),
        like(schema.product.name, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.Redemption)
      .leftJoin(schema.User, eq(schema.Redemption.user_id, schema.User.users_id))
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .where(whereClause)
      .orderBy(desc(schema.Redemption.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Redemption)
      .leftJoin(schema.User, eq(schema.Redemption.user_id, schema.User.users_id))
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .where(whereClause),
  ]);

  const redemptions = rows.map((row) => ({
    ...row.Redemption,
    user: row.User ? { users_id: row.User.users_id, name: row.User.name, email: row.User.email } : null,
    product: row.product ? { product_id: row.product.product_id, name: row.product.name, price: row.product.price } : null,
  }));

  const total = Number(countResult?.count || 0);

  return {
    redemptions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Get user's own redemption history
export const getMyRedeem = async (userId, filters = {}) => {
  const { page = 1, limit = 10, search, product_id } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [eq(schema.Redemption.user_id, userId)];
  if (product_id) conditions.push(eq(schema.Redemption.product_id, product_id));

  if (search) {
    conditions.push(like(schema.product.name, `%${search}%`));
  }

  const whereClause = and(...conditions);

  const [rows, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.Redemption)
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .where(whereClause)
      .orderBy(desc(schema.Redemption.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Redemption)
      .leftJoin(schema.product, eq(schema.Redemption.product_id, schema.product.product_id))
      .where(whereClause),
  ]);

  const redemptions = rows.map((row) => ({
    ...row.Redemption,
    product: row.product ? { product_id: row.product.product_id, name: row.product.name, price: row.product.price } : null,
  }));

  const total = Number(countResult?.count || 0);

  return {
    redemptions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};