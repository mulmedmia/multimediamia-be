import { registerUser, loginUser, verifyUserOtp, resetPasswordWithOtp } from "../services/auth.service.js";
import { createOTP, verifyOTP } from "../services/otp.service.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";
import bcrypt from "bcrypt";
import { response } from "../utils/response.js";
import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  requestOtpSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from "../models/auth.model.js";

const creatorUser = alias(schema.User, "creatorUser");
const updaterUser = alias(schema.User, "updaterUser");

// Register user and send OTP
export const register = async (req, res) => {
  let createdUser = null;
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const { name, email, password } = validation.data;
    
    // Register user (will be unverified)
    createdUser = await registerUser({ name, email, password });
    
    // Generate and send OTP
    await createOTP(email);
    
    return response.success(
      res,
      {
        users_id: createdUser.users_id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        is_verified: createdUser.is_verified,
        otp_sent: true
      },
      "OTP sent to your email",
      201
    );
  } catch (error) {
    if (createdUser && createdUser.users_id) {
      try {
        // Rollback created user if sending OTP email failed
        await db.delete(schema.User).where(eq(schema.User.users_id, createdUser.users_id));
      } catch (rollbackErr) {
        console.error("Failed to rollback user creation:", rollbackErr);
      }
    }

    if (error.message === "Email already registered") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to register user", 500, error.message);
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const validation = verifyOtpSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const { email, otp } = validation.data;
    
    // Verify OTP
    const isOtpValid = await verifyOTP(email, otp);
    
    if (!isOtpValid) {
      return response.error(res, "Invalid or expired OTP", 400);
    }
    
    // Update user verification status
    const verifiedUser = await verifyUserOtp(email, otp);
    
    return response.success(
      res,
      {
        users_id: verifiedUser.users_id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        role: verifiedUser.role,
        is_verified: verifiedUser.is_verified
      },
      "OTP verified successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "User already verified") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to verify OTP", 500, error.message);
  }
};

// Request OTP (if user wants to resend registration OTP)
export const requestOTP = async (req, res) => {
  try {
    const validation = requestOtpSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const { email } = validation.data;
    
    // Check if user exists in DB
    const [user] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.email, email))
      .limit(1);

    if (!user) {
      return response.error(res, "User not found", 404);
    }

    if (user.is_verified) {
      return response.error(res, "User is already verified. Cannot resend registration OTP.", 400);
    }

    // Generate and send OTP for unverified user
    await createOTP(email);
    
    return response.success(
      res,
      { email },
      "OTP sent to your email",
      200
    );
  } catch (error) {
    if (error.message && error.message.startsWith("Mohon tunggu")) {
      return response.error(res, error.message, 429);
    }
    return response.error(res, "Failed to send OTP", 500, error.message);
  }
};

export const login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const { email, password } = validation.data;
    const result = await loginUser(email, password);
    
    return response.success(
      res,
      result,
      "Login successful"
    );
  } catch (error) {
    if (error.message === "User not found" || error.message === "Invalid password") {
      return response.error(res, "Invalid email or password", 401);
    }
    if (error.message === "Please verify your email first") {
      return response.error(res, error.message, 401);
    }
    return response.error(res, "Failed to login", 500, error.message);
  }
};

// ADMIN: Create another ADMIN (Admin-only feature)
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return response.error(res, "Name, email, and password are required", 400);
    }

    if (password.length < 6) {
      return response.error(res, "Password must be at least 6 characters", 400);
    }

    // Cek email sudah terdaftar
    const [existing] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.email, email))
      .limit(1);

    if (existing) {
      return response.error(res, "Email already registered", 400);
    }

    const currentAdminId = req.user?.userId;
    const newAdminId = generateCuid();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [newAdmin] = await db
      .insert(schema.User)
      .values({
        users_id: newAdminId,
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        is_verified: true,
        created_by: currentAdminId || newAdminId,
        updated_by: currentAdminId || newAdminId,
      })
      .returning();

    return response.success(
      res,
      {
        users_id: newAdmin.users_id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        is_verified: newAdmin.is_verified,
      },
      "Admin user created successfully",
      201
    );
  } catch (error) {
    return response.error(res, "Failed to create admin user", 500, error.message);
  }
};

// ADMIN: Bulk Create ADMIN accounts (Admin-only)
export const createBulkAdmin = async (req, res) => {
  try {
    const { admins } = req.body;
    if (!Array.isArray(admins) || admins.length === 0) {
      return response.error(res, "Field 'admins' must be a non-empty array", 400);
    }

    const currentAdminId = req.user?.userId;
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of admins) {
      const { name, email, password } = item;
      const cleanName = name ? name.trim() : "";
      const cleanEmail = email ? email.trim().toLowerCase() : "";
      const cleanPass = password ? password.trim() : "";

      if (!cleanName || cleanName.length < 3 || !cleanEmail || !cleanPass || cleanPass.length < 6) {
        results.push({ email: cleanEmail || "-", status: "failed", reason: "Invalid name, email, or password < 6 chars" });
        failedCount++;
        continue;
      }

      try {
        const [existing] = await db
          .select()
          .from(schema.User)
          .where(eq(schema.User.email, cleanEmail))
          .limit(1);

        const hashedPassword = await bcrypt.hash(cleanPass, 10);

        if (existing) {
          await db
            .update(schema.User)
            .set({
              name: cleanName,
              password: hashedPassword,
              role: "ADMIN",
              is_verified: true,
              updated_by: currentAdminId || existing.users_id,
              updated_at: new Date(),
            })
            .where(eq(schema.User.email, cleanEmail));

          results.push({ email: cleanEmail, name: cleanName, status: "updated_to_admin" });
        } else {
          const newAdminId = generateCuid();
          await db.insert(schema.User).values({
            users_id: newAdminId,
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role: "ADMIN",
            is_verified: true,
            created_by: currentAdminId || newAdminId,
            updated_by: currentAdminId || newAdminId,
          });

          results.push({ email: cleanEmail, name: cleanName, status: "created" });
        }
        successCount++;
      } catch (err) {
        results.push({ email: cleanEmail, status: "failed", reason: err.message });
        failedCount++;
      }
    }

    return response.success(
      res,
      {
        total: admins.length,
        successCount,
        failedCount,
        results,
      },
      `Bulk admin processing completed: ${successCount} successful, ${failedCount} failed`,
      200
    );
  } catch (error) {
    return response.error(res, "Failed to bulk create admins", 500, error.message);
  }
};

// JURI: Create JURI
export const createJuri = async (req, res) => {
  try {
    const { name, email, password, category_id } = req.body;
    if (!name || !email || !password) {
      return response.error(res, "Name, email, and password are required", 400);
    }

    // Cek email sudah terdaftar
    const [existing] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.email, email))
      .limit(1);

    if (existing) {
      return response.error(res, "Email already registered", 400);
    }

    // Jika category_id disediakan, pastikan kategori ada
    if (category_id) {
      const [category] = await db
        .select()
        .from(schema.Category)
        .where(eq(schema.Category.category_id, category_id))
        .limit(1);

      if (!category) {
        return response.error(res, "Category not found", 404);
      }
    }

    const adminId = req.user?.userId;
    const newJuriId = generateCuid();
    const hashedPassword = await bcrypt.hash(password, 10);
    const [juri] = await db
      .insert(schema.User)
      .values({
        users_id: newJuriId,
        name,
        email,
        password: hashedPassword,
        role: "JURI",
        is_verified: true,
        created_by: adminId || newJuriId,
        updated_by: adminId || newJuriId,
      })
      .returning();

    if (category_id) {
      await db.insert(schema.Juri).values({
        juri_id: generateCuid(),
        users_id: juri.users_id,
        category_id,
        created_by: adminId || newJuriId,
        updated_by: adminId || newJuriId,
      });
    }

    return response.success(
      res,
      {
        users_id: juri.users_id,
        name: juri.name,
        email: juri.email,
        role: juri.role,
        category_id: category_id || null,
      },
      "JURI created successfully",
      201
    );
  } catch (error) {
    return response.error(res, "Failed to create JURI", 500, error.message);
  }
};

// Hapus JURI (hanya admin)
export const deleteJuri = async (req, res) => {
  try {
    const { id } = req.params;
    // Pastikan user dengan id tsb adalah JURI
    const [user] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.users_id, id))
      .limit(1);

    if (!user || user.role !== "JURI") {
      return response.error(res, "JURI not found", 404);
    }
    
    await db.delete(schema.User).where(eq(schema.User.users_id, id));
    return response.success(res, null, "JURI deleted successfully");
  } catch (error) {
    return response.error(res, "Failed to delete JURI", 500, error.message);
  }
};

// Get all JURI (beserta kategori yang diampu)
export const getAllJuri = async (req, res) => {
  try {
    const juries = await db
      .select({
        users_id: schema.User.users_id,
        name: schema.User.name,
        email: schema.User.email,
        is_verified: schema.User.is_verified,
        created_at: schema.User.created_at,
        updated_at: schema.User.updated_at,
        created_by: schema.User.created_by,
        created_by_name: creatorUser.name,
        updated_by: schema.User.updated_by,
        updated_by_name: updaterUser.name,
        juri_id: schema.Juri.juri_id,
        category_id: schema.Juri.category_id,
        category_name: schema.Category.name,
        category_slug: schema.Category.slug,
      })
      .from(schema.User)
      .leftJoin(schema.Juri, eq(schema.User.users_id, schema.Juri.users_id))
      .leftJoin(schema.Category, eq(schema.Juri.category_id, schema.Category.category_id))
      .leftJoin(creatorUser, eq(schema.User.created_by, creatorUser.users_id))
      .leftJoin(updaterUser, eq(schema.User.updated_by, updaterUser.users_id))
      .where(eq(schema.User.role, "JURI"))
      .orderBy(desc(schema.User.created_at));

    const result = juries.map((j) => ({
      ...j,
      created_by_name: j.created_by_name || j.created_by || "-",
      updated_by_name: j.updated_by_name || j.updated_by || "-",
    }));

    return response.success(res, result, "All JURI retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to get JURI", 500, error.message);
  }
};

// Get JURI by ID (beserta kategori yang diampu)
export const getJuriById = async (req, res) => {
  try {
    const { id } = req.params;
    const [juri] = await db
      .select({
        users_id: schema.User.users_id,
        name: schema.User.name,
        email: schema.User.email,
        is_verified: schema.User.is_verified,
        created_at: schema.User.created_at,
        updated_at: schema.User.updated_at,
        created_by: schema.User.created_by,
        created_by_name: creatorUser.name,
        updated_by: schema.User.updated_by,
        updated_by_name: updaterUser.name,
        juri_id: schema.Juri.juri_id,
        category_id: schema.Juri.category_id,
        category_name: schema.Category.name,
        category_slug: schema.Category.slug,
      })
      .from(schema.User)
      .leftJoin(schema.Juri, eq(schema.User.users_id, schema.Juri.users_id))
      .leftJoin(schema.Category, eq(schema.Juri.category_id, schema.Category.category_id))
      .leftJoin(creatorUser, eq(schema.User.created_by, creatorUser.users_id))
      .leftJoin(updaterUser, eq(schema.User.updated_by, updaterUser.users_id))
      .where(and(eq(schema.User.users_id, id), eq(schema.User.role, "JURI")))
      .limit(1);

    if (!juri) {
      return response.error(res, "JURI not found", 404);
    }
    return response.success(
      res,
      {
        ...juri,
        created_by_name: juri.created_by_name || juri.created_by || "-",
        updated_by_name: juri.updated_by_name || juri.updated_by || "-",
      },
      "JURI retrieved successfully"
    );
  } catch (error) {
    return response.error(res, "Failed to get JURI", 500, error.message);
  }
};

// Assign atau update kategori untuk JURI (1 JURI hanya bisa 1 Kategori)
export const assignJuriCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id } = req.body;

    if (!category_id) {
      return response.error(res, "Category ID is required", 400);
    }

    // Pastikan user dengan id tsb adalah JURI
    const [user] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.users_id, id))
      .limit(1);

    if (!user || user.role !== "JURI") {
      return response.error(res, "JURI not found", 404);
    }

    // Pastikan category ada
    const [category] = await db
      .select()
      .from(schema.Category)
      .where(eq(schema.Category.category_id, category_id))
      .limit(1);

    if (!category) {
      return response.error(res, "Category not found", 404);
    }

    // Cek apakah juri sudah memiliki record di tabel Juri
    const [existingJuri] = await db
      .select()
      .from(schema.Juri)
      .where(eq(schema.Juri.users_id, id))
      .limit(1);

    const adminId = req.user?.userId;

    if (existingJuri) {
      await db
        .update(schema.Juri)
        .set({
          category_id,
          updated_by: adminId || null,
          updated_at: new Date(),
        })
        .where(eq(schema.Juri.users_id, id));
    } else {
      await db.insert(schema.Juri).values({
        juri_id: generateCuid(),
        users_id: id,
        category_id,
        created_by: adminId || null,
        updated_by: adminId || null,
      });
    }

    return response.success(
      res,
      { users_id: id, category_id, category_name: category.category_name },
      "Category assigned to JURI successfully"
    );
  } catch (error) {
    return response.error(res, "Failed to assign category to JURI", 500, error.message);
  }
};

// PASSWORD RESET
// Request password reset OTP
export const forgotPassword = async (req, res) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const { email } = validation.data;
    
    // Check if user exists
    const [user] = await db
      .select()
      .from(schema.User)
      .where(eq(schema.User.email, email))
      .limit(1);

    if (!user) {
      return response.error(res, "User not found", 404);
    }

    // Generate and send OTP
    await createOTP(email);
    
    return response.success(
      res,
      { email },
      "Password reset OTP sent to your email",
      200
    );
  } catch (error) {
    if (error.message && error.message.startsWith("Mohon tunggu")) {
      return response.error(res, error.message, 429);
    }
    return response.error(res, "Failed to send password reset OTP", 500, error.message);
  }
};

// Verify reset password OTP
export const verifyResetOtp = async (req, res) => {
  try {
    const validation = verifyResetOtpSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const { email, otp } = validation.data;
    
    // Verify OTP
    const isOtpValid = await verifyOTP(email, otp);
    
    if (!isOtpValid) {
      return response.error(res, "Invalid or expired OTP", 400);
    }
    
    return response.success(
      res,
      { email, otp_verified: true },
      "OTP verified successfully. You can now reset your password"
    );
  } catch (error) {
    return response.error(res, "Failed to verify OTP", 500, error.message);
  }
};

// Reset password with OTP
export const resetPassword = async (req, res) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const { email, otp, newPassword } = validation.data;
    
    // Verify OTP
    const isOtpValid = await verifyOTP(email, otp);
    
    if (!isOtpValid) {
      return response.error(res, "Invalid or expired OTP", 400);
    }
    
    // Reset password
    const updatedUser = await resetPasswordWithOtp(email, otp, newPassword);
    
    return response.success(
      res,
      {
        users_id: updatedUser.users_id,
        name: updatedUser.name,
        email: updatedUser.email
      },
      "Password reset successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to reset password", 500, error.message);
  }
};