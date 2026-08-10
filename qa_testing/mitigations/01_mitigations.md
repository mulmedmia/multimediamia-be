# 🛡️ Mitigation & Remediation Plan — Test Run #01

Dokumen ini berisi panduan mitigasi dan langkah perbaikan teknis (*remedial actions*) untuk setiap kerentanan dan defect yang teridentifikasi pada laporan **Run #01** (`qa_testing/results/01_test_results.md`).

---

## 📌 Matrix Mitigasi Critical & High Findings

| Bug ID | Risk Level | Cacat / Kerentanan | Rekomendasi Mitigasi Teknis | Status |
|---|---|---|---|---|
| **C-01** | CRITICAL | DB Connection Failure melempar HTTP 500 Uncaught Error | Bungkus DB queries dengan Global Async Error Middleware & Healthcheck Interceptor. | 💡 Proposed |
| **C-02** | CRITICAL | Route Shadowing di `/submissions/my/submissions` | Pindahkan route statis `/my/submissions` **sebelum** route dinamis `/:id` di `submission.routes.js`. | 💡 Proposed |
| **C-03** | CRITICAL | Route Shadowing di `/gamification/admin/redeem/all` | Pindahkan route statis `/admin/redeem/all` & `/redeem/my` **sebelum** `/:category_id` di `gamification.routes.js`. | 💡 Proposed |
| **C-04** | CRITICAL | OTP Double-Consumption pada Password Reset | Hapus OTP **setelah** password berhasil di-reset, bukan saat `verify-reset-otp`. | 💡 Proposed |
| **H-01** | HIGH | CORS Wildcard (`origin: "*"`) | Batasi CORS ke whitelist domain resmi (misal `FRONTEND_URL`). | 💡 Proposed |
| **H-02** | HIGH | Tidak ada Rate Limiting khusus OTP & Login | Tambahkan `express-rate-limit` khusus (misal 5 req/15menit) pada `/auth/login` & `/auth/request-otp`. | 💡 Proposed |
| **H-03** | HIGH | User Enumeration pada `/auth/forgot-password` | Ubah pesan respon 404 "User not found" menjadi HTTP 200 "If your email is registered, an OTP has been sent." | 💡 Proposed |

---

## 🛠️ Langkah Perbaikan Kode Spesifik (Code Snippets)

### 1. Fix Route Shadowing (`src/routes/submission.routes.js`)
```javascript
// ✅ SETELAH PERBAIKAN: Route statis didaftarkan LEBIH DULU dari route dinamis :id
router.get("/my/submissions", authenticateToken, getMySubmissions); // 1. Statis
router.get("/:id", getSubmission);                                  // 2. Dinamis
```

### 2. Fix Route Shadowing (`src/routes/gamification.routes.js`)
```javascript
// ✅ SETELAH PERBAIKAN
router.get("/admin/redeem/all", authenticateToken, isAdmin, getAllRedemptions); // 1. Statis
router.get("/redeem/my", authenticateToken, getMyRedemptions);                  // 2. Statis
router.get("/:category_id", getLeaderboard);                                    // 3. Dinamis
```

### 3. Fix OTP Double Consumption (`src/services/otp.service.js` & `auth.controller.js`)
```javascript
// Di verifyResetOTP: Hanya cek validitas & kadaluarsa OTP (JANGAN delete row DB di sini)
export async function verifyResetOTP(email, otp) {
  const [record] = await db.select().from(schema.OTP)
    .where(and(eq(schema.OTP.email, email), eq(schema.OTP.otp, otp)));
  if (!record || record.expires_at < new Date()) return false;
  return true;
}

// Di resetPassword: Hapus OTP SETELAH password berhasil di-update
export async function resetPassword(email, otp, newPassword) {
  const isValid = await verifyResetOTP(email, otp);
  if (!isValid) throw new Error("Invalid or expired OTP");

  // Update password
  await db.update(schema.User).set({ password: hashedPassword }).where(eq(schema.User.email, email));
  // Hapus OTP setelah sukses reset
  await db.delete(schema.OTP).where(eq(schema.OTP.email, email));
}
```

### 4. Fix User Enumeration (`src/controllers/auth.controller.js`)
```javascript
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await findUserByEmail(email);
  if (user) {
    await sendOTPEmail(email);
  }
  // Selalu kembalikan respon 200 generic agar attacker tidak bisa menebak email terdaftar
  return res.status(200).json({
    status: "success",
    message: "If your email is registered in our system, you will receive a reset OTP shortly."
  });
}
```

### 5. Fix CORS Configuration (`src/app.js`)
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(",") 
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy violation"));
    }
  },
  credentials: true
}));
```
