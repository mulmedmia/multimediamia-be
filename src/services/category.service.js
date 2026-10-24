import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";

const creatorUser = alias(schema.User, "creatorUser");
const updaterUser = alias(schema.User, "updaterUser");

// Get all categories with optional filtering
export const getAllCategories = async (filters = {}) => {
  const { page = 1, limit = 10, search, status } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.Category.slug, `%${search}%`),
        like(schema.Category.name, `%${search}%`),
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
      .select({
        Category: schema.Category,
        User: schema.User,
        creator: { name: creatorUser.name, email: creatorUser.email },
        updater: { name: updaterUser.name, email: updaterUser.email },
      })
      .from(schema.Category)
      .leftJoin(schema.User, eq(schema.Category.user_id, schema.User.users_id))
      .leftJoin(creatorUser, eq(schema.Category.created_by, creatorUser.users_id))
      .leftJoin(updaterUser, eq(schema.Category.updated_by, updaterUser.users_id))
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
    category_name: row.Category.name, // compatibility
    user: row.User ? { name: row.User.name, email: row.User.email } : null,
    created_by_name: row.creator?.name || row.Category.created_by || "-",
    updated_by_name: row.updater?.name || row.Category.updated_by || "-",
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
    .select({
      Category: schema.Category,
      User: schema.User,
      creator: { name: creatorUser.name, email: creatorUser.email },
      updater: { name: updaterUser.name, email: updaterUser.email },
    })
    .from(schema.Category)
    .leftJoin(schema.User, eq(schema.Category.user_id, schema.User.users_id))
    .leftJoin(creatorUser, eq(schema.Category.created_by, creatorUser.users_id))
    .leftJoin(updaterUser, eq(schema.Category.updated_by, updaterUser.users_id))
    .where(eq(schema.Category.category_id, id))
    .limit(1);

  if (!row) {
    throw new Error("Category not found");
  }

  return {
    ...row.Category,
    category_name: row.Category.name, // compatibility
    user: row.User ? { name: row.User.name, email: row.User.email } : null,
    created_by_name: row.creator?.name || row.Category.created_by || "-",
    updated_by_name: row.updater?.name || row.Category.updated_by || "-",
  };
};

// Create new category (admin only)
export const createCategory = async (categoryData, userId) => {
  // Ensure date objects
  if (categoryData.deadline) categoryData.deadline = new Date(categoryData.deadline);
  if (categoryData.preliminary_deadline) categoryData.preliminary_deadline = new Date(categoryData.preliminary_deadline);
  if (categoryData.final_deadline) categoryData.final_deadline = new Date(categoryData.final_deadline);

  if (!categoryData.deadline && categoryData.final_deadline) {
    categoryData.deadline = categoryData.final_deadline;
  }
  if (!categoryData.final_deadline && categoryData.deadline) {
    categoryData.final_deadline = categoryData.deadline;
  }
  if (!categoryData.preliminary_deadline) {
    categoryData.preliminary_deadline = categoryData.deadline || categoryData.final_deadline;
  }

  const newId = generateCuid();
  await db.insert(schema.Category).values({
    category_id: newId,
    slug: categoryData.slug,
    user_id: userId,
    name: categoryData.name,
    organizer: categoryData.organizer,
    description: categoryData.description,
    deadline: categoryData.deadline,
    preliminary_deadline: categoryData.preliminary_deadline,
    final_deadline: categoryData.final_deadline,
    batch_1_start: categoryData.batch_1_start ? new Date(categoryData.batch_1_start) : null,
    batch_1_end: categoryData.batch_1_end ? new Date(categoryData.batch_1_end) : null,
    batch_2_start: categoryData.batch_2_start ? new Date(categoryData.batch_2_start) : null,
    batch_2_end: categoryData.batch_2_end ? new Date(categoryData.batch_2_end) : null,
    is_submission_open: categoryData.is_submission_open !== undefined ? (categoryData.is_submission_open === true || categoryData.is_submission_open === "true") : true,
    allow_revision: categoryData.allow_revision !== undefined ? (categoryData.allow_revision === true || categoryData.allow_revision === "true") : false,
    image: categoryData.image,
    file_url: categoryData.file_url || null,
    whatsapp_group_url: categoryData.whatsapp_group_url || null,
    team_type: categoryData.team_type || "INDIVIDUAL",
    status: categoryData.status,
    created_by: userId,
    updated_by: userId,
  });

  return await getCategoryById(newId);
};

// Update existing category (admin only)
export const updateCategory = async (id, categoryData, userId = null) => {
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
  if (userId) {
    updatedData.updated_by = userId;
  }
  if (updatedData.deadline) updatedData.deadline = new Date(updatedData.deadline);
  if (updatedData.preliminary_deadline) updatedData.preliminary_deadline = new Date(updatedData.preliminary_deadline);
  if (updatedData.final_deadline) updatedData.final_deadline = new Date(updatedData.final_deadline);

  if (updatedData.batch_1_start === "" || updatedData.batch_1_start === null) updatedData.batch_1_start = null;
  else if (updatedData.batch_1_start) updatedData.batch_1_start = new Date(updatedData.batch_1_start);

  if (updatedData.batch_1_end === "" || updatedData.batch_1_end === null) updatedData.batch_1_end = null;
  else if (updatedData.batch_1_end) updatedData.batch_1_end = new Date(updatedData.batch_1_end);

  if (updatedData.batch_2_start === "" || updatedData.batch_2_start === null) updatedData.batch_2_start = null;
  else if (updatedData.batch_2_start) updatedData.batch_2_start = new Date(updatedData.batch_2_start);

  if (updatedData.batch_2_end === "" || updatedData.batch_2_end === null) updatedData.batch_2_end = null;
  else if (updatedData.batch_2_end) updatedData.batch_2_end = new Date(updatedData.batch_2_end);

  if (updatedData.final_deadline && !updatedData.deadline) {
    updatedData.deadline = updatedData.final_deadline;
  }

  if (updatedData.is_submission_open !== undefined) {
    updatedData.is_submission_open = updatedData.is_submission_open === true || updatedData.is_submission_open === "true";
  }
  if (updatedData.allow_revision !== undefined) {
    updatedData.allow_revision = updatedData.allow_revision === true || updatedData.allow_revision === "true";
  }
  if (updatedData.is_show_it_open !== undefined) {
    updatedData.is_show_it_open = updatedData.is_show_it_open === true || updatedData.is_show_it_open === "true";
  }
  if (updatedData.whatsapp_group_url === "") {
    updatedData.whatsapp_group_url = null;
  }

  await db
    .update(schema.Category)
    .set(updatedData)
    .where(eq(schema.Category.category_id, id));

  return await getCategoryById(id);
};

// Toggle submission open/close (admin only)
export const toggleCategorySubmission = async (id, options = {}, userId = null) => {
  const [existing] = await db
    .select()
    .from(schema.Category)
    .where(eq(schema.Category.category_id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Category not found");
  }

  const now = new Date();
  const preliminaryDeadline = existing.preliminary_deadline ? new Date(existing.preliminary_deadline) : (existing.deadline ? new Date(existing.deadline) : null);
  
  let newIsOpen;
  if (options.is_submission_open !== undefined) {
    newIsOpen = options.is_submission_open === true || options.is_submission_open === "true";
  } else {
    // If currently open, toggle to close; if closed, toggle to open
    newIsOpen = !existing.is_submission_open;
  }

  let newAllowRevision = existing.allow_revision;
  if (options.allow_revision !== undefined) {
    newAllowRevision = options.allow_revision === true || options.allow_revision === "true";
  } else if (newIsOpen && preliminaryDeadline && now > preliminaryDeadline) {
    // If admin is opening submission after preliminary deadline has passed, automatically activate revision phase!
    newAllowRevision = true;
  }

  const updateFields = {
    is_submission_open: newIsOpen,
    allow_revision: newAllowRevision,
    updated_at: new Date(),
  };
  if (userId) {
    updateFields.updated_by = userId;
  }

  await db
    .update(schema.Category)
    .set(updateFields)
    .where(eq(schema.Category.category_id, id));

  return await getCategoryById(id);
};

// Toggle Show It visibility for category (admin only)
export const toggleCategoryShowIt = async (id, options = {}, userId = null) => {
  const [existing] = await db
    .select()
    .from(schema.Category)
    .where(eq(schema.Category.category_id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Category not found");
  }

  let newIsOpen;
  if (options.is_show_it_open !== undefined) {
    newIsOpen = options.is_show_it_open === true || options.is_show_it_open === "true";
  } else {
    // If currently open, toggle to false; if closed, toggle to true
    newIsOpen = !existing.is_show_it_open;
  }

  const updateFields = {
    is_show_it_open: newIsOpen,
    updated_at: new Date(),
  };
  if (userId) {
    updateFields.updated_by = userId;
  }

  await db
    .update(schema.Category)
    .set(updateFields)
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
    const categoryRegistrations = await tx
      .select({ registration_id: schema.Registration.registration_id })
      .from(schema.Registration)
      .where(eq(schema.Registration.category_id, id));

    if (categoryRegistrations.length > 0) {
      const regIds = categoryRegistrations.map((r) => r.registration_id);
      await tx
        .delete(schema.Submission)
        .where(inArray(schema.Submission.registration_id, regIds));
    }

    await tx.delete(schema.Registration).where(eq(schema.Registration.category_id, id));
    await tx.delete(schema.Category).where(eq(schema.Category.category_id, id));
  });

  return true;
};
