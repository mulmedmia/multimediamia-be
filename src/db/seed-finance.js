import { db } from "./index.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { generateCuid } from "./cuid.js";

dotenv.config();

/**
 * Script khusus untuk membuat atau memperbarui akun Tim Finance.
 * Penggunaan via CLI:
 *   node src/db/seed-finance.js <email> <password> [nama]
 *
 * Atau menggunakan Environment Variables di .env:
 *   FINANCE_EMAIL, FINANCE_PASSWORD, FINANCE_NAME
 */
async function seedFinance() {
  const args = process.argv.slice(2);
  const emailArg = args[0];
  const passwordArg = args[1];
  const nameArg = args[2];

  const email = emailArg || process.env.FINANCE_EMAIL || "finance@multimediamia.id";
  const password = passwordArg || process.env.FINANCE_PASSWORD || "Finance123";
  const name = nameArg || process.env.FINANCE_NAME || "Tim Finance MIA 2026";

  if (!email || !password) {
    console.error("❌ Error: Email dan Password wajib diisi!");
    console.log("Contoh: node src/db/seed-finance.js finance@mia2026.com PasswordRahasia123 \"Nama Petugas\"");
    process.exit(1);
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Cek apakah akun finance sudah ada berdasarkan email
  const [existingUser] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.email, email))
    .limit(1);

  if (existingUser) {
    await db
      .update(schema.User)
      .set({
        name: name,
        password: hashedPassword,
        role: "FINANCE",
        is_verified: true,
        updated_at: new Date(),
      })
      .where(eq(schema.User.email, email));

    console.log("=========================================");
    console.log("✅ AKUN FINANCE BERHASIL DIUPDATE:");
    console.log(`   Email   : ${email}`);
    console.log(`   Nama    : ${name}`);
    console.log(`   Role    : FINANCE`);
    console.log("=========================================");
  } else {
    const userId = generateCuid();
    await db.insert(schema.User).values({
      users_id: userId,
      name: name,
      email: email,
      password: hashedPassword,
      role: "FINANCE",
      is_verified: true,
      created_by: userId,
      updated_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log("=========================================");
    console.log("✅ AKUN FINANCE BARU BERHASIL DIBUAT:");
    console.log(`   Email   : ${email}`);
    console.log(`   Nama    : ${name}`);
    console.log(`   Role    : FINANCE`);
    console.log("=========================================");
  }

  process.exit(0);
}

seedFinance().catch((err) => {
  console.error("❌ Gagal membuat akun finance:", err);
  process.exit(1);
});
