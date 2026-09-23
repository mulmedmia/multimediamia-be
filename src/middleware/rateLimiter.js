import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

// General Rate Limiter (Proteksi umum tanpa memblokir pengguna normal / WiFi kampus bersama)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 300, // 300 request per menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Terlalu banyak permintaan dari jaringan/IP ini. Silakan coba beberapa saat lagi.",
  },
  skip: (req) => {
    // Lewatkan preflight CORS
    if (req.method === "OPTIONS") return true;

    // Lewatkan root dan endpoint health check
    if (req.path === "/" || req.path === "/health") return true;

    // Lewatkan request dari Admin atau Juri yang sudah terautentikasi dan memiliki signature valid
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && (decoded.role === "ADMIN" || decoded.role === "JURI")) {
          return true;
        }
      } catch {
        // Jika verifikasi token gagal, tetap terapkan limiter biasa
      }
    }

    return false;
  },
});

// Auth Rate Limiter (Proteksi ketat brute-force untuk login, register, OTP, dan password reset)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // Maksimal 30 percobaan per 15 menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Terlalu banyak percobaan pada endpoint ini. Demi keamanan, silakan coba lagi setelah beberapa menit.",
  },
});
