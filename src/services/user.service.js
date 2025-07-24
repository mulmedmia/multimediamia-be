import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

// Get user profile by ID
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { users_id: userId },
    select: {
      users_id: true,
      name: true,
      nim: true,
      email: true,
      role: true,
      points: true,
      is_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Update user profile
export const updateUserProfile = async (userId, updateData) => {
  const { current_password, new_password, email, nim, ...otherData } = updateData;

  // Get current user data
  const currentUser = await prisma.user.findUnique({
    where: { users_id: userId },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== currentUser.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new Error("Email already registered");
    }
  }

  // Check if NIM is being changed and if it's already taken
  if (nim && nim !== currentUser.nim) {
    const existingUser = await prisma.user.findUnique({
      where: { nim },
    });
    if (existingUser) {
      throw new Error("NIM already registered");
    }
  }

  // Prepare update data
  const dataToUpdate = { ...otherData };
  
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
  const updatedUser = await prisma.user.update({
    where: { users_id: userId },
    data: dataToUpdate,
    select: {
      users_id: true,
      name: true,
      nim: true,
      email: true,
      role: true,
      is_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedUser;
};

// Get all users (admin only)
export const getAllUsers = async (filters = {}) => {
  const { page = 1, limit = 10, search, role } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { nim: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        users_id: true,
        name: true,
        nim: true,
        email: true,
        role: true,
        points: true,
        is_verified: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: {
      total: totalUsers,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalUsers / Number(limit)),
    },
  };
};

export const getRegularUsers = async (filters = {}) => {
  const { page = 1, limit = 10, search } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {
    role: "USER", // Hanya ambil user dengan role USER
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { nim: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, totalUsers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        users_id: true,
        name: true,
        nim: true,
        email: true,
        role: true,
        is_verified: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: {
      total: totalUsers,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalUsers / Number(limit)),
    },
  };
};