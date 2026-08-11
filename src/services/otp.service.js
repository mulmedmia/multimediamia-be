import crypto from "crypto";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and, gt } from "drizzle-orm";
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
    // Delete any existing OTPs for this email
    await db.delete(schema.OTP).where(eq(schema.OTP.email, email));
    
    // Create new OTP
    await db.insert(schema.OTP).values({
      id: generateCuid(),
      email,
      code: otp,
      expires_at: expiresAt,
    });
    
    // Log OTP in terminal console for dev testing only (disabled in production)
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n========================================`);
      console.log(`[DEV OTP LOG] Code for ${email}: ${otp}`);
      console.log(`========================================\n`);
    }

    // Send OTP via email (log warning if email fails in non-production)
    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      if (process.env.NODE_ENV === "production") {
        throw emailError;
      }
      console.warn("⚠️ [DEV WARNING] Could not send OTP email via SMTP, but OTP was generated and saved to DB for dev testing.");
    }

    return true;
  } catch (error) {
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