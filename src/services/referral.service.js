import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, and, sql, desc, asc, ilike, or, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";
import crypto from "crypto";

const referrerReg = alias(schema.Registration, "referrerReg");
const refereeReg = alias(schema.Registration, "refereeReg");
const referrerUser = alias(schema.User, "referrerUser");
const refereeUser = alias(schema.User, "refereeUser");
const referrerCat = alias(schema.Category, "referrerCat");
const refereeCat = alias(schema.Category, "refereeCat");
const verifierUser = alias(schema.User, "verifierUser");

// Generate a random human-readable referral code: MIA-XXXXXX
const generateCodeString = () => {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No ambiguous chars (0, O, 1, I)
  let randomStr = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    randomStr += chars[bytes[i] % chars.length];
  }
  return `MIA-${randomStr}`;
};

/**
 * Generate referral code for a specific registration
 */
export const generateReferralCodeForRegistration = async (registrationId, userId, userRole = "USER") => {
  const [registration] = await db
    .select({
      registration_id: schema.Registration.registration_id,
      user_id: schema.Registration.user_id,
      referral_code: schema.Registration.referral_code,
      team_name: schema.Registration.team_name,
      is_verified: schema.Registration.is_verified,
    })
    .from(schema.Registration)
    .where(eq(schema.Registration.registration_id, registrationId))
    .limit(1);

  if (!registration) {
    throw new Error("Pendaftaran tidak ditemukan");
  }

  // Check authorization
  if (userRole !== "ADMIN" && registration.user_id !== userId) {
    throw new Error("Anda tidak memiliki izin untuk pendaftaran ini");
  }

  // Only verified registrations can generate referral code
  if (userRole !== "ADMIN" && !registration.is_verified) {
    throw new Error("Kode referral hanya dapat dibuat setelah pendaftaran tim Anda terverifikasi oleh panitia");
  }

  // If already generated, return existing
  if (registration.referral_code) {
    return {
      registration_id: registration.registration_id,
      referral_code: registration.referral_code,
      message: "Kode referral sudah ada",
      already_exists: true,
    };
  }

  // Generate unique code with retry on collision
  let newCode = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    newCode = generateCodeString();

    const [existing] = await db
      .select({ registration_id: schema.Registration.registration_id })
      .from(schema.Registration)
      .where(sql`UPPER(${schema.Registration.referral_code}) = UPPER(${newCode})`)
      .limit(1);

    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error("Gagal membuat kode referral unik, silakan coba lagi");
  }

  // Update registration
  const [updated] = await db
    .update(schema.Registration)
    .set({
      referral_code: newCode,
      updated_at: new Date(),
    })
    .where(eq(schema.Registration.registration_id, registrationId))
    .returning({
      registration_id: schema.Registration.registration_id,
      referral_code: schema.Registration.referral_code,
    });

  return {
    registration_id: updated.registration_id,
    referral_code: updated.referral_code,
    message: "Kode referral berhasil dibuat",
    already_exists: false,
  };
};

/**
 * Validate a referral code (used in registration form check)
 */
export const validateReferralCode = async (code, currentUserId = null) => {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { valid: false, message: "Kode referral wajib diisi" };
  }

  const cleanCode = code.trim().toUpperCase();

  const [row] = await db
    .select({
      registration: schema.Registration,
      user: schema.User,
      category: schema.Category,
    })
    .from(schema.Registration)
    .leftJoin(schema.User, eq(schema.Registration.user_id, schema.User.users_id))
    .leftJoin(schema.Category, eq(schema.Registration.category_id, schema.Category.category_id))
    .where(sql`UPPER(TRIM(${schema.Registration.referral_code})) = ${cleanCode}`)
    .limit(1);

  if (!row || !row.registration) {
    return {
      valid: false,
      message: "Kode referral tidak valid atau tidak ditemukan",
    };
  }

  // Prevent self-referral if current user is logged in
  if (currentUserId && row.registration.user_id === currentUserId) {
    return {
      valid: false,
      message: "Tidak dapat menggunakan kode referral milik sendiri",
    };
  }

  // Ensure referrer is verified
  if (!row.registration.is_verified) {
    return {
      valid: false,
      message: "Tim pemilik kode referral belum diverifikasi oleh panitia",
    };
  }

  return {
    valid: true,
    referral_code: row.registration.referral_code,
    referrer_registration_id: row.registration.registration_id,
    referrer_team_name: row.registration.team_name || row.user?.name || "Tim Peserta",
    referrer_category_name: row.category?.name || "Lomba MIA 2026",
    message: `Kode referral valid dari tim ${row.registration.team_name || row.user?.name}`,
  };
};

/**
 * Record referral log when a new registration is submitted
 */
export const recordReferralOnRegistration = async (newRegistrationId, referralCode, refereeUserId) => {
  if (!referralCode || typeof referralCode !== "string" || !referralCode.trim()) {
    return null;
  }

  const cleanCode = referralCode.trim().toUpperCase();

  // Find referrer registration
  const [referrer] = await db
    .select({
      registration_id: schema.Registration.registration_id,
      user_id: schema.Registration.user_id,
      referral_code: schema.Registration.referral_code,
      is_verified: schema.Registration.is_verified,
    })
    .from(schema.Registration)
    .where(sql`UPPER(TRIM(${schema.Registration.referral_code})) = ${cleanCode}`)
    .limit(1);

  if (!referrer) {
    throw new Error("Kode referral tidak valid atau tidak ditemukan");
  }

  // Prevent self referral
  if (referrer.user_id === refereeUserId) {
    throw new Error("Tidak dapat menggunakan kode referral milik sendiri");
  }

  // Ensure referrer is verified
  if (!referrer.is_verified) {
    throw new Error("Tim pemilik kode referral belum diverifikasi oleh panitia");
  }

  // Check if this new registration already has a referral log
  const [existingLog] = await db
    .select({ referral_log_id: schema.ReferralLog.referral_log_id })
    .from(schema.ReferralLog)
    .where(eq(schema.ReferralLog.referee_registration_id, newRegistrationId))
    .limit(1);

  if (existingLog) {
    return existingLog;
  }

  const logId = generateCuid();
  const [newLog] = await db
    .insert(schema.ReferralLog)
    .values({
      referral_log_id: logId,
      referral_code: referrer.referral_code,
      referrer_registration_id: referrer.registration_id,
      referee_registration_id: newRegistrationId,
      referrer_xp: 250,
      referee_xp: 100,
      status: "PENDING",
    })
    .returning();

  return newLog;
};

/**
 * Admin: Get all referral logs with filters, stats & pagination
 */
export const getAllReferralLogs = async (filters = {}) => {
  const { status, search, page = 1, limit = 10 } = filters;
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;

  const conditions = [];

  if (status && status !== "ALL") {
    conditions.push(eq(schema.ReferralLog.status, status));
  }

  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.ReferralLog.referral_code, pattern),
        ilike(referrerReg.team_name, pattern),
        ilike(refereeReg.team_name, pattern),
        ilike(referrerUser.name, pattern),
        ilike(refereeUser.name, pattern),
        ilike(referrerUser.email, pattern),
        ilike(refereeUser.email, pattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Base query with joins
  const baseQuery = db
    .select({
      referral_log_id: schema.ReferralLog.referral_log_id,
      referral_code: schema.ReferralLog.referral_code,
      status: schema.ReferralLog.status,
      referrer_xp: schema.ReferralLog.referrer_xp,
      referee_xp: schema.ReferralLog.referee_xp,
      admin_notes: schema.ReferralLog.admin_notes,
      verified_at: schema.ReferralLog.verified_at,
      created_at: schema.ReferralLog.created_at,
      updated_at: schema.ReferralLog.updated_at,
      referrer: {
        registration_id: referrerReg.registration_id,
        team_name: referrerReg.team_name,
        is_verified: referrerReg.is_verified,
        xp: referrerReg.xp,
        user_name: referrerUser.name,
        user_email: referrerUser.email,
        whatsapp_number: referrerUser.whatsapp_number,
        category_name: referrerCat.name,
      },
      referee: {
        registration_id: refereeReg.registration_id,
        team_name: refereeReg.team_name,
        is_verified: refereeReg.is_verified,
        xp: refereeReg.xp,
        user_name: refereeUser.name,
        user_email: refereeUser.email,
        whatsapp_number: refereeUser.whatsapp_number,
        category_name: refereeCat.name,
      },
      verifier: {
        users_id: verifierUser.users_id,
        name: verifierUser.name,
        email: verifierUser.email,
      },
    })
    .from(schema.ReferralLog)
    .leftJoin(referrerReg, eq(schema.ReferralLog.referrer_registration_id, referrerReg.registration_id))
    .leftJoin(referrerUser, eq(referrerReg.user_id, referrerUser.users_id))
    .leftJoin(referrerCat, eq(referrerReg.category_id, referrerCat.category_id))
    .leftJoin(refereeReg, eq(schema.ReferralLog.referee_registration_id, refereeReg.registration_id))
    .leftJoin(refereeUser, eq(refereeReg.user_id, refereeUser.users_id))
    .leftJoin(refereeCat, eq(refereeReg.category_id, refereeCat.category_id))
    .leftJoin(verifierUser, eq(schema.ReferralLog.verified_by, verifierUser.users_id));

  // Count query
  const countQuery = db
    .select({ count: count() })
    .from(schema.ReferralLog)
    .leftJoin(referrerReg, eq(schema.ReferralLog.referrer_registration_id, referrerReg.registration_id))
    .leftJoin(referrerUser, eq(referrerReg.user_id, referrerUser.users_id))
    .leftJoin(refereeReg, eq(schema.ReferralLog.referee_registration_id, refereeReg.registration_id))
    .leftJoin(refereeUser, eq(refereeReg.user_id, refereeUser.users_id));

  const [data, totalCountRes, statsRes] = await Promise.all([
    baseQuery
      .where(whereClause)
      .orderBy(desc(schema.ReferralLog.created_at))
      .limit(safeLimit)
      .offset(skip),
    countQuery.where(whereClause),
    db
      .select({
        status: schema.ReferralLog.status,
        count: count(),
      })
      .from(schema.ReferralLog)
      .groupBy(schema.ReferralLog.status),
  ]);

  const total = Number(totalCountRes[0]?.count || 0);

  // Group stats
  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const s of statsRes) {
    const c = Number(s.count || 0);
    stats.total += c;
    if (s.status === "PENDING") stats.pending = c;
    if (s.status === "APPROVED") stats.approved = c;
    if (s.status === "REJECTED") stats.rejected = c;
  }

  return {
    referrals: data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
    stats,
  };
};

/**
 * Admin: Approve referral log (ACC)
 * - Updates status to APPROVED
 * - Atomically adds +250 XP to referrer registration and +100 XP to referee registration
 */
export const approveReferralLog = async (referralLogId, adminId, adminNotes = null) => {
  return await db.transaction(async (tx) => {
    // 1. Get referral log
    const [log] = await tx
      .select()
      .from(schema.ReferralLog)
      .where(eq(schema.ReferralLog.referral_log_id, referralLogId))
      .limit(1);

    if (!log) {
      throw new Error("Data referral tidak ditemukan");
    }

    if (log.status === "APPROVED") {
      throw new Error("Referral ini sudah pernah di-ACC sebelumnya");
    }

    // 2. Update status to APPROVED
    const [updatedLog] = await tx
      .update(schema.ReferralLog)
      .set({
        status: "APPROVED",
        verified_at: new Date(),
        verified_by: adminId,
        admin_notes: adminNotes !== undefined ? adminNotes : log.admin_notes,
        updated_at: new Date(),
      })
      .where(eq(schema.ReferralLog.referral_log_id, referralLogId))
      .returning();

    // 3. Atomically add XP
    // Referrer: +250 XP
    await tx
      .update(schema.Registration)
      .set({
        xp: sql`${schema.Registration.xp} + ${log.referrer_xp}`,
        updated_at: new Date(),
      })
      .where(eq(schema.Registration.registration_id, log.referrer_registration_id));

    // Referee: +100 XP
    await tx
      .update(schema.Registration)
      .set({
        xp: sql`${schema.Registration.xp} + ${log.referee_xp}`,
        updated_at: new Date(),
      })
      .where(eq(schema.Registration.registration_id, log.referee_registration_id));

    return updatedLog;
  });
};

/**
 * Admin: Reject referral log (Batal)
 * - If status was APPROVED: atomically deducts XP (-250 from referrer, -100 from referee)
 * - Updates status to REJECTED
 */
export const rejectReferralLog = async (referralLogId, adminId, adminNotes = null) => {
  return await db.transaction(async (tx) => {
    // 1. Get referral log
    const [log] = await tx
      .select()
      .from(schema.ReferralLog)
      .where(eq(schema.ReferralLog.referral_log_id, referralLogId))
      .limit(1);

    if (!log) {
      throw new Error("Data referral tidak ditemukan");
    }

    if (log.status === "REJECTED") {
      throw new Error("Referral ini sudah berstatus Batal / REJECTED");
    }

    const wasApproved = log.status === "APPROVED";

    // 2. If it was approved, pull back the XP that was granted
    if (wasApproved) {
      // Deduct from referrer
      await tx
        .update(schema.Registration)
        .set({
          xp: sql`GREATEST(0, ${schema.Registration.xp} - ${log.referrer_xp})`,
          updated_at: new Date(),
        })
        .where(eq(schema.Registration.registration_id, log.referrer_registration_id));

      // Deduct from referee
      await tx
        .update(schema.Registration)
        .set({
          xp: sql`GREATEST(0, ${schema.Registration.xp} - ${log.referee_xp})`,
          updated_at: new Date(),
        })
        .where(eq(schema.Registration.registration_id, log.referee_registration_id));
    }

    // 3. Update status to REJECTED
    const [updatedLog] = await tx
      .update(schema.ReferralLog)
      .set({
        status: "REJECTED",
        verified_at: new Date(),
        verified_by: adminId,
        admin_notes: adminNotes !== undefined ? adminNotes : log.admin_notes,
        updated_at: new Date(),
      })
      .where(eq(schema.ReferralLog.referral_log_id, referralLogId))
      .returning();

    return {
      ...updatedLog,
      xp_deducted: wasApproved,
    };
  });
};
