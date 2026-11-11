import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { generateCuid } from "./cuid.js";

// 1. Deteksi argumen CLI
const rawArgs = process.argv.slice(2);
const isExplicitProd = rawArgs.includes("--prod") || rawArgs.includes("-p");

// Deteksi flag file (--file nama_file.json atau -f nama_file.json)
let jsonFilePath = null;
const fileFlagIndex = rawArgs.findIndex((a) => a === "--file" || a === "-f");
if (fileFlagIndex !== -1 && rawArgs[fileFlagIndex + 1]) {
  jsonFilePath = rawArgs[fileFlagIndex + 1];
}

const isBulkFlag = rawArgs.includes("--bulk") || !!jsonFilePath;

// Filter argumen selain flag
const filteredArgs = rawArgs.filter(
  (arg, idx) =>
    arg !== "--prod" &&
    arg !== "-p" &&
    arg !== "--bulk" &&
    arg !== "--file" &&
    arg !== "-f" &&
    (fileFlagIndex === -1 || idx !== fileFlagIndex + 1)
);

let name = filteredArgs[0];
let email = filteredArgs[1];
let password = filteredArgs[2];

// 2. Tentukan file environment (.env atau .env.production)
let selectedEnvFile = isExplicitProd ? ".env.production" : ".env";
let isBulkMode = isBulkFlag;

// Jika interactive mode tanpa argumen spesifik:
if (!name && !email && !password && !isExplicitProd && !isBulkFlag) {
  console.log("\n========================================================");
  console.log("     MIA 2026 - PEMBUATAN AKUN ADMIN (CLI UTILITY)      ");
  console.log("========================================================\n");

  const rlSetup = readline.createInterface({ input, output });
  try {
    console.log("Pilih Target Database:");
    console.log(" [1] Lokal       (.env            -> localhost / local db)");
    console.log(" [2] Production  (.env.production -> Neon Cloud DB)\n");
    const dbChoice = (await rlSetup.question("Masukkan pilihan database [1/2] (Default 1): ")).trim();
    if (dbChoice === "2") {
      selectedEnvFile = ".env.production";
    }

    console.log("\nPilih Mode Pembuatan:");
    console.log(" [1] Buat 1 Akun Admin (Interaktif)");
    console.log(" [2] Bulk Import Sekaligus (dari file admins.json)\n");
    const modeChoice = (await rlSetup.question("Masukkan pilihan mode [1/2] (Default 1): ")).trim();
    if (modeChoice === "2") {
      isBulkMode = true;
    }
  } finally {
    rlSetup.close();
  }
}

// 3. Load file .env yang dipilih
const envFullPath = path.resolve(process.cwd(), selectedEnvFile);
if (fs.existsSync(envFullPath)) {
  dotenv.config({ path: envFullPath, override: true });
} else {
  dotenv.config();
}

// 4. Import dynamic DB setelah env dimuat agar koneksi database sesuai
const { db } = await import("./index.js");
const schema = await import("./schema.js");
const { eq } = await import("drizzle-orm");

// Helper untuk parse info database yang ramah dibaca
const parseDbTarget = (url) => {
  if (!url) return { envName: "Tidak Ditemukan", host: "-", database: "-" };
  try {
    const cleanUrl = url.replace("postgresql://", "http://").replace("postgres://", "http://");
    const parsed = new URL(cleanUrl);
    const isNeon = parsed.hostname.includes("neon.tech");
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const dbName = parsed.pathname.replace(/^\//, "");

    let envName = "LOKAL (Localhost)";
    if (isNeon || process.env.NODE_ENV === "production" || selectedEnvFile === ".env.production") {
      envName = "PRODUCTION (Neon Cloud)";
    } else if (isLocal) {
      envName = "LOKAL (Localhost PostgreSQL)";
    } else {
      envName = `CUSTOM HOST (${parsed.hostname})`;
    }

    return {
      envName,
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: dbName,
    };
  } catch {
    return { envName: "CUSTOM", host: "unknown", database: "unknown" };
  }
};

const dbInfo = parseDbTarget(process.env.DATABASE_URL);

console.log("\n========================================================");
console.log(`🎯 TARGET DATABASE : ${dbInfo.envName}`);
console.log(`📁 File Config     : ${selectedEnvFile}`);
console.log(`📍 Host Server     : ${dbInfo.host}`);
console.log(`📦 Nama Database   : ${dbInfo.database}`);
console.log(`⚙️  Mode Eksekusi   : ${isBulkMode ? "BULK IMPORT (BANYAK AKUN)" : "SINGLE ADMIN"}`);
console.log("========================================================\n");

// Fungsi helper untuk memproses satu akun admin
async function processAdminRecord({ name, email, password }) {
  const cleanName = name ? name.trim() : "";
  const cleanEmail = email ? email.trim().toLowerCase() : "";
  const cleanPass = password ? password.trim() : "";

  if (!cleanName || cleanName.length < 3) {
    return { success: false, email: cleanEmail, reason: "Nama minimal 3 karakter" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, email: cleanEmail, reason: "Format email tidak valid" };
  }
  if (!cleanPass || cleanPass.length < 6) {
    return { success: false, email: cleanEmail, reason: "Password minimal 6 karakter" };
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(cleanPass, saltRounds);

  const [existingUser] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.email, cleanEmail))
    .limit(1);

  if (existingUser) {
    const adminId = existingUser.users_id;
    await db
      .update(schema.User)
      .set({
        name: cleanName,
        password: hashedPassword,
        role: "ADMIN",
        is_verified: true,
        updated_by: adminId,
        updated_at: new Date(),
      })
      .where(eq(schema.User.email, cleanEmail));

    return { success: true, email: cleanEmail, name: cleanName, action: "UPDATED (DIUPGRADE KE ADMIN)" };
  } else {
    const newAdminId = generateCuid();
    await db.insert(schema.User).values({
      users_id: newAdminId,
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: "ADMIN",
      is_verified: true,
      created_by: newAdminId,
      updated_by: newAdminId,
    });

    return { success: true, email: cleanEmail, name: cleanName, action: "CREATED (BARU DIBUAT)" };
  }
}

async function handleBulkMode() {
  let targetPath = jsonFilePath;

  if (!targetPath) {
    // Default cari file admins.json di direktori aktif
    if (fs.existsSync(path.resolve(process.cwd(), "admins.json"))) {
      targetPath = "admins.json";
    } else {
      const rl = readline.createInterface({ input, output });
      try {
        console.log("ℹ️  File 'admins.json' tidak ditemukan di root backend.");
        console.log("   Gunakan template dari 'admins.example.json'.");
        targetPath = (await rl.question("Masukkan path file JSON admin: ")).trim();
      } finally {
        rl.close();
      }
    }
  }

  const fullJsonPath = path.resolve(process.cwd(), targetPath);
  if (!fs.existsSync(fullJsonPath)) {
    console.error(`❌ Error: File JSON tidak ditemukan di '${fullJsonPath}'.`);
    console.log("💡 Tip: Buat file 'admins.json' atau copy dari 'admins.example.json'.");
    process.exit(1);
  }

  let adminList;
  try {
    const rawContent = fs.readFileSync(fullJsonPath, "utf8");
    adminList = JSON.parse(rawContent);
    if (!Array.isArray(adminList)) {
      throw new Error("Isi file JSON harus berupa array objek [...]");
    }
  } catch (err) {
    console.error(`❌ Gagal membaca file JSON: ${err.message}`);
    process.exit(1);
  }

  console.log(`📄 Membaca ${adminList.length} data admin dari '${targetPath}'...`);
  console.log(`⏳ Memproses penyimpanan ke ${dbInfo.envName}...\n`);

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (let i = 0; i < adminList.length; i++) {
    const item = adminList[i];
    const res = await processAdminRecord(item);
    if (res.success) {
      successCount++;
      results.push(` [${i + 1}] ✅ ${res.email} (${res.name}) -> ${res.action}`);
    } else {
      failCount++;
      results.push(` [${i + 1}] ❌ ${item.email || "Tanpa Email"} -> GAGAL: ${res.reason}`);
    }
  }

  console.log("========================================================");
  console.log("             HASIL BULK IMPORT ADMIN                    ");
  console.log("========================================================");
  results.forEach((r) => console.log(r));
  console.log("--------------------------------------------------------");
  console.log(`Total Diproses : ${adminList.length}`);
  console.log(`Berhasil       : ${successCount}`);
  console.log(`Gagal          : ${failCount}`);
  console.log(`Target DB      : ${dbInfo.envName} (${dbInfo.database})`);
  console.log("========================================================");
  console.log("👉 Seluruh akun admin yang berhasil sekarang dapat login di web /login\n");
}

async function handleSingleMode() {
  if (!name || !email || !password) {
    const rl = readline.createInterface({ input, output });
    try {
      if (!name) name = (await rl.question("Masukkan Nama Lengkap Admin: ")).trim();
      if (!email) email = (await rl.question("Masukkan Email Admin: ")).trim().toLowerCase();
      if (!password) password = (await rl.question("Masukkan Password Admin (min 6 karakter): ")).trim();
    } finally {
      rl.close();
    }
  }

  console.log(`\n⏳ Menghubungkan ke ${dbInfo.envName} dan memproses akun ${email}...`);

  const res = await processAdminRecord({ name, email, password });
  if (!res.success) {
    console.error(`❌ Gagal: ${res.reason}`);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log(`✅ SUKSES: Akun Admin ${res.action} di ${dbInfo.envName}!`);
  console.log("========================================================");
  console.log(`- Nama     : ${res.name}`);
  console.log(`- Email    : ${res.email}`);
  console.log(`- Role     : ADMIN`);
  console.log(`- Status   : Verified (Aktif)`);
  console.log(`- Database : ${dbInfo.envName} (${dbInfo.database})`);
  console.log("--------------------------------------------------------");
  console.log("👉 Akun ini sekarang dapat langsung login di web via /login\n");
}

async function run() {
  if (isBulkMode) {
    await handleBulkMode();
  } else {
    await handleSingleMode();
  }
}

run()
  .catch((err) => {
    console.error("\n❌ Terjadi kesalahan saat memproses admin:", err.message);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
