import { response } from "../utils/response.js";
import {
  generateReferralCodeForRegistration,
  validateReferralCode,
  getAllReferralLogs,
  approveReferralLog,
  rejectReferralLog,
} from "../services/referral.service.js";
import { reviewReferralSchema } from "../models/referral.model.js";

/**
 * [POST /api/v1/registrations/:id/generate-referral-code]
 * Generate kode referral unik untuk tim / registrasi tertentu
 */
export const generateReferralCode = async (req, res) => {
  try {
    const registrationId = req.params.id;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const result = await generateReferralCodeForRegistration(registrationId, userId, userRole);
    return response.success(res, result, result.message);
  } catch (error) {
    if (error.message === "Pendaftaran tidak ditemukan") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Anda tidak memiliki izin untuk pendaftaran ini") {
      return response.error(res, error.message, 403);
    }
    if (error.message.includes("terverifikasi")) {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Gagal membuat kode referral", 500, error.message);
  }
};

/**
 * [GET /api/v1/referrals/validate]
 * Cek validitas kode referral saat user mengisi form pendaftaran
 */
export const checkReferralCode = async (req, res) => {
  try {
    const { code } = req.query;
    const currentUserId = req.user?.userId || null;

    if (!code) {
      return response.error(res, "Kode referral wajib disertakan", 400);
    }

    const result = await validateReferralCode(code, currentUserId);
    if (!result.valid) {
      return response.error(res, result.message, 400);
    }

    return response.success(res, result, result.message);
  } catch (error) {
    return response.error(res, "Gagal memvalidasi kode referral", 500, error.message);
  }
};

/**
 * [GET /api/v1/admin/referrals]
 * List semua referral log untuk dashboard admin
 */
export const getAdminReferrals = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await getAllReferralLogs(filters);
    return response.success(res, result, "Daftar referral berhasil diambil");
  } catch (error) {
    return response.error(res, "Gagal mengambil data referral", 500, error.message);
  }
};

/**
 * [POST /api/v1/admin/referrals/:id/approve]
 * Tombol "ACC": Approve referral dan berikan XP (+250 pengundang, +100 diundang)
 */
export const approveAdminReferral = async (req, res) => {
  try {
    const referralLogId = req.params.id;
    const adminId = req.user.userId;

    const validation = reviewReferralSchema.safeParse(req.body || {});
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const result = await approveReferralLog(
      referralLogId,
      adminId,
      validation.data.admin_notes
    );

    return response.success(
      res,
      result,
      "Referral berhasil di-ACC! XP telah berhasil ditambahkan ke tim pengundang (+250 XP) dan tim yang diundang (+100 XP)."
    );
  } catch (error) {
    if (error.message === "Data referral tidak ditemukan") {
      return response.error(res, error.message, 404);
    }
    if (error.message.includes("sudah pernah di-ACC")) {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Gagal menyetujui referral", 500, error.message);
  }
};

/**
 * [POST /api/v1/admin/referrals/:id/reject]
 * Tombol "Batal": Batalkan referral dan tarik kembali XP jika sebelumnya berstatus APPROVED
 */
export const rejectAdminReferral = async (req, res) => {
  try {
    const referralLogId = req.params.id;
    const adminId = req.user.userId;

    const validation = reviewReferralSchema.safeParse(req.body || {});
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const result = await rejectReferralLog(
      referralLogId,
      adminId,
      validation.data.admin_notes
    );

    const message = result.xp_deducted
      ? "Referral berhasil dibatalkan dan reward XP (-250 XP pengundang, -100 XP diundang) telah ditarik kembali."
      : "Referral berhasil ditolak.";

    return response.success(res, result, message);
  } catch (error) {
    if (error.message === "Data referral tidak ditemukan") {
      return response.error(res, error.message, 404);
    }
    if (error.message.includes("sudah berstatus Batal")) {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Gagal membatalkan referral", 500, error.message);
  }
};
