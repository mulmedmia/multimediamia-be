import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc, asc, ilike, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";

const creatorUser = alias(schema.User, "creatorUser");
const updaterUser = alias(schema.User, "updaterUser");

// Get all registrations with filtering
export const getAllRegistrations = async (filters = {}) => {
  const { category_id, user_id, is_verified, search, sort_by, order } = filters;
  const safePage = Math.max(1, parseInt(filters.page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;

  const conditions = [];
  
  if (category_id) {
    conditions.push(eq(schema.Registration.category_id, category_id));
  }
  
  if (user_id) {
    conditions.push(eq(schema.Registration.user_id, user_id));
  }
  
  if (is_verified !== undefined) {
    conditions.push(eq(schema.Registration.is_verified, is_verified === "true" || is_verified === true));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(schema.User.name, searchPattern),
        ilike(schema.User.email, searchPattern),
        ilike(schema.Registration.team_name, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderByClause = desc(schema.Registration.created_at);
  if (sort_by === "diamond") {
    orderByClause = order === "asc" ? asc(schema.Registration.diamond) : desc(schema.Registration.diamond);
  } else if (sort_by === "xp") {
    orderByClause = order === "asc" ? asc(schema.Registration.xp) : desc(schema.Registration.xp);
  }

  const [rows, [countResult]] = await Promise.all([
    db
      .select({
        Registration: schema.Registration,
        User: schema.User,
        Category: schema.Category,
        creator: { name: creatorUser.name, email: creatorUser.email },
        updater: { name: updaterUser.name, email: updaterUser.email },
      })
      .from(schema.Registration)
      .leftJoin(schema.User, eq(schema.Registration.user_id, schema.User.users_id))
      .leftJoin(schema.Category, eq(schema.Registration.category_id, schema.Category.category_id))
      .leftJoin(creatorUser, eq(schema.Registration.created_by, creatorUser.users_id))
      .leftJoin(updaterUser, eq(schema.Registration.updated_by, updaterUser.users_id))
      .where(whereClause)
      .orderBy(orderByClause, desc(schema.Registration.created_at))
      .limit(safeLimit)
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Registration)
      .leftJoin(schema.User, eq(schema.Registration.user_id, schema.User.users_id))
      .leftJoin(schema.Category, eq(schema.Registration.category_id, schema.Category.category_id))
      .where(whereClause),
  ]);

  const registrations = rows.map((row) => ({
    ...row.Registration,
    user: row.User ? { name: row.User.name, email: row.User.email } : null,
    category: row.Category
      ? {
          category_id: row.Category.category_id,
          name: row.Category.name,
          slug: row.Category.slug,
          category_name: row.Category.name,
          team_type: row.Category.team_type,
          deadline: row.Category.deadline,
          preliminary_deadline: row.Category.preliminary_deadline,
          final_deadline: row.Category.final_deadline,
          is_submission_open: row.Category.is_submission_open,
          allow_revision: row.Category.allow_revision,
          whatsapp_group_url: row.Category.whatsapp_group_url,
        }
      : null,
    created_by_name: row.creator?.name || row.Registration.created_by || "-",
    updated_by_name: row.updater?.name || row.Registration.updated_by || "-",
  }));

  const total = Number(countResult?.count || 0);

  return {
    registrations,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// Get registration by ID
export const getRegistrationById = async (id) => {
  const [row] = await db
    .select({
      Registration: schema.Registration,
      User: schema.User,
      Category: schema.Category,
      creator: { name: creatorUser.name, email: creatorUser.email },
      updater: { name: updaterUser.name, email: updaterUser.email },
    })
    .from(schema.Registration)
    .leftJoin(schema.User, eq(schema.Registration.user_id, schema.User.users_id))
    .leftJoin(schema.Category, eq(schema.Registration.category_id, schema.Category.category_id))
    .leftJoin(creatorUser, eq(schema.Registration.created_by, creatorUser.users_id))
    .leftJoin(updaterUser, eq(schema.Registration.updated_by, updaterUser.users_id))
    .where(eq(schema.Registration.registration_id, id))
    .limit(1);

  if (!row) {
    throw new Error("Registration not found");
  }

  return {
    ...row.Registration,
    user: row.User ? { name: row.User.name, email: row.User.email } : null,
    category: row.Category
      ? {
          category_id: row.Category.category_id,
          name: row.Category.name,
          slug: row.Category.slug,
          category_name: row.Category.name,
          team_type: row.Category.team_type,
          deadline: row.Category.deadline,
          preliminary_deadline: row.Category.preliminary_deadline,
          final_deadline: row.Category.final_deadline,
          is_submission_open: row.Category.is_submission_open,
          allow_revision: row.Category.allow_revision,
          whatsapp_group_url: row.Category.whatsapp_group_url,
        }
      : null,
    created_by_name: row.creator?.name || row.Registration.created_by || "-",
    updated_by_name: row.updater?.name || row.Registration.updated_by || "-",
  };
};

// Check team name availability within a category
export const checkTeamNameAvailability = async (categoryId, teamName, excludeRegistrationId = null) => {
  if (!categoryId || !teamName || typeof teamName !== "string" || !teamName.trim()) {
    return { available: true, message: "Nama tim harus diisi" };
  }

  const trimmedTeamName = teamName.trim();
  const conditions = [
    eq(schema.Registration.category_id, categoryId),
    sql`LOWER(TRIM(${schema.Registration.team_name})) = LOWER(${trimmedTeamName})`,
  ];

  if (excludeRegistrationId) {
    conditions.push(ne(schema.Registration.registration_id, excludeRegistrationId));
  }

  const [existing] = await db
    .select({
      registration_id: schema.Registration.registration_id,
      team_name: schema.Registration.team_name,
    })
    .from(schema.Registration)
    .where(and(...conditions))
    .limit(1);

  return {
    available: !existing,
    team_name: trimmedTeamName,
    message: existing
      ? "Nama tim sudah digunakan dalam kategori lomba ini"
      : "Nama tim tersedia",
  };
};

// Create new registration
export const createRegistration = async (registrationData) => {
  // Get the category to check team_type
  const [category] = await db
    .select({ team_type: schema.Category.team_type })
    .from(schema.Category)
    .where(eq(schema.Category.category_id, registrationData.category_id))
    .limit(1);

  if (!category) {
    throw new Error("Category not found");
  }

  // Check if user already registered for this category
  const [existingRegistration] = await db
    .select()
    .from(schema.Registration)
    .where(
      and(
        eq(schema.Registration.user_id, registrationData.user_id),
        eq(schema.Registration.category_id, registrationData.category_id)
      )
    )
    .limit(1);

  if (existingRegistration) {
    throw new Error("User already registered for this category");
  }

  // Validate based on team_type
  if (category.team_type === "GROUP" && !registrationData.team_name) {
    throw new Error("Team name is required for group registrations");
  }

  // Validate unique team name within this category
  if (registrationData.team_name && registrationData.team_name.trim()) {
    const nameCheck = await checkTeamNameAvailability(
      registrationData.category_id,
      registrationData.team_name
    );
    if (!nameCheck.available) {
      throw new Error("Nama tim sudah digunakan dalam kategori lomba ini");
    }
  }

  const newId = generateCuid();
  await db.insert(schema.Registration).values({
    registration_id: newId,
    user_id: registrationData.user_id,
    category_id: registrationData.category_id,
    file_url: registrationData.file_url,
    team_name: registrationData.team_name ? registrationData.team_name.trim() : null,
    team_members: registrationData.team_members || null,
    is_verified: registrationData.is_verified || false,
    feedback: registrationData.feedback || null,
    created_by: registrationData.user_id,
    updated_by: registrationData.user_id,
  });

  return await getRegistrationById(newId);
};

// Update registration
export const updateRegistration = async (id, registrationData, updatedBy = null) => {
  // Check if registration exists
  const [registration] = await db
    .select()
    .from(schema.Registration)
    .leftJoin(schema.Category, eq(schema.Registration.category_id, schema.Category.category_id))
    .where(eq(schema.Registration.registration_id, id))
    .limit(1);

  if (!registration) {
    throw new Error("Registration not found");
  }

  const teamType = registration.Category?.team_type;

  // If this is a GROUP registration and team name is being set to null, reject
  if (
    teamType === "GROUP" && 
    registrationData.team_name === null
  ) {
    throw new Error("Team name is required for group registrations");
  }

  // Validate unique team name within this category if team_name is updated
  if (registrationData.team_name && registrationData.team_name.trim()) {
    const categoryId = registration.Registration?.category_id || registration.category_id;
    const nameCheck = await checkTeamNameAvailability(
      categoryId,
      registrationData.team_name,
      id
    );
    if (!nameCheck.available) {
      throw new Error("Nama tim sudah digunakan dalam kategori lomba ini");
    }
  }

  const updatePayload = {
    ...registrationData,
    updated_at: new Date(),
  };
  if (updatePayload.team_name) {
    updatePayload.team_name = updatePayload.team_name.trim();
  }
  if (updatedBy) {
    updatePayload.updated_by = updatedBy;
  }

  await db
    .update(schema.Registration)
    .set(updatePayload)
    .where(eq(schema.Registration.registration_id, id));

  return await getRegistrationById(id);
};

// Delete registration
export const deleteRegistration = async (id) => {
  // Check if registration exists
  const [registration] = await db
    .select()
    .from(schema.Registration)
    .where(eq(schema.Registration.registration_id, id))
    .limit(1);

  if (!registration) {
    throw new Error("Registration not found");
  }

  // Delete registrations and submissions inside transaction
  await db.transaction(async (tx) => {
    // Delete associated submissions
    await tx
      .delete(schema.Submission)
      .where(
        and(
          eq(schema.Submission.user_id, registration.user_id),
          eq(schema.Submission.category_id, registration.category_id)
        )
      );

    // Delete registration
    await tx
      .delete(schema.Registration)
      .where(eq(schema.Registration.registration_id, id));
  });

  return true;
};