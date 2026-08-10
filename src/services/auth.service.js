import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateCuid } from "../db/cuid.js";

// User-related database operations
const findUserByEmail = async (email) => {
  const [user] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.email, email))
    .limit(1);
  return user || null;
};

const findUserByNim = async (nim) => {
  if (!nim) return null;
  const [user] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.nim, nim))
    .limit(1);
  return user || null;
};

const createUser = async (userData) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  const [user] = await db
    .insert(schema.User)
    .values({
      users_id: generateCuid(),
      name: userData.name,
      email: userData.email,
      nim: userData.nim || null,
      password: hashedPassword,
      role: "USER",
      is_verified: false,
      points: 0,
    })
    .returning();

  return user;
};

const validatePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Auth services
export const registerUser = async (userData) => {
  // Check if user already exists by email
  const existingUserByEmail = await findUserByEmail(userData.email);
  if (existingUserByEmail) {
    throw new Error("Email already registered");
  }

  // Check if user already exists by NIM (if provided)
  if (userData.nim) {
    const existingUserByNim = await findUserByNim(userData.nim);
    if (existingUserByNim) {
      throw new Error("NIM already registered");
    }
  }

  // Create user
  const user = await createUser(userData);

  // Return user without password
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const verifyUserOtp = async (email, otp) => {
  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.is_verified) {
    throw new Error("User already verified");
  }

  // Update user verification status
  const [updatedUser] = await db
    .update(schema.User)
    .set({ is_verified: true })
    .where(eq(schema.User.email, email))
    .returning();

  // Return user without password
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

export const loginUser = async (email, password) => {
  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is verified
  if (!user.is_verified) {
    throw new Error("Please verify your email first");
  }

  // Validate password
  const isPasswordValid = await validatePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.users_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || "1d" }
  );

  // Return user without password and token
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const resetPasswordWithOtp = async (email, otp, newPassword) => {
  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update user password
  const [updatedUser] = await db
    .update(schema.User)
    .set({ password: hashedPassword })
    .where(eq(schema.User.email, email))
    .returning();

  // Return user without password
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};
