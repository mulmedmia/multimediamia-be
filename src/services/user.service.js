import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc } from "drizzle-orm";

// Get user profile by ID
export const getUserProfile = async (userId) => {
  const [user] = await db
    .select({
      users_id: schema.User.users_id,
      name: schema.User.name,
      nim: schema.User.nim,
      email: schema.User.email,
      role: schema.User.role,
      points: schema.User.points,
      xp: schema.User.xp,
      is_verified: schema.User.is_verified,
      created_at: schema.User.created_at,
      updated_at: schema.User.updated_at,
    })
    .from(schema.User)
    .where(eq(schema.User.users_id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Update user profile
export const updateUserProfile = async (userId, updateData) => {
  const { current_password, new_password, email, nim, ...otherData } = updateData;

  // Get current user data
  const [currentUser] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.users_id, userId))
    .limit(1);

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== currentUser.email) {
    const [existingUser] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.email, email))
      .limit(1);
    if (existingUser) {
      throw new Error("Email already registered");
    }
  }

  // Check if NIM is being changed and if it's already taken
  if (nim && nim !== currentUser.nim) {
    const [existingUser] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.nim, nim))
      .limit(1);
    if (existingUser) {
      throw new Error("NIM already registered");
    }
  }

  // Prepare update data
  const dataToUpdate = { ...otherData, updated_at: new Date() };
  
  if (email) {
    dataToUpdate.email = email;
    // If email is changed, set is_verified to false
    dataToUpdate.is_verified = false;
  }
  
  if (nim) {
    dataToUpdate.nim = nim;
  }

  // Handle password change
  if (new_password && current_password) {
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, currentUser.password);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);
    dataToUpdate.password = hashedPassword;
  }

  // Update user
  const [updatedUser] = await db
    .update(schema.User)
    .set(dataToUpdate)
    .where(eq(schema.User.users_id, userId))
    .returning({
      users_id: schema.User.users_id,
      name: schema.User.name,
      nim: schema.User.nim,
      email: schema.User.email,
      role: schema.User.role,
      is_verified: schema.User.is_verified,
      created_at: schema.User.created_at,
      updated_at: schema.User.updated_at,
    });

  return updatedUser;
};

// Get all users (admin only)
export const getAllUsers = async (filters = {}) => {
  const { page = 1, limit = 10, search, role } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.User.name, `%${search}%`),
        like(schema.User.email, `%${search}%`),
        like(schema.User.nim, `%${search}%`)
      )
    );
  }

  if (role) {
    conditions.push(eq(schema.User.role, role));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, [countResult]] = await Promise.all([
    db
      .select({
        users_id: schema.User.users_id,
        name: schema.User.name,
        nim: schema.User.nim,
        email: schema.User.email,
        role: schema.User.role,
        points: schema.User.points,
        xp: schema.User.xp,
        is_verified: schema.User.is_verified,
        created_at: schema.User.created_at,
        updated_at: schema.User.updated_at,
      })
      .from(schema.User)
      .where(whereClause)
      .orderBy(desc(schema.User.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.User)
      .where(whereClause),
  ]);

  const total = Number(countResult?.count || 0);

  return {
    users,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Get regular users only (role: USER)
export const getRegularUsers = async (filters = {}) => {
  const { page = 1, limit = 10, search } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [eq(schema.User.role, "USER")];

  if (search) {
    conditions.push(
      or(
        like(schema.User.name, `%${search}%`),
        like(schema.User.email, `%${search}%`),
        like(schema.User.nim, `%${search}%`)
      )
    );
  }

  const whereClause = and(...conditions);

  const [users, [countResult]] = await Promise.all([
    db
      .select({
        users_id: schema.User.users_id,
        name: schema.User.name,
        nim: schema.User.nim,
        email: schema.User.email,
        role: schema.User.role,
        is_verified: schema.User.is_verified,
        created_at: schema.User.created_at,
        updated_at: schema.User.updated_at,
      })
      .from(schema.User)
      .where(whereClause)
      .orderBy(desc(schema.User.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.User)
      .where(whereClause),
  ]);

  const total = Number(countResult?.count || 0);

  return {
    users,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};