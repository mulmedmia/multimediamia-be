import nodemailer from "nodemailer";

/**
 * Send email via Resend HTTPS API (Port 443)
 * Free tier: 100 emails/day, 3000 emails/month
 */
async function sendViaResend({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from = process.env.EMAIL_FROM || "KSM Multimedia <onboarding@resend.dev>";
  const toList = Array.isArray(to) ? to : [to];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: toList,
      subject,
      html,
    }),
  });

  const resData = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Resend API error (${res.status}): ${JSON.stringify(resData)}`);
  }

  return { provider: "Resend", data: resData };
}

/**
 * Send email via Brevo (Sendinblue) HTTPS REST API v3 (Port 443)
 * Free tier: 300 emails/day
 */
async function sendViaBrevo({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || "panitia@mia2026.com";
  const senderName = process.env.BREVO_SENDER_NAME || "KSM Multimedia";

  const toList = (Array.isArray(to) ? to : [to]).map((recipient) => {
    return typeof recipient === "string" ? { email: recipient } : recipient;
  });

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: toList,
      subject,
      htmlContent: html,
    }),
  });

  const resData = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`Brevo API error (${res.status}): ${JSON.stringify(resData)}`);
  }

  return { provider: "Brevo", data: resData };
}

/**
 * Send email via Nodemailer SMTP (Port 465 / 587)
 * Used as local dev fallback or custom SMTP server
 */
async function sendViaSmtp({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("SMTP credentials (EMAIL_USER / EMAIL_PASSWORD) not configured");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
  });

  return { provider: "SMTP", data: info };
}

/**
 * Core email sender with automatic dual-provider failover
 * Priority: Primary Provider (Resend or Brevo) -> Secondary Provider -> Nodemailer SMTP
 */
export const sendEmail = async ({ to, subject, html }) => {
  const errors = [];
  const primary = (process.env.EMAIL_PRIMARY_PROVIDER || "brevo").toLowerCase();

  // Define providers in order of priority
  const providerChain = primary === "brevo"
    ? [
        { name: "Brevo", fn: () => sendViaBrevo({ to, subject, html }), isConfigured: Boolean(process.env.BREVO_API_KEY) },
        { name: "Resend", fn: () => sendViaResend({ to, subject, html }), isConfigured: Boolean(process.env.RESEND_API_KEY) },
        { name: "SMTP", fn: () => sendViaSmtp({ to, subject, html }), isConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) },
      ]
    : [
        { name: "Resend", fn: () => sendViaResend({ to, subject, html }), isConfigured: Boolean(process.env.RESEND_API_KEY) },
        { name: "Brevo", fn: () => sendViaBrevo({ to, subject, html }), isConfigured: Boolean(process.env.BREVO_API_KEY) },
        { name: "SMTP", fn: () => sendViaSmtp({ to, subject, html }), isConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) },
      ];

  const configuredProviders = providerChain.filter((p) => p.isConfigured);

  if (configuredProviders.length === 0) {
    throw new Error("No email provider configured. Please set RESEND_API_KEY, BREVO_API_KEY, or EMAIL_USER/EMAIL_PASSWORD.");
  }

  for (let i = 0; i < configuredProviders.length; i++) {
    const provider = configuredProviders[i];
    try {
      const result = await provider.fn();
      console.log(`✅ [MAILER SUCCESS] Email sent via ${provider.name} to ${Array.isArray(to) ? to.join(", ") : to}`);
      return result;
    } catch (err) {
      console.warn(`⚠️ [MAILER FAILOVER] ${provider.name} failed: ${err.message}`);
      errors.push({ provider: provider.name, error: err.message });

      // If there is another provider available, notify in log that failover is happening
      if (i < configuredProviders.length - 1) {
        console.log(`🔄 [MAILER FAILOVER] Attempting fallback to ${configuredProviders[i + 1].name}...`);
      }
    }
  }

  const errorSummary = errors.map((e) => `[${e.provider}: ${e.error}]`).join("; ");
  throw new Error(`Failed to deliver email through all configured providers: ${errorSummary}`);
};

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

  return await sendEmail({ to: email, subject, html });
};

export default {
  sendEmail,
  sendOtpEmail,
};