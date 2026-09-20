import {
  createMission,
  getAllMissions,
  getMissionById,
  updateMission,
  deleteMission,
  getMissionSubmissions,
  reviewMissionSubmission,
} from "../services/mission.service.js";
import { response } from "../utils/response.js";
import {
  createMissionSchema,
  updateMissionSchema,
  queryMissionsSchema,
  querySubmissionsSchema,
  reviewMissionSubmissionSchema,
} from "../models/mission.model.js";

/**
 * [POST /api/v1/admin/missions]
 * Membuat misi harian baru oleh Admin
 */
export const createNewMission = async (req, res) => {
  try {
    const validation = createMissionSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const mission = await createMission(validation.data, req.user?.userId);

    return response.success(
      res,
      mission,
      "Daily mission created successfully",
      201
    );
  } catch (error) {
    return response.error(
      res,
      "Failed to create daily mission",
      500,
      error.message
    );
  }
};

/**
 * [GET /api/v1/admin/missions]
 * Mengambil daftar seluruh misi harian untuk Admin
 */
export const getMissions = async (req, res) => {
  try {
    const queryValidation = queryMissionsSchema.safeParse(req.query);
    const filters = queryValidation.success ? queryValidation.data : {};

    const result = await getAllMissions(filters);

    return response.success(res, result, "Missions retrieved successfully");
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
 * [GET /api/v1/admin/missions/:id]
 * Mengambil detail satu misi harian berdasarkan ID
 */
export const getMission = async (req, res) => {
  try {
    const mission = await getMissionById(req.params.id);

    return response.success(res, mission, "Mission retrieved successfully");
  } catch (error) {
    if (error.message === "Mission not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to retrieve mission", 500, error.message);
  }
};

/**
 * [PUT /api/v1/admin/missions/:id]
 * Mengedit data misi harian
 */
export const updateExistingMission = async (req, res) => {
  try {
    const validation = updateMissionSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updated = await updateMission(req.params.id, validation.data, req.user?.userId);

    return response.success(res, updated, "Mission updated successfully");
  } catch (error) {
    if (error.message === "Mission not found") {
      return response.error(res, error.message, 404);
    }
    if (
      error.message.includes("max_xp") ||
      error.message.includes("max_diamond")
    ) {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to update mission", 500, error.message);
  }
};

/**
 * [DELETE /api/v1/admin/missions/:id]
 * Menghapus data misi harian
 */
export const deleteMissionById = async (req, res) => {
  try {
    const deleted = await deleteMission(req.params.id);

    return response.success(res, deleted, "Mission deleted successfully");
  } catch (error) {
    if (error.message === "Mission not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to delete mission", 500, error.message);
  }
};

/**
 * [GET /api/v1/admin/missions/:id/submissions]
 * Mengambil daftar pengumpulan peserta pada misi tertentu
 */
export const getMissionSubmissionsById = async (req, res) => {
  try {
    const queryValidation = querySubmissionsSchema.safeParse(req.query);
    const filters = queryValidation.success ? queryValidation.data : {};

    const result = await getMissionSubmissions(req.params.id, filters);

    return response.success(
      res,
      result,
      "Mission submissions retrieved successfully"
    );
  } catch (error) {
    if (error.message === "Mission not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(
      res,
      "Failed to retrieve mission submissions",
      500,
      error.message
    );
  }
};

/**
 * [POST /api/v1/admin/submissions/:submissionId/review]
 * atau [POST /api/v1/admin/missions/submissions/:submissionId/review]
 * Admin meninjau pengumpulan peserta & memberikan reward XP + Diamond secara atomik
 */
export const reviewSubmissionById = async (req, res) => {
  try {
    const submissionId = req.params.submissionId || req.params.id;

    const validation = reviewMissionSubmissionSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const result = await reviewMissionSubmission(submissionId, validation.data, req.user?.userId);

    return response.success(
      res,
      result,
      "Submission reviewed successfully"
    );
  } catch (error) {
    if (error.message === "Submission not found") {
      return response.error(res, error.message, 404);
    }
    if (
      error.message === "Submission has already been approved" ||
      error.message.startsWith("awarded_xp must be between") ||
      error.message.startsWith("awarded_diamond must be between")
    ) {
      return response.error(res, error.message, 400);
    }
    return response.error(
      res,
      "Failed to review mission submission",
      500,
      error.message
    );
  }
};

