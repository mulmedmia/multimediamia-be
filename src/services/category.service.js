import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc } from "drizzle-orm";
import { generateCuid } from "../db/cuid.js";

// Get all categories with optional filtering
export const getAllCategories = async (filters = {}) => {
  const { page = 1, limit = 10, search, status } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.Category.category_name, `%${search}%`),
        like(schema.Category.name, `%${search}%`),
        like(schema.Category.title, `%${search}%`),
        like(schema.Category.description, `%${search}%`)
      )
    );
  }

  if (status) {
    conditions.push(eq(schema.Category.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.Category)
      .leftJoin(schema.User, eq(schema.Category.user_id, schema.User.users_id))
      .where(whereClause)
      .orderBy(desc(schema.Category.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Category)
      .where(whereClause),
  ]);

  const categories = rows.map((row) => ({
    ...row.Category,
    user: row.User ? { name: row.User.name, email: row.User.email } : null,
  }));

  const total = Number(countResult?.count || 0);

  return {
    categories,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Get category by ID
export const getCategoryById = async (id) => {
  const [row] = await db
    .select()
    .from(schema.Category)
    .leftJoin(schema.User, eq(schema.Category.user_id, schema.User.users_id))
    .where(eq(schema.Category.category_id, id))
    .limit(1);

  if (!row) {
    throw new Error("Category not found");
  }

  return {
    ...row.Category,
    user: row.User ? { name: row.User.name, email: row.User.email } : null,
  };
};

// Create new category (admin only)
export const createCategory = async (categoryData, userId) => {
  // Ensure date objects
  if (categoryData.startDate) categoryData.startDate = new Date(categoryData.startDate);
  if (categoryData.endDate) categoryData.endDate = new Date(categoryData.endDate);
  if (categoryData.deadline) categoryData.deadline = new Date(categoryData.deadline);

  const newId = generateCuid();
  await db.insert(schema.Category).values({
    category_id: newId,
    category_name: categoryData.category_name,
    user_id: userId,
    name: categoryData.name,
    startDate: categoryData.startDate,
    endDate: categoryData.endDate,
    organizer: categoryData.organizer,
    title: categoryData.title,
    description: categoryData.description,
    deadline: categoryData.deadline,
    image: categoryData.image,
    file_url: categoryData.file_url || null,
    team_type: categoryData.team_type || "INDIVIDUAL",
    status: categoryData.status,
  });

  return await getCategoryById(newId);
};

// Update existing category (admin only)
export const updateCategory = async (id, categoryData) => {
  // Check if category exists
  const [existing] = await db
    .select()
    .from(schema.Category)
    .where(eq(schema.Category.category_id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Category not found");
  }

  // Ensure date objects if present
  const updatedData = { ...categoryData, updated_at: new Date() };
  if (updatedData.startDate) updatedData.startDate = new Date(updatedData.startDate);
  if (updatedData.endDate) updatedData.endDate = new Date(updatedData.endDate);
  if (updatedData.deadline) updatedData.deadline = new Date(updatedData.deadline);

  await db
    .update(schema.Category)
    .set(updatedData)
    .where(eq(schema.Category.category_id, id));

  return await getCategoryById(id);
};

// Delete category (admin only)
export const deleteCategory = async (id) => {
  // Check if category exists
  const [existing] = await db
    .select()
    .from(schema.Category)
    .where(eq(schema.Category.category_id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Category not found");
  }

  // Delete registrations and submissions inside transaction
  await db.transaction(async (tx) => {
    await tx.delete(schema.Registration).where(eq(schema.Registration.category_id, id));
    await tx.delete(schema.Submission).where(eq(schema.Submission.category_id, id));
    await tx.delete(schema.Category).where(eq(schema.Category.category_id, id));
  });

  return true;
};
