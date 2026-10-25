import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, ilike, and, sql, desc, isNull, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";

const creatorUser = alias(schema.User, "creatorUser");
const updaterUser = alias(schema.User, "updaterUser");
const subReg = alias(schema.Registration, "subReg");
const subRegCategory = alias(schema.Category, "subRegCategory");

/**
 * Membuat misi harian baru
 */
export const createMission = async (data, adminId = null) => {
  const missionId = generateCuid();
  const [newMission] = await db
    .insert(schema.Mission)
    .values({
      mission_id: missionId,
      category_id: data.category_id || null,
      title: data.title,
      description: data.description,
      deadline: new Date(data.deadline),
      min_xp: data.min_xp,
      max_xp: data.max_xp,
      min_diamond: data.min_diamond,
      max_diamond: data.max_diamond,
      google_docs_url: data.google_docs_url,
      status: data.status || "ACTIVE",
      created_by: adminId || null,
      updated_by: adminId || null,
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
  const { page = 1, limit = 10, search, status, category_id } = filters;
  const skip = (Number(page) - 1) * Number(limit);

  const conditions = [];

  if (category_id) {
    if (category_id.toLowerCase() === "global") {
      conditions.push(isNull(schema.Mission.category_id));
    } else {
      conditions.push(eq(schema.Mission.category_id, category_id));
    }
  }

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

  const [rows, [countResult]] = await Promise.all([
    db
      .select({
        mission: schema.Mission,
        category: schema.Category,
        creator: { name: creatorUser.name, email: creatorUser.email },
        updater: { name: updaterUser.name, email: updaterUser.email },
      })
      .from(schema.Mission)
      .leftJoin(schema.Category, eq(schema.Mission.category_id, schema.Category.category_id))
      .leftJoin(creatorUser, eq(schema.Mission.created_by, creatorUser.users_id))
      .leftJoin(updaterUser, eq(schema.Mission.updated_by, updaterUser.users_id))
      .where(whereClause)
      .orderBy(desc(schema.Mission.deadline))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Mission)
      .where(whereClause),
  ]);

  const missions = rows.map((row) => ({
    ...row.mission,
    category: row.category
      ? {
          category_id: row.category.category_id,
          name: row.category.name,
          category_name: row.category.name,
          slug: row.category.slug,
        }
      : null,
    created_by_name: row.creator?.name || row.mission.created_by || "-",
    updated_by_name: row.updater?.name || row.mission.updated_by || "-",
  }));

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
  const [row] = await db
    .select({
      mission: schema.Mission,
      category: schema.Category,
      creator: { name: creatorUser.name, email: creatorUser.email },
      updater: { name: updaterUser.name, email: updaterUser.email },
    })
    .from(schema.Mission)
    .leftJoin(schema.Category, eq(schema.Mission.category_id, schema.Category.category_id))
    .leftJoin(creatorUser, eq(schema.Mission.created_by, creatorUser.users_id))
    .leftJoin(updaterUser, eq(schema.Mission.updated_by, updaterUser.users_id))
    .where(eq(schema.Mission.mission_id, missionId))
    .limit(1);

  if (!row) {
    throw new Error("Mission not found");
  }

  return {
    ...row.mission,
    category: row.category
      ? {
          category_id: row.category.category_id,
          name: row.category.name,
          category_name: row.category.name,
          slug: row.category.slug,
        }
      : null,
    created_by_name: row.creator?.name || row.mission.created_by || "-",
    updated_by_name: row.updater?.name || row.mission.updated_by || "-",
  };
};

/**
 * Mengedit data misi harian
 */
export const updateMission = async (missionId, data, adminId = null) => {
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

  if (data.category_id !== undefined) {
    updatePayload.category_id = data.category_id || null;
  }

  if (adminId) {
    updatePayload.updated_by = adminId;
  }

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
  const isAll = !missionId || missionId === "all";

  // Pastikan misi ada jika bukan all
  if (!isAll) {
    await getMissionById(missionId);
  }

  const { page = 1, limit = 10, search, status, category_id } = filters;
  const skip = (Number(page) - 1) * Number(limit);

  const conditions = [];

  if (!isAll) {
    conditions.push(eq(schema.MissionSubmission.mission_id, missionId));
  }

  if (category_id) {
    if (category_id.toLowerCase() === "global") {
      conditions.push(isNull(schema.Mission.category_id));
    } else {
      conditions.push(eq(schema.Mission.category_id, category_id));
    }
  }

  if (status) {
    conditions.push(eq(schema.MissionSubmission.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(schema.User.name, `%${search}%`),
        ilike(schema.User.email, `%${search}%`),
        ilike(schema.MissionSubmission.submission_url, `%${search}%`),
        ilike(schema.Mission.title, `%${search}%`),
        ilike(subReg.team_name, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countResult]] = await Promise.all([
    db
      .select({
        submission_id: schema.MissionSubmission.submission_id,
        mission_id: schema.MissionSubmission.mission_id,
        user_id: schema.MissionSubmission.user_id,
        registration_id: schema.MissionSubmission.registration_id,
        submission_url: schema.MissionSubmission.submission_url,
        notes: schema.MissionSubmission.notes,
        status: schema.MissionSubmission.status,
        awarded_xp: schema.MissionSubmission.awarded_xp,
        awarded_diamond: schema.MissionSubmission.awarded_diamond,
        admin_feedback: schema.MissionSubmission.admin_feedback,
        reviewed_at: schema.MissionSubmission.reviewed_at,
        created_by: schema.MissionSubmission.created_by,
        updated_by: schema.MissionSubmission.updated_by,
        creator: { name: creatorUser.name, email: creatorUser.email },
        updater: { name: updaterUser.name, email: updaterUser.email },
        created_at: schema.MissionSubmission.created_at,
        updated_at: schema.MissionSubmission.updated_at,
        user: {
          users_id: schema.User.users_id,
          name: schema.User.name,
          email: schema.User.email,
          nim: schema.User.nim,
        },
        registration: {
          registration_id: subReg.registration_id,
          team_name: subReg.team_name,
          category_id: subReg.category_id,
          category_name: subRegCategory.name,
          category_slug: subRegCategory.slug,
        },
        mission: {
          mission_id: schema.Mission.mission_id,
          category_id: schema.Mission.category_id,
          title: schema.Mission.title,
          min_xp: schema.Mission.min_xp,
          max_xp: schema.Mission.max_xp,
          min_diamond: schema.Mission.min_diamond,
          max_diamond: schema.Mission.max_diamond,
        },
        category: {
          category_id: schema.Category.category_id,
          name: schema.Category.name,
          category_name: schema.Category.name,
          slug: schema.Category.slug,
        },
      })
      .from(schema.MissionSubmission)
      .leftJoin(
        schema.User,
        eq(schema.MissionSubmission.user_id, schema.User.users_id)
      )
      .leftJoin(
        subReg,
        eq(schema.MissionSubmission.registration_id, subReg.registration_id)
      )
      .leftJoin(
        subRegCategory,
        eq(subReg.category_id, subRegCategory.category_id)
      )
      .leftJoin(
        schema.Mission,
        eq(schema.MissionSubmission.mission_id, schema.Mission.mission_id)
      )
      .leftJoin(
        schema.Category,
        eq(schema.Mission.category_id, schema.Category.category_id)
      )
      .leftJoin(
        creatorUser,
        eq(schema.MissionSubmission.created_by, creatorUser.users_id)
      )
      .leftJoin(
        updaterUser,
        eq(schema.MissionSubmission.updated_by, updaterUser.users_id)
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
      .leftJoin(
        subReg,
        eq(schema.MissionSubmission.registration_id, subReg.registration_id)
      )
      .leftJoin(
        schema.Mission,
        eq(schema.MissionSubmission.mission_id, schema.Mission.mission_id)
      )
      .where(whereClause),
  ]);

  // Untuk submission lama yang belum memiliki registration_id (null),
  // ambil daftar registrasi user agar Admin tetap dapat melihat/memilih tim peserta.
  const userIdsWithoutReg = [
    ...new Set(
      rows
        .filter((r) => !r.registration?.registration_id && r.user_id)
        .map((r) => r.user_id)
    ),
  ];

  const userRegsMap = new Map();
  if (userIdsWithoutReg.length > 0) {
    const fallbackRegs = await db
      .select({
        registration_id: schema.Registration.registration_id,
        user_id: schema.Registration.user_id,
        team_name: schema.Registration.team_name,
        category_id: schema.Registration.category_id,
        category_name: schema.Category.name,
        category_slug: schema.Category.slug,
      })
      .from(schema.Registration)
      .leftJoin(
        schema.Category,
        eq(schema.Registration.category_id, schema.Category.category_id)
      )
      .where(inArray(schema.Registration.user_id, userIdsWithoutReg));

    for (const reg of fallbackRegs) {
      if (!userRegsMap.has(reg.user_id)) {
        userRegsMap.set(reg.user_id, []);
      }
      userRegsMap.get(reg.user_id).push(reg);
    }
  }

  const submissions = rows.map((row) => {
    let resolvedReg = row.registration?.registration_id ? row.registration : null;
    const candidateRegs = userRegsMap.get(row.user_id) || [];

    if (!resolvedReg && candidateRegs.length > 0) {
      if (row.mission?.category_id) {
        resolvedReg =
          candidateRegs.find((r) => r.category_id === row.mission.category_id) ||
          null;
      } else if (candidateRegs.length === 1) {
        resolvedReg = candidateRegs[0];
      }
    }

    return {
      ...row,
      registration: resolvedReg,
      user_registrations: candidateRegs,
      created_by_name:
        row.creator?.name || row.user?.name || row.created_by || "-",
      updated_by_name: row.updater?.name || row.updated_by || "-",
    };
  });

  const total = Number(countResult?.count || 0);

  return {
    submissions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// ==========================================
// Participant Mission Functions 
// ==========================================

/**
 * Helper untuk meresolusi registration_id milik user dari parameter registrationId atau categoryId.
 */
const resolveParticipantRegistration = async (
  userId,
  registrationId = null,
  categoryId = null
) => {
  if (registrationId) {
    const [reg] = await db
      .select({
        registration_id: schema.Registration.registration_id,
        category_id: schema.Registration.category_id,
        team_name: schema.Registration.team_name,
      })
      .from(schema.Registration)
      .where(
        and(
          eq(schema.Registration.registration_id, registrationId),
          eq(schema.Registration.user_id, userId)
        )
      )
      .limit(1);
    if (reg) return reg;
  }

  if (categoryId) {
    const [reg] = await db
      .select({
        registration_id: schema.Registration.registration_id,
        category_id: schema.Registration.category_id,
        team_name: schema.Registration.team_name,
      })
      .from(schema.Registration)
      .where(
        and(
          eq(schema.Registration.user_id, userId),
          eq(schema.Registration.category_id, categoryId)
        )
      )
      .limit(1);
    if (reg) return reg;
  }

  return null;
};

/**
 * Mengambil seluruh misi aktif beserta status pengumpulan milik user yang sedang login.
 * Setiap misi akan memiliki field `my_submission` (object | null) sesuai tim/registrasi yang aktif.
 */
export const getActiveMissionsForUser = async (
  userId,
  categoryId = null,
  registrationId = null
) => {
  const activeReg = await resolveParticipantRegistration(
    userId,
    registrationId,
    categoryId
  );
  const targetRegId = activeReg?.registration_id || null;
  const effectiveCategoryId = categoryId || activeReg?.category_id || null;

  const whereConditions = [or(
    eq(schema.Mission.status, "ACTIVE"), 
    eq(schema.Mission.status, "EXPIRED")
  )];
  
  if (effectiveCategoryId) {
    whereConditions.push(
      or(
        eq(schema.Mission.category_id, effectiveCategoryId),
        isNull(schema.Mission.category_id)
      )
    );
  }

  // Cek apakah user memiliki > 1 registrasi (multi-tim)
  // Jika multi-tim, submission lama yang registration_id = null pada misi global tidak boleh
  // otomatis mengunci tim lain yang belum pernah submit, kecuali mission.category_id cocok.
  const userRegs = await db
    .select({
      registration_id: schema.Registration.registration_id,
      category_id: schema.Registration.category_id,
    })
    .from(schema.Registration)
    .where(eq(schema.Registration.user_id, userId));

  const isMultiTeamUser = userRegs.length > 1;

  const subJoinConditions = [
    eq(schema.MissionSubmission.mission_id, schema.Mission.mission_id),
    eq(schema.MissionSubmission.user_id, userId),
  ];

  if (targetRegId) {
    if (isMultiTeamUser) {
      // Untuk user multi-tim: cocokkan registration_id spesifik tim ini,
      // atau legacy null HANYA jika misi tersebut memang spesifik untuk kategori tim ini
      subJoinConditions.push(
        or(
          eq(schema.MissionSubmission.registration_id, targetRegId),
          and(
            isNull(schema.MissionSubmission.registration_id),
            eq(schema.Mission.category_id, activeReg.category_id)
          )
        )
      );
    } else {
      subJoinConditions.push(
        or(
          eq(schema.MissionSubmission.registration_id, targetRegId),
          isNull(schema.MissionSubmission.registration_id)
        )
      );
    }
  }

  // Query semua misi ACTIVE, left join dengan submission milik user dan kategori
  const rows = await db
    .select({
      mission_id: schema.Mission.mission_id,
      category_id: schema.Mission.category_id,
      title: schema.Mission.title,
      description: schema.Mission.description,
      deadline: schema.Mission.deadline,
      min_xp: schema.Mission.min_xp,
      max_xp: schema.Mission.max_xp,
      min_diamond: schema.Mission.min_diamond,
      max_diamond: schema.Mission.max_diamond,
      google_docs_url: schema.Mission.google_docs_url,
      status: schema.Mission.status,
      created_at: schema.Mission.created_at,
      category: schema.Category,
      // Submission milik user (nullable)
      sub_id: schema.MissionSubmission.submission_id,
      sub_registration_id: schema.MissionSubmission.registration_id,
      sub_url: schema.MissionSubmission.submission_url,
      sub_notes: schema.MissionSubmission.notes,
      sub_status: schema.MissionSubmission.status,
      sub_awarded_xp: schema.MissionSubmission.awarded_xp,
      sub_awarded_diamond: schema.MissionSubmission.awarded_diamond,
      sub_admin_feedback: schema.MissionSubmission.admin_feedback,
      sub_created_at: schema.MissionSubmission.created_at,
    })
    .from(schema.Mission)
    .leftJoin(schema.Category, eq(schema.Mission.category_id, schema.Category.category_id))
    .leftJoin(schema.MissionSubmission, and(...subJoinConditions))
    .where(and(...whereConditions))
    .orderBy(
      desc(schema.Mission.deadline),
      sql`CASE WHEN ${schema.MissionSubmission.registration_id} IS NOT NULL THEN 0 ELSE 1 END`,
      desc(schema.MissionSubmission.created_at)
    );

  // Deduplicate: jika user punya >1 submission (misal REJECTED lalu resubmit),
  // LEFT JOIN menghasilkan multiple rows per misi. Ambil hanya yang terbaru.
  const missionMap = new Map();
  for (const row of rows) {
    // Karena rows di-order desc by created_at, row pertama per mission_id = terbaru
    if (!missionMap.has(row.mission_id)) {
      missionMap.set(row.mission_id, {
        mission_id: row.mission_id,
        category_id: row.category_id,
        category: row.category
          ? {
              category_id: row.category.category_id,
              name: row.category.name,
              category_name: row.category.name,
              slug: row.category.slug,
            }
          : null,
        title: row.title,
        description: row.description,
        deadline: row.deadline,
        min_xp: row.min_xp,
        max_xp: row.max_xp,
        min_diamond: row.min_diamond,
        max_diamond: row.max_diamond,
        google_docs_url: row.google_docs_url,
        status: row.status,
        created_at: row.created_at,
        my_submission: row.sub_id
          ? {
            submission_id: row.sub_id,
            registration_id: row.sub_registration_id,
            submission_url: row.sub_url,
            notes: row.sub_notes,
            status: row.sub_status,
            awarded_xp: row.sub_awarded_xp,
            awarded_diamond: row.sub_awarded_diamond,
            admin_feedback: row.sub_admin_feedback,
            created_at: row.sub_created_at,
          }
          : null,
      });
    }
  }

  return Array.from(missionMap.values());
};

/**
 * Mengambil detail satu misi berdasarkan ID beserta status pengumpulan milik user yang sedang login.
 * Misi dengan status DRAFT tidak dapat diakses oleh peserta (404).
 */
export const getMissionByIdForUser = async (
  missionId,
  userId,
  registrationId = null,
  categoryId = null
) => {
  const [mission] = await db
    .select()
    .from(schema.Mission)
    .where(eq(schema.Mission.mission_id, missionId))
    .limit(1);

  if (!mission || mission.status === "DRAFT") {
    throw new Error("Mission not found");
  }

  const activeReg = await resolveParticipantRegistration(
    userId,
    registrationId,
    categoryId || mission.category_id
  );
  const targetRegId = activeReg?.registration_id || null;

  const subConditions = [
    eq(schema.MissionSubmission.mission_id, missionId),
    eq(schema.MissionSubmission.user_id, userId),
  ];

  if (targetRegId) {
    subConditions.push(
      or(
        eq(schema.MissionSubmission.registration_id, targetRegId),
        isNull(schema.MissionSubmission.registration_id)
      )
    );
  }

  // Ambil submission user yang paling baru
  const [submission] = await db
    .select()
    .from(schema.MissionSubmission)
    .where(and(...subConditions))
    .orderBy(
      sql`CASE WHEN ${schema.MissionSubmission.registration_id} IS NOT NULL THEN 0 ELSE 1 END`,
      desc(schema.MissionSubmission.created_at)
    )
    .limit(1);

  return {
    mission_id: mission.mission_id,
    category_id: mission.category_id,
    title: mission.title,
    description: mission.description,
    deadline: mission.deadline,
    min_xp: mission.min_xp,
    max_xp: mission.max_xp,
    min_diamond: mission.min_diamond,
    max_diamond: mission.min_diamond ? mission.max_diamond : mission.max_diamond,
    google_docs_url: mission.google_docs_url,
    status: mission.status,
    created_at: mission.created_at,
    my_submission: submission
      ? {
        submission_id: submission.submission_id,
        registration_id: submission.registration_id,
        submission_url: submission.submission_url,
        notes: submission.notes,
        status: submission.status,
        awarded_xp: submission.awarded_xp,
        awarded_diamond: submission.awarded_diamond,
        admin_feedback: submission.admin_feedback,
        created_at: submission.created_at,
      }
      : null,
  };
};

/**
 * Peserta submit link pengumpulan misi.
 * Validasi: misi harus ada & ACTIVE, belum melewati deadline.
 * - APPROVED → block (sudah disetujui untuk tim tersebut)
 * - PENDING → update submission yang ada (resubmit perbaiki link)
 * - REJECTED / belum ada → buat submission baru
 */
export const submitMission = async (missionId, userId, data) => {
  // 1. Cek misi ada & ACTIVE
  const [mission] = await db
    .select()
    .from(schema.Mission)
    .where(eq(schema.Mission.mission_id, missionId))
    .limit(1);

  if (!mission) {
    throw new Error("Mission not found");
  }

  if (mission.status !== "ACTIVE") {
    throw new Error("Mission is not active");
  }

  // 2. Cek deadline
  if (new Date(mission.deadline) < new Date()) {
    throw new Error("Mission deadline has passed");
  }

  // 2b. Resolusi registrasi tim milik user
  const userRegs = await db
    .select({
      registration_id: schema.Registration.registration_id,
      category_id: schema.Registration.category_id,
      team_name: schema.Registration.team_name,
    })
    .from(schema.Registration)
    .where(eq(schema.Registration.user_id, userId));

  let targetReg = null;
  if (data.registration_id) {
    targetReg = userRegs.find((r) => r.registration_id === data.registration_id);
    if (!targetReg) {
      throw new Error("Invalid team registration for this user");
    }
  } else if (mission.category_id) {
    targetReg = userRegs.find((r) => r.category_id === mission.category_id) || null;
  } else if (data.category_id) {
    targetReg = userRegs.find((r) => r.category_id === data.category_id) || null;
  } else if (userRegs.length === 1) {
    targetReg = userRegs[0];
  }

  if (mission.category_id && targetReg && targetReg.category_id !== mission.category_id) {
    throw new Error("Team registration does not match mission category");
  }

  const targetRegId = targetReg ? targetReg.registration_id : null;
  const isMultiTeamUser = userRegs.length > 1;

  // 3. Cek submission yang sudah ada milik user di misi ini
  const allUserMissionSubmissions = await db
    .select()
    .from(schema.MissionSubmission)
    .where(
      and(
        eq(schema.MissionSubmission.mission_id, missionId),
        eq(schema.MissionSubmission.user_id, userId)
      )
    )
    .orderBy(desc(schema.MissionSubmission.created_at));

  // Filter submission yang relevan dengan tim aktif (targetRegId)
  const existingSubmissions = targetRegId
    ? allUserMissionSubmissions.filter((s) => {
        if (s.registration_id === targetRegId) return true;
        if (!s.registration_id) {
          // Jika misi spesifik kategori atau user hanya punya 1 tim, legacy null milik tim ini
          if (mission.category_id || !isMultiTeamUser) return true;
          // Jika misi global & user multi-tim, klaim submission PENDING yang masih null
          if (s.status === "PENDING") return true;
        }
        return false;
      })
    : allUserMissionSubmissions;

  // 3a. Jika sudah pernah APPROVED → block, tidak perlu submit ulang
  if (existingSubmissions.some((s) => s.status === "APPROVED")) {
    throw new Error("Your submission has already been approved");
  }

  // 3b. Jika ada PENDING → update submission yang ada (resubmit / perbaiki link)
  const pendingSubmission = existingSubmissions.find((s) => s.status === "PENDING");
  if (pendingSubmission) {
    const [updated] = await db
      .update(schema.MissionSubmission)
      .set({
        registration_id: targetRegId || pendingSubmission.registration_id || null,
        submission_url: data.submission_url,
        notes: data.notes || null,
        updated_by: userId,
        updated_at: new Date(),
      })
      .where(eq(schema.MissionSubmission.submission_id, pendingSubmission.submission_id))
      .returning();

    return updated;
  }

  // 3c. Jika REJECTED atau belum pernah submit → buat submission baru
  const submissionId = generateCuid();

  const [newSubmission] = await db
    .insert(schema.MissionSubmission)
    .values({
      submission_id: submissionId,
      mission_id: missionId,
      user_id: userId,
      registration_id: targetRegId,
      submission_url: data.submission_url,
      notes: data.notes || null,
      status: "PENDING",
      created_by: userId,
      updated_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return newSubmission;
};

// ==========================================
// Admin Mission Review Functions 
// ==========================================

/**
 * Admin mereview pengumpulan misi peserta
 * Jika status === "APPROVED":
 * - Validasi batas min/max XP & Diamond misi
 * - Jalankan transaksi atomik (db.transaction)
 *   1. Update status MissionSubmission -> APPROVED, set awarded_xp, awarded_diamond, admin_feedback, reviewed_at
 *   2. Atomic increment Registration.xp & Registration.diamond hanya pada tim yang bersangkutan
 * Jika status === "REJECTED":
 * - Update status MissionSubmission -> REJECTED, admin_feedback, reviewed_at
 * - Saldo tim tidak bertambah
 */
export const reviewMissionSubmission = async (submissionId, data, adminId = null) => {
  // 1. Ambil data submission beserta misi terkait
  const [row] = await db
    .select({
      submission: schema.MissionSubmission,
      mission: schema.Mission,
    })
    .from(schema.MissionSubmission)
    .innerJoin(
      schema.Mission,
      eq(schema.MissionSubmission.mission_id, schema.Mission.mission_id)
    )
    .where(eq(schema.MissionSubmission.submission_id, submissionId))
    .limit(1);

  if (!row) {
    throw new Error("Submission not found");
  }

  const { submission, mission } = row;

  // 2. Cegah double approval dan modifikasi submission yang sudah final (APPROVED / REJECTED)
  if (submission.status === "APPROVED") {
    throw new Error("Submission has already been approved");
  }

  if (submission.status === "REJECTED") {
    throw new Error("Submission has already been rejected and cannot be modified");
  }

  const targetRegId = data.registration_id || submission.registration_id || null;

  // 3. Logika untuk status REJECTED
  if (data.status === "REJECTED") {
    const subRejectPayload = {
      status: "REJECTED",
      awarded_xp: null,
      awarded_diamond: null,
      admin_feedback: data.admin_feedback || null,
      reviewed_at: new Date(),
      updated_at: new Date(),
    };
    if (targetRegId && !submission.registration_id) {
      subRejectPayload.registration_id = targetRegId;
    }
    if (adminId) {
      subRejectPayload.updated_by = adminId;
    }

    const [updatedSubmission] = await db
      .update(schema.MissionSubmission)
      .set(subRejectPayload)
      .where(eq(schema.MissionSubmission.submission_id, submissionId))
      .returning();

    return {
      submission: updatedSubmission,
    };
  }

  // 4. Logika untuk status APPROVED
  // Validasi rentang reward terhadap ketentuan misi
  if (data.awarded_xp < mission.min_xp || data.awarded_xp > mission.max_xp) {
    throw new Error(
      `awarded_xp must be between ${mission.min_xp} and ${mission.max_xp}`
    );
  }

  if (
    data.awarded_diamond < mission.min_diamond ||
    data.awarded_diamond > mission.max_diamond
  ) {
    throw new Error(
      `awarded_diamond must be between ${mission.min_diamond} and ${mission.max_diamond}`
    );
  }

  // Jalankan Transaksi Atomik (db.transaction)
  const result = await db.transaction(async (tx) => {
    // 4a. Update status MissionSubmission menjadi APPROVED
    const subApprovePayload = {
      status: "APPROVED",
      awarded_xp: data.awarded_xp,
      awarded_diamond: data.awarded_diamond,
      admin_feedback: data.admin_feedback || null,
      reviewed_at: new Date(),
      updated_at: new Date(),
    };
    if (targetRegId && !submission.registration_id) {
      subApprovePayload.registration_id = targetRegId;
    }
    if (adminId) {
      subApprovePayload.updated_by = adminId;
    }

    const [updatedSub] = await tx
      .update(schema.MissionSubmission)
      .set(subApprovePayload)
      .where(eq(schema.MissionSubmission.submission_id, submissionId))
      .returning();

    // 4b. Increment Registration.xp & Registration.diamond secara atomik
    // Prioritaskan targetRegId (tim spesifik yang mengumpulkan misi).
    const regUpdatePayload = {
      xp: sql`${schema.Registration.xp} + ${data.awarded_xp}`,
      diamond: sql`${schema.Registration.diamond} + ${data.awarded_diamond}`,
      updated_at: new Date(),
    };
    if (adminId) {
      regUpdatePayload.updated_by = adminId;
    }

    const regConditions = [eq(schema.Registration.user_id, submission.user_id)];
    if (targetRegId) {
      regConditions.push(eq(schema.Registration.registration_id, targetRegId));
    } else if (mission.category_id) {
      regConditions.push(eq(schema.Registration.category_id, mission.category_id));
    }

    const updatedRegs = await tx
      .update(schema.Registration)
      .set(regUpdatePayload)
      .where(and(...regConditions))
      .returning();

    return {
      submission: updatedSub,
      registration: updatedRegs[0] || null,
      registrations: updatedRegs,
    };
  });

  return result;
};

