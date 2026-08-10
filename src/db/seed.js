import { db } from "./index.js";
import * as schema from "./schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { generateCuid } from "./cuid.js";

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
  const [existingAdmin] = await db
    .select()
    .from(schema.User)
    .where(eq(schema.User.email, adminEmail))
    .limit(1);

  if (existingAdmin) {
    await db
      .update(schema.User)
      .set({
        name: adminName,
        password: hashedPassword,
        role: "ADMIN",
        is_verified: true,
        updated_at: new Date()
      })
      .where(eq(schema.User.email, adminEmail));
    console.log(`Admin user updated: ${adminEmail}`);
  } else {
    await db.insert(schema.User).values({
      users_id: generateCuid(),
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "ADMIN",
      is_verified: true,
    });
    console.log(`Admin user created: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
