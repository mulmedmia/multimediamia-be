import { db } from "./index.js";
import * as schema from "./schema.js";
import { eq, or } from "drizzle-orm";
import { generateCuid } from "./cuid.js";
import dotenv from "dotenv";

dotenv.config();

export const DEFAULT_CATEGORIES = [
  {
    name: "Web In Action",
    slug: "WIA",
    description: "Kompetisi pembuatan dan pengembangan aplikasi website Web In Action (WIA) - Multimedia In Action 2026.",
    organizer: "Panitia MIA 2026",
    team_type: "GROUP",
    status: "VERIFIED",
    is_submission_open: true,
    allow_revision: false,
    image: "https://placehold.co/800x450/1E2939/FFF9F5?text=Web+In+Action",
    file_url: null,
  },
  {
    name: "UI/UX In Action",
    slug: "UIA",
    description: "Kompetisi perancangan desain antarmuka dan pengalaman pengguna UI/UX In Action (UIA) - Multimedia In Action 2026.",
    organizer: "Panitia MIA 2026",
    team_type: "GROUP",
    status: "VERIFIED",
    is_submission_open: true,
    allow_revision: false,
    image: "https://placehold.co/800x450/1E2939/FFF9F5?text=UI%2FUX+In+Action",
    file_url: null,
  },
];

/**
 * Seed default categories into the database
 * @param {string} [adminUserId] - ID of the admin user to be assigned as category owner
 */
export async function seedCategories(adminUserId = null) {
  let userId = adminUserId;

  // Jika adminUserId tidak diberikan, cari user admin di database
  if (!userId) {
    const [adminUser] = await db
      .select({ users_id: schema.User.users_id })
      .from(schema.User)
      .where(eq(schema.User.role, "ADMIN"))
      .limit(1);

    if (adminUser) {
      userId = adminUser.users_id;
    } else {
      const [anyUser] = await db
        .select({ users_id: schema.User.users_id })
        .from(schema.User)
        .limit(1);

      if (anyUser) {
        userId = anyUser.users_id;
      } else {
        throw new Error(
          "Tidak ditemukan user di database untuk dijadikan pemilik kategori. Silakan jalankan seed admin terlebih dahulu."
        );
      }
    }
  }

  const now = new Date();
  const startDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 hari ke depan
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 hari ke depan
  const preliminaryDeadline = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 hari ke depan
  const finalDeadline = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 hari ke depan

  console.log("🌱 Menjalankan seeder kategori default...");

  for (const cat of DEFAULT_CATEGORIES) {
    // Cek apakah kategori sudah ada berdasarkan slug atau name
    const [existing] = await db
      .select()
      .from(schema.Category)
      .where(or(eq(schema.Category.slug, cat.slug), eq(schema.Category.name, cat.name)))
      .limit(1);

    if (existing) {
      console.log(`ℹ️  Kategori "${cat.name}" (${cat.slug}) sudah ada di database. Dilewati.`);
    } else {
      const categoryId = generateCuid();
      await db.insert(schema.Category).values({
        category_id: categoryId,
        user_id: userId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        organizer: cat.organizer,
        startDate: startDate,
        endDate: endDate,
        deadline: finalDeadline,
        preliminary_deadline: preliminaryDeadline,
        final_deadline: finalDeadline,
        is_submission_open: cat.is_submission_open,
        allow_revision: cat.allow_revision,
        image: cat.image,
        file_url: cat.file_url,
        team_type: cat.team_type,
        status: cat.status,
        created_by: userId,
        updated_by: userId,
      });
      console.log(`✅ Kategori "${cat.name}" (${cat.slug}) berhasil dibuat! (ID: ${categoryId})`);
    }
  }

  console.log("✨ Seeding kategori default selesai.");
}

// Jalankan langsung jika dipanggil via node src/db/seed-categories.js
const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("seed-categories.js");
if (isDirectRun) {
  seedCategories()
    .catch((e) => {
      console.error("❌ Terjadi kesalahan saat seeding kategori:", e);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
