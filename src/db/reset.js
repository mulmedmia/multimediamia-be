import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
import { db } from "./index.js";
import * as schema from "./schema.js";
import { generateCuid } from "./cuid.js";
import { runMigrations } from "./migrate.js";
import bcrypt from "bcrypt";

dotenv.config();

async function resetAndMigrate() {
  console.log(" Wiping database schema...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE;");
  await client.query("CREATE SCHEMA public;");
  await client.end();
  console.log(" Database wiped successfully!");

  // Run migrations using the robust custom runner
  await runMigrations();

  console.log(" Seeding initial admin...");
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME;

  if (!adminPassword || !adminEmail || !adminName) {
    throw new Error("ADMIN_PASSWORD, ADMIN_EMAIL, and ADMIN_NAME environment variables are required");
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

  await db.insert(schema.User).values({
    users_id: generateCuid(),
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: "ADMIN",
    is_verified: true,
  });
  console.log(` Admin user seeded: ${adminEmail}`);
  console.log(" Database reset completed successfully!");
}

resetAndMigrate().catch((err) => {
  console.error("❌ Reset failed:", err);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
