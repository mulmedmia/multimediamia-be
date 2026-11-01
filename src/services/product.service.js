import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, gte, lte, isNull, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";

const creatorUser = alias(schema.User, "creatorUser");
const updaterUser = alias(schema.User, "updaterUser");

// Get all products with filtering
export const getAllProducts = async (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    category_id,
    exact,
    min_price,
    max_price,
    is_active,
  } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [];

  if (category_id) {
    if (category_id.toLowerCase() === "global") {
      conditions.push(isNull(schema.product.category_id));
    } else if (category_id.toLowerCase() === "all") {
      // All categories, no filter
    } else if (exact === "true" || exact === true) {
      conditions.push(eq(schema.product.category_id, category_id));
    } else {
      // Include products specifically for this category AND global products
      conditions.push(
        or(
          eq(schema.product.category_id, category_id),
          isNull(schema.product.category_id)
        )
      );
    }
  }

  if (search) {
    conditions.push(
      or(
        like(schema.product.name, `%${search}%`),
        like(schema.product.description, `%${search}%`)
      )
    );
  }

  if (min_price) {
    conditions.push(gte(schema.product.price_diamond, Number(min_price)));
  }

  if (max_price) {
    conditions.push(lte(schema.product.price_diamond, Number(max_price)));
  }

  if (is_active !== undefined) {
    conditions.push(eq(schema.product.is_active, is_active === "true"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countResult]] = await Promise.all([
    db
      .select({
        product: schema.product,
        category: schema.Category,
        creator: { name: creatorUser.name, email: creatorUser.email },
        updater: { name: updaterUser.name, email: updaterUser.email },
      })
      .from(schema.product)
      .leftJoin(schema.Category, eq(schema.product.category_id, schema.Category.category_id))
      .leftJoin(creatorUser, eq(schema.product.created_by, creatorUser.users_id))
      .leftJoin(updaterUser, eq(schema.product.updated_by, updaterUser.users_id))
      .where(whereClause)
      .orderBy(asc(schema.product.name))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.product)
      .where(whereClause),
  ]);

  const products = rows.map((row) => ({
    ...row.product,
    category: row.category
      ? {
          category_id: row.category.category_id,
          name: row.category.name,
          category_name: row.category.name,
          slug: row.category.slug,
        }
      : null,
    created_by_name: row.creator?.name || row.product.created_by || "-",
    updated_by_name: row.updater?.name || row.product.updated_by || "-",
  }));

  const total = Number(countResult?.count || 0);

  return {
    products,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Get product by ID
export const getProductById = async (id) => {
  const [row] = await db
    .select({
      product: schema.product,
      category: schema.Category,
      creator: { name: creatorUser.name, email: creatorUser.email },
      updater: { name: updaterUser.name, email: updaterUser.email },
    })
    .from(schema.product)
    .leftJoin(schema.Category, eq(schema.product.category_id, schema.Category.category_id))
    .leftJoin(creatorUser, eq(schema.product.created_by, creatorUser.users_id))
    .leftJoin(updaterUser, eq(schema.product.updated_by, updaterUser.users_id))
    .where(eq(schema.product.product_id, id))
    .limit(1);

  if (!row) {
    throw new Error("Product not found");
  }

  return {
    ...row.product,
    category: row.category
      ? {
          category_id: row.category.category_id,
          name: row.category.name,
          category_name: row.category.name,
          slug: row.category.slug,
        }
      : null,
    created_by_name: row.creator?.name || row.product.created_by || "-",
    updated_by_name: row.updater?.name || row.product.updated_by || "-",
  };
};

// Create new product
export const createProduct = async (productData, userId = null) => {
  const newId = generateCuid();
  
  const [product] = await db
    .insert(schema.product)
    .values({
      product_id: newId,
      category_id:
        !productData.category_id ||
        productData.category_id === "ALL" ||
        productData.category_id === "all"
          ? null
          : productData.category_id,
      name: productData.name,
      description: productData.description,
      price_diamond: Number(productData.price_diamond || 0),
      price_xp: productData.price_xp !== undefined ? Number(productData.price_xp) : 0,
      image_url: productData.image_url,
      stock: productData.stock !== undefined ? Number(productData.stock) : 0,
      reward_xp:
        Number(productData.price_xp) > 0
          ? 0
          : productData.reward_xp !== undefined
          ? Number(productData.reward_xp)
          : 0,
      is_unlimited_stock: productData.is_unlimited_stock !== undefined ? Boolean(productData.is_unlimited_stock) : false,
      max_redeem_per_team:
        productData.max_redeem_per_team !== undefined
          ? Math.max(0, parseInt(productData.max_redeem_per_team, 10) || 0)
          : productData.is_single_redeem
          ? 1
          : 0,
      is_active: productData.is_active !== undefined ? productData.is_active : true,
      created_by: userId || null,
      updated_by: userId || null,
    })
    .returning();

  return product;
};

// Update existing product
export const updateProduct = async (id, productData, userId = null) => {
  // Check if product exists
  const [existing] = await db
    .select()
    .from(schema.product)
    .where(eq(schema.product.product_id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Product not found");
  }

  const updateFields = { ...productData, updated_at: new Date() };
  if (userId) {
    updateFields.updated_by = userId;
  }
  if (updateFields.category_id !== undefined) {
    updateFields.category_id =
      !updateFields.category_id ||
      updateFields.category_id === "ALL" ||
      updateFields.category_id === "all"
        ? null
        : updateFields.category_id;
  }
  if (updateFields.price_diamond !== undefined) {
    updateFields.price_diamond = Number(updateFields.price_diamond);
  }
  delete updateFields.price;
  if (updateFields.price_xp !== undefined) {
    updateFields.price_xp = Number(updateFields.price_xp);
    if (updateFields.price_xp > 0) {
      updateFields.reward_xp = 0;
    }
  } else if (Number(existing.price_xp) > 0 && updateFields.reward_xp !== undefined && Number(updateFields.reward_xp) > 0) {
    throw new Error("Produk dengan harga XP tidak dapat memiliki reward XP.");
  }
  if (updateFields.stock !== undefined) updateFields.stock = Number(updateFields.stock);
  if (updateFields.reward_xp !== undefined) updateFields.reward_xp = Number(updateFields.reward_xp);
  if (updateFields.is_unlimited_stock !== undefined) updateFields.is_unlimited_stock = Boolean(updateFields.is_unlimited_stock);
  if (updateFields.max_redeem_per_team !== undefined) {
    updateFields.max_redeem_per_team = Math.max(0, parseInt(updateFields.max_redeem_per_team, 10) || 0);
  } else if (updateFields.is_single_redeem !== undefined) {
    updateFields.max_redeem_per_team = updateFields.is_single_redeem ? 1 : 0;
  }
  delete updateFields.is_single_redeem;

  const [updatedProduct] = await db
    .update(schema.product)
    .set(updateFields)
    .where(eq(schema.product.product_id, id))
    .returning();

  return updatedProduct;
};

// Delete product
export const deleteProduct = async (id) => {
  // Check if product exists
  const [existing] = await db
    .select()
    .from(schema.product)
    .where(eq(schema.product.product_id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Product not found");
  }

  // Use transaction to delete related redemptions first, then the product
  await db.transaction(async (tx) => {
    // Delete all redemptions associated with this product
    await tx.delete(schema.Redemption).where(eq(schema.Redemption.product_id, id));

    // Now delete the product
    await tx.delete(schema.product).where(eq(schema.product.product_id, id));
  });

  return true;
};
