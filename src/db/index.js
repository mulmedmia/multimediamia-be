import pkg from "pg";
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  options: "-c timezone=UTC", // Pastikan setiap sesi koneksi PostgreSQL selalu beroperasi dalam zona waktu UTC
  max: 15, // Batasi koneksi maksimal agar tidak melebihi kuota Neon Free Tier
  idleTimeoutMillis: 30000, // Tutup koneksi idle setelah 30 detik untuk menghindari socket hang saat Neon auto-suspend
  connectionTimeoutMillis: 10000, // Timeout koneksi 10 detik
  ssl:
    connectionString?.includes("sslmode=require") || isProduction
      ? { rejectUnauthorized: false }
      : undefined,
});

// Tangani error pada idle client agar Node process tidak crash jika Neon memutus idle socket di background
pool.on("error", (err) => {
  console.error("⚠️ Unexpected error on idle PostgreSQL client:", err.message);
});

export const db = drizzle(pool, { schema });
