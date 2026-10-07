import { db } from "./index.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { generateCuid } from "./cuid.js";
import { seedCategories } from "./seed-categories.js";

dotenv.config();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME;

  if (!adminPassword || !adminEmail || !adminName) {
    throw new Error("ADMIN_PASSWORD, ADMIN_EMAIL, and ADMIN_NAME environment variables are required");
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

  // Check if admin user already exists
  let adminId;
  const [existingAdmin] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.email, adminEmail))
    .limit(1);

  if (existingAdmin) {
    adminId = existingAdmin.users_id;
    await db
      .update(schema.User)
      .set({
        name: adminName,
        password: hashedPassword,
        role: "ADMIN",
        is_verified: true,
        updated_by: adminId,
        updated_at: new Date()
      })
      .where(eq(schema.User.email, adminEmail));
    console.log(`Admin user updated: ${adminEmail}`);
  } else {
    adminId = generateCuid();
    await db.insert(schema.User).values({
      users_id: adminId,
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      is_verified: true,
      created_by: adminId,
      updated_by: adminId,
    });
    console.log(`Admin user created: ${adminEmail}`);
  }

  // Seed Finance user
  const financeEmail = process.env.FINANCE_EMAIL || "finance@mia2026.com";
  const financeName = process.env.FINANCE_NAME || "Finance Officer MIA 2026";
  const financePassword = process.env.FINANCE_PASSWORD || "finance_password_mia2026";
  const hashedFinancePassword = await bcrypt.hash(financePassword, saltRounds);

  const [existingFinance] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.email, financeEmail))
    .limit(1);

  if (existingFinance) {
    await db
      .update(schema.User)
      .set({
        name: financeName,
        password: hashedFinancePassword,
        role: "FINANCE",
        is_verified: true,
        updated_by: existingFinance.users_id,
        updated_at: new Date(),
      })
      .where(eq(schema.User.email, financeEmail));
    console.log(`Finance user updated: ${financeEmail}`);
  } else {
    const financeId = generateCuid();
    await db.insert(schema.User).values({
      users_id: financeId,
      name: financeName,
      email: financeEmail,
      password: hashedFinancePassword,
      role: "FINANCE",
      is_verified: true,
      created_by: adminId,
      updated_by: adminId,
    });
    console.log(`Finance user created: ${financeEmail}`);
  }

  // Seed default categories
  await seedCategories(adminId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
