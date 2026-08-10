# 🛡️ Mitigation & Remediation Plan — Test Run #02

Dokumen ini berisi panduan mitigasi dan langkah perbaikan teknis (*remedial actions*) untuk 6 kegagalan test case yang teridentifikasi pada laporan **Run #02** (`qa_testing/results/02_test_results.md`).

---

## 📌 Matrix Mitigasi Test Run #02 (6 Failed Cases)

| Test Case | Severity | Deskripsi Masalah | Solusi / Perbaikan Kode | Status |
|---|---|---|---|---|
| **TC-R09** | Medium | Whitespace-only Password (`"      "`) diterima backend (201 Created). | Tambahkan `.trim()` & Zod `.min(6)` validation pada password register. | 💡 Proposed |
| **TC-O04** | Low | OTP berisi karakter spesial mengembalikan HTTP 400 alih-alih HTTP 422. | Selaraskan middleware validation Zod OTP agar mengembalikan HTTP 422. | 💡 Proposed |
| **TC-XSS** | Low | Test XSS mengalami timeout 5000ms karena percobaan SMTP email. | Tambahkan mock transporter Nodemailer saat `NODE_ENV=test`. | 💡 Proposed |
| **TC-REG-INP02** | Low | Missing `category_id` saat registrasi mengembalikan 404 alih-alih 422. | Pindahkan validasi input Zod sebelum pengecekan keberadaan entity. | 💡 Proposed |
| **TC-PAG01** | Medium | Pagination `page=0` menyebabkan HTTP 500 Internal Server Error. | Pastikan `page` selalu divalidasi `Math.max(1, page)` sebelum offset SQL. | 💡 Proposed |
| **TC-PAG02** | Medium | Pagination `page=-1` (angka negatif) menyebabkan HTTP 500. | Validasi parameter `page` harus berupa integer positif (`>= 1`). | 💡 Proposed |

---

## 🛠️ Langkah Perbaikan Kode Spesifik (Code Snippets)

### 1. Fix Whitespace Password Validation (`src/controllers/auth.controller.js` / Zod Schema)
```javascript
const registerSchema = zod.object({
  name: zod.string().min(3),
  email: zod.string().email(),
  password: zod.string().trim().min(6, "Password must be at least 6 non-whitespace characters"),
});
```

### 2. Fix Pagination Overflow & Negative Page (`src/controllers/submission.controller.js`)
```javascript
export async function getSubmissions(req, res) {
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);

  // ✅ Sanitasi aman untuk cegah SQL Offset Negative / Error 500
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;

  const offset = (page - 1) * limit;

  const submissions = await db.select().from(schema.Submission).limit(limit).offset(offset);
  return res.status(200).json({ status: "success", data: submissions, meta: { page, limit } });
}
```

### 3. Fix Nodemailer Timeout saat Automated Testing (`src/services/email.service.js`)
```javascript
export async function sendEmail({ to, subject, html }) {
  // Jika sedang berjalan di lingkungan test (Vitest/Supertest), bypass SMTP nyata
  if (process.env.NODE_ENV === "test") {
    console.log(`[TEST MOCK EMAIL] Sent to: ${to}, Subject: ${subject}`);
    return true;
  }

  // Pengiriman SMTP aktual
  return await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
}
```
