import nodemailer from "nodemailer";

// Create a transporter object
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like SendGrid, Mailgun, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Function to send OTP verification email
export const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email Verification - KSM Multimedia",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <p>Thank you for registering with KSM Multimedia. Please use the following OTP to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes. If you didn't request this verification, please ignore this email.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">© ${new Date().getFullYear()} KSM Multimedia. All rights reserved.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send verification email");
  }
};

export default {
  sendOtpEmail,
};