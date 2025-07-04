import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

// User-related database operations
const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};


const createUser = async (userData) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);
  
  return await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
      is_verified: false,
    },
  });
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
  const updatedUser = await prisma.user.update({
    where: { email },
    data: { is_verified: true },
  });

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
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || "1d" }
  );

  // Return user without password and token
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};