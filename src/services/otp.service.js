import prisma from "../config/prisma.js";
import { sendOtpEmail } from "../lib/mailer.js";

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in the database
export const createOTP = async (email) => {
  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // OTP expires in 10 minutes
  
  try {
    // Delete any existing OTPs for this email
    await prisma.OTP.deleteMany({
      where: { email },
    });
    
    // Create new OTP
    await prisma.OTP.create({
      data: {
        email,
        code: otp,
        expires_at: expiresAt,
      },
    });
    
    // Send OTP via email
    await sendOtpEmail(email, otp);
    return true;
  } catch (error) {
    console.error("Error creating OTP:", error);
    throw new Error("Failed to create and send OTP");
  }
};

// Verify OTP
export const verifyOTP = async (email, otp) => {
  const otpData = await prisma.OTP.findFirst({
    where: {
      email,
      code: otp,
      expires_at: {
        gt: new Date(),  // OTP is not expired
      },
    },
  });
  
  if (!otpData) {
    return false;
  }
  
  // Delete the OTP once used
  await prisma.OTP.delete({
    where: { id: otpData.id },
  });
  
  return true;
};