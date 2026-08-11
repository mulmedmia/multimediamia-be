import nodemailer from "nodemailer";

// Function to send OTP verification email
export const sendOtpEmail = async (email, otp) => {
  const subject = "Email Verification - KSM Multimedia";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Email Verification</h2>
      <p>Thank you for registering with KSM Multimedia. Please use the following OTP to verify your email address:</p>
      <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This OTP is valid for 10 minutes. If you didn't request this verification, please ignore this email.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">© ${new Date().getFullYear()} KSM Multimedia. All rights reserved.</p>
    </div>
  `;

  // 1. If RESEND_API_KEY is configured, use Resend HTTPS API (bypasses Render SMTP port blocking)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "KSM Multimedia <onboarding@resend.dev>",
          to: [email],
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
      }

      console.log(`[RESEND SUCCESS] Email sent to ${email}`);
      return true;
    } catch (resendErr) {
      console.error("Error sending via Resend API:", resendErr);
      throw resendErr;
    }
  }

  // 2. Fallback to Nodemailer SMTP
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html,
    });
    console.log("Email sent via SMTP: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email via SMTP:", error);
    throw new Error("Failed to send verification email: " + error.message);
  }
};

export default {
  sendOtpEmail,
};