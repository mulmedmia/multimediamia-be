import {
  getActiveMissionsForUser,
  getMissionByIdForUser,
  submitMission,
} from "../services/mission.service.js";
import { response } from "../utils/response.js";
import { submitMissionSchema } from "../models/mission.model.js";

/**
 * [GET /api/v1/missions]
 * Mengambil seluruh misi aktif beserta status pengumpulan milik user yang sedang login.
 */
export const getUserMissions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category_id, registration_id } = req.query;
    const missions = await getActiveMissionsForUser(
      userId,
      category_id,
      registration_id
    );

    return response.success(
      res,
      missions,
      "Active missions retrieved successfully"
    );
  } catch (error) {
    return response.error(
      res,
      "Failed to retrieve missions",
      500,
      error.message
    );
  }
};

/**
 * [GET /api/v1/missions/:id]
 * Mengambil detail satu misi beserta status pengumpulan milik user yang sedang login.
 */
export const getUserMissionDetail = async (req, res) => {
  try {
    const missionId = req.params.id;
    const userId = req.user.userId;
    const { registration_id, category_id } = req.query;

    const mission = await getMissionByIdForUser(
      missionId,
      userId,
      registration_id,
      category_id
    );

    return response.success(
      res,
      mission,
      "Mission retrieved successfully"
    );
  } catch (error) {
    if (error.message === "Mission not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(
      res,
      "Failed to retrieve mission",
      500,
      error.message
    );
  }
};

/**
 * [POST /api/v1/missions/:id/submit]
 * Peserta mengunggah link pengumpulan misi.
 * Validasi: URL valid, deadline belum lewat.
 * - APPROVED: block (sudah disetujui)
 * - PENDING: update submission yang ada (resubmit)
 * - REJECTED / belum ada: buat submission baru
 */
export const submitUserMission = async (req, res) => {
  try {
    const missionId = req.params.id;
    const userId = req.user.userId;

    // Validasi payload
    const validation = submitMissionSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const submission = await submitMission(
      missionId,
      userId,
      validation.data
    );

    return response.success(
      res,
      submission,
      "Mission submitted successfully",
      201
    );
  } catch (error) {
    if (error.message === "Mission not found") {
      return response.error(res, error.message, 404);
    }
    if (
      error.message === "Mission is not active" ||
      error.message === "Mission deadline has passed" ||
      error.message === "Your submission has already been approved" ||
      error.message === "Invalid team registration for this user" ||
      error.message === "Team registration does not match mission category"
    ) {
      return response.error(res, error.message, 400);
    }
    return response.error(
      res,
      "Failed to submit mission",
      500,
      error.message
    );
  }
};
