import crypto from "crypto";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and, gt, desc } from "drizzle-orm";
import { sendOtpEmail } from "../lib/mailer.js";
import { generateCuid } from "../db/cuid.js";

// Generate a cryptographically secure 6-digit OTP (Fixes QA-06)
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Store OTP in the database
export const createOTP = async (email) => {
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes
  
  try {
    // Cooldown check: prevent requesting OTP repeatedly within 60 seconds (MIA-SEC-008)
    const [recentOtp] = await db
      .select({ created_at: schema.OTP.created_at })
      .from(schema.OTP)
      .where(eq(schema.OTP.email, email))
      .orderBy(desc(schema.OTP.created_at))
      .limit(1);

    if (recentOtp && recentOtp.created_at) {
      const elapsedMs = Date.now() - new Date(recentOtp.created_at).getTime();
      if (elapsedMs < 60000) {
        const remainingSeconds = Math.ceil((60000 - elapsedMs) / 1000);
        throw new Error(`Mohon tunggu ${remainingSeconds} detik sebelum meminta kode OTP baru.`);
      }
    }

    // Delete any existing OTPs for this email
    await db.delete(schema.OTP).where(eq(schema.OTP.email, email));
    
    // Find user by email if exists, otherwise fallback to email
    const [existingUser] = await db
      .select({ id: schema.User.users_id })
      .from(schema.User)
      .where(eq(schema.User.email, email))
      .limit(1);
    const actorId = existingUser ? existingUser.id : email;

    // Create new OTP
    await db.insert(schema.OTP).values({
      id: generateCuid(),
      email,
      code: otp,
      expires_at: expiresAt,
      created_by: actorId,
      updated_by: actorId,
    });
    
    // Log OTP in terminal console for dev testing only (disabled in production)
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n========================================`);
      console.log(`[DEV OTP LOG] Code for ${email}: ${otp}`);
      console.log(`========================================\n`);
    }

    // Send OTP via email
    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error(`⚠️ [OTP EMAIL FAILED] ${emailError.message}`);
      if (emailError.message.includes("ETIMEDOUT") || emailError.message.includes("timeout")) {
        console.warn("⚠️ [RENDER SMTP BLOCK] Outbound TCP SMTP (ports 465/587) is blocked by your hosting provider. Set RESEND_API_KEY and/or BREVO_API_KEY to send emails via HTTPS REST API.");
      }
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_OTP_FALLBACK !== "true") {
        throw emailError;
      }
      console.warn("⚠️ [OTP FALLBACK] Registration allowed to proceed; OTP saved to DB for verification.");
    }

    return true;
  } catch (error) {
    if (error.message && error.message.startsWith("Mohon tunggu")) {
      throw error;
    }
    console.error("Error creating OTP:", error);
    throw new Error("Failed to create and send OTP");
  }
};

// Verify OTP
export const verifyOTP = async (email, otp) => {
  const [otpData] = await db
    .select()
    .from(schema.OTP)
    .where(
      and(
        eq(schema.OTP.email, email),
        eq(schema.OTP.code, otp),
        gt(schema.OTP.expires_at, new Date())
      )
    )
    .limit(1);
  
  if (!otpData) {
    return false;
  }
  
  // Delete the OTP once used
  await db.delete(schema.OTP).where(eq(schema.OTP.id, otpData.id));
  
  return true;
};