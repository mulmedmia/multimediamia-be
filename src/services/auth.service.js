import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

const findUserByNim = async (nim) => {
  return await prisma.user.findUnique({
    where: { nim },
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

const checkIPLimit = async (ip) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.iPAddress.count({
    where: {
      ip,
      created_at: {
        gte: twentyFourHoursAgo,
      },
    },
  });
  return count >= 2;
};

const saveIPAddress = async (ip, email) => {
  return await prisma.iPAddress.create({
    data: {
      ip,
      email,
    },
  });
};

// Auth services
export const registerUser = async (userData, ip) => {
  const isLimitExceeded = await checkIPLimit(ip);
  if (isLimitExceeded) {
    throw new Error("Registration limit exceeded for this IP address");
  }

  const existingUserByEmail = await findUserByEmail(userData.email);
  if (existingUserByEmail) {
    throw new Error("Email already registered");
  }

  if (userData.nim) {
    const existingUserByNim = await findUserByNim(userData.nim);
    if (existingUserByNim) {
      throw new Error("NIM already registered");
    }
  }

  const user = await createUser(userData);

  await saveIPAddress(ip, userData.email);

  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const verifyUserOtp = async (email, otp) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.is_verified) {
    throw new Error("User already verified");
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { is_verified: true },
  });

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

export const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.is_verified) {
    throw new Error("Please verify your email first");
  }

  const isPasswordValid = await validatePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign(
    {
      userId: user.users_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || "1d" }
  );

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
  const updatedUser = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  // Return user without password
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};
