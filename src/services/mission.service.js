import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, ilike, and, sql, desc } from "drizzle-orm";
import { generateCuid } from "../db/cuid.js";

/**
 * Membuat misi harian baru
 */
export const createMission = async (data) => {
  const missionId = generateCuid();
  const [newMission] = await db
    .insert(schema.Mission)
    .values({
      mission_id: missionId,
      title: data.title,
      description: data.description,
      deadline: new Date(data.deadline),
      min_xp: data.min_xp,
      max_xp: data.max_xp,
      min_diamond: data.min_diamond,
      max_diamond: data.max_diamond,
      google_docs_url: data.google_docs_url,
      status: data.status || "ACTIVE",
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return newMission;
};

/**
 * Mengambil daftar seluruh misi harian (dengan filter & pagination)
 */
export const getAllMissions = async (filters = {}) => {
  const { page = 1, limit = 10, search, status } = filters;
  const skip = (Number(page) - 1) * Number(limit);

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(schema.Mission.title, `%${search}%`),
        ilike(schema.Mission.description, `%${search}%`)
      )
    );
  }

  if (status) {
    conditions.push(eq(schema.Mission.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [missions, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.Mission)
      .where(whereClause)
      .orderBy(desc(schema.Mission.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Mission)
      .where(whereClause),
  ]);

  const total = Number(countResult?.count || 0);

  return {
    missions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Mengambil detail misi harian berdasarkan ID
 */
export const getMissionById = async (missionId) => {
  const [mission] = await db
    .select()
    .from(schema.Mission)
    .where(eq(schema.Mission.mission_id, missionId))
    .limit(1);

  if (!mission) {
    throw new Error("Mission not found");
  }

  return mission;
};

/**
 * Mengedit data misi harian
 */
export const updateMission = async (missionId, data) => {
  const existing = await getMissionById(missionId);

  // Validasi rentang jika salah satu batas diupdate
  const finalMinXp = data.min_xp !== undefined ? data.min_xp : existing.min_xp;
  const finalMaxXp = data.max_xp !== undefined ? data.max_xp : existing.max_xp;
  if (finalMaxXp < finalMinXp) {
    throw new Error("max_xp cannot be less than min_xp");
  }

  const finalMinDiamond =
    data.min_diamond !== undefined ? data.min_diamond : existing.min_diamond;
  const finalMaxDiamond =
    data.max_diamond !== undefined ? data.max_diamond : existing.max_diamond;
  if (finalMaxDiamond < finalMinDiamond) {
    throw new Error("max_diamond cannot be less than min_diamond");
  }

  const updatePayload = {
    ...data,
    updated_at: new Date(),
  };

  if (data.deadline) {
    updatePayload.deadline = new Date(data.deadline);
  }

  const [updatedMission] = await db
    .update(schema.Mission)
    .set(updatePayload)
    .where(eq(schema.Mission.mission_id, missionId))
    .returning();

  return updatedMission;
};

/**
 * Menghapus data misi harian
 */
export const deleteMission = async (missionId) => {
  await getMissionById(missionId);

  const [deleted] = await db
    .delete(schema.Mission)
    .where(eq(schema.Mission.mission_id, missionId))
    .returning();

  return deleted;
};

/**
 * Mengambil daftar pengumpulan peserta pada misi tertentu
 */
export const getMissionSubmissions = async (missionId, filters = {}) => {
  // Pastikan misi ada
  await getMissionById(missionId);

  const { page = 1, limit = 10, search, status } = filters;
  const skip = (Number(page) - 1) * Number(limit);

  const conditions = [eq(schema.MissionSubmission.mission_id, missionId)];

  if (status) {
    conditions.push(eq(schema.MissionSubmission.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(schema.User.name, `%${search}%`),
        ilike(schema.User.email, `%${search}%`),
        ilike(schema.MissionSubmission.submission_url, `%${search}%`)
      )
    );
  }

  const whereClause = and(...conditions);

  const [rows, [countResult]] = await Promise.all([
    db
      .select({
        submission_id: schema.MissionSubmission.submission_id,
        mission_id: schema.MissionSubmission.mission_id,
        user_id: schema.MissionSubmission.user_id,
        submission_url: schema.MissionSubmission.submission_url,
        notes: schema.MissionSubmission.notes,
        status: schema.MissionSubmission.status,
        awarded_xp: schema.MissionSubmission.awarded_xp,
        awarded_diamond: schema.MissionSubmission.awarded_diamond,
        admin_feedback: schema.MissionSubmission.admin_feedback,
        reviewed_at: schema.MissionSubmission.reviewed_at,
        created_at: schema.MissionSubmission.created_at,
        updated_at: schema.MissionSubmission.updated_at,
        user: {
          users_id: schema.User.users_id,
          name: schema.User.name,
          email: schema.User.email,
          nim: schema.User.nim,
        },
      })
      .from(schema.MissionSubmission)
      .leftJoin(
        schema.User,
        eq(schema.MissionSubmission.user_id, schema.User.users_id)
      )
      .where(whereClause)
      .orderBy(desc(schema.MissionSubmission.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.MissionSubmission)
      .leftJoin(
        schema.User,
        eq(schema.MissionSubmission.user_id, schema.User.users_id)
      )
      .where(whereClause),
  ]);

  const total = Number(countResult?.count || 0);

  return {
    submissions: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};
