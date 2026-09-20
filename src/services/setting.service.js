import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

const DEFAULT_GUIDEBOOK_URL =
  "https://drive.google.com/drive/folders/1x34lDmoqSFdOfsxUpxpe2KiAaGT2zk5m?usp=sharing";

/**
 * Get setting value by key with optional fallback
 */
export const getSetting = async (key, fallback = "") => {
  const [row] = await db
    .select()
    .from(schema.AppSetting)
    .where(eq(schema.AppSetting.key, key))
    .limit(1);

  if (!row) {
    return fallback;
  }

  return row.value || fallback;
};

/**
 * Upsert a setting key and value
 */
export const setSetting = async (key, value, description = null, userId = null) => {
  const [existing] = await db
    .select()
    .from(schema.AppSetting)
    .where(eq(schema.AppSetting.key, key))
    .limit(1);

  if (existing) {
    const updatePayload = {
      value,
      description: description ?? existing.description,
      updated_at: new Date(),
    };
    if (userId) {
      updatePayload.updated_by = userId;
    }

    const [updated] = await db
      .update(schema.AppSetting)
      .set(updatePayload)
      .where(eq(schema.AppSetting.key, key))
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(schema.AppSetting)
      .values({
        key,
        value,
        description,
        created_by: userId || null,
        updated_by: userId || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return inserted;
  }
};

/**
 * Helper to get the guidebook URL
 */
export const getGuidebookUrl = async () => {
  return await getSetting("guidebook_url", DEFAULT_GUIDEBOOK_URL);
};

/**
 * Helper to update the guidebook URL
 */
export const updateGuidebookUrl = async (url, userId = null) => {
  return await setSetting(
    "guidebook_url",
    url,
    "Link Google Drive Guidebook Utama MIA 2026",
    userId
  );
};
