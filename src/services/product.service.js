import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc, gte, lte } from "drizzle-orm";
import { generateCuid } from "../db/cuid.js";

// Get all products with filtering
export const getAllProducts = async (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    min_price,
    max_price,
    is_active,
  } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.product.name, `%${search}%`),
        like(schema.product.description, `%${search}%`)
      )
    );
  }

  if (min_price) {
    conditions.push(gte(schema.product.price, Number(min_price)));
  }

  if (max_price) {
    conditions.push(lte(schema.product.price, Number(max_price)));
  }

  if (is_active !== undefined) {
    conditions.push(eq(schema.product.is_active, is_active === "true"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [products, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.product)
      .where(whereClause)
      .orderBy(desc(schema.product.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.product)
      .where(whereClause),
  ]);

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
  const [product] = await db
    .select()
    .from(schema.product)
    .where(eq(schema.product.product_id, id))
    .limit(1);

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

// Create new product
export const createProduct = async (productData) => {
  const newId = generateCuid();
  
  const [product] = await db
    .insert(schema.product)
    .values({
      product_id: newId,
      name: productData.name,
      description: productData.description,
      price: Number(productData.price),
      image_url: productData.image_url,
      stock: productData.stock !== undefined ? Number(productData.stock) : 0,
      is_active: productData.is_active !== undefined ? productData.is_active : true,
    })
    .returning();

  return product;
};

// Update existing product
export const updateProduct = async (id, productData) => {
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
  if (updateFields.price !== undefined) updateFields.price = Number(updateFields.price);
  if (updateFields.stock !== undefined) updateFields.stock = Number(updateFields.stock);

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
