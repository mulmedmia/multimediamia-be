import {
  getAllRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  checkTeamNameAvailability,
} from "../services/registration.service.js";
import {
  validateReferralCode,
  recordReferralOnRegistration,
} from "../services/referral.service.js";
import { response } from "../utils/response.js";
import { createRegistrationSchema, updateRegistrationSchema } from "../models/registration.model.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

// Helper: Validate Google Drive link
const isGoogleDriveLink = (url) => {
  return typeof url === "string" && /^https?:\/\/drive\.google\.com\/.+/.test(url.trim());
};

// Get all registrations
export const getRegistrations = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      category_id: req.query.category_id,
      user_id: req.query.user_id,
      is_verified: req.query.is_verified,
      search: req.query.search,
      sort_by: req.query.sort_by,
      order: req.query.order,
    };

    // Non-admin users are restricted to their own registrations
    if (req.user && req.user.role !== "ADMIN") {
      filters.user_id = req.user.userId;
    }

    const result = await getAllRegistrations(filters);
    return response.success(res, result, "Registrations retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to retrieve registrations", 500, error.message);
  }
};

// Get registration by ID
export const getRegistration = async (req, res) => {
  try {
    const registration = await getRegistrationById(req.params.id);

    // Non-admin users can only view their own registration
    if (req.user && req.user.role !== "ADMIN" && registration.user_id !== req.user.userId) {
      return response.error(res, "Forbidden: You do not have access to this registration", 403);
    }

    return response.success(res, registration, "Registration retrieved successfully");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to retrieve registration", 500, error.message);
  }
};

// Create new registration (user only - Fixes QA-02 by forcing user_id from token)
export const createNewRegistration = async (req, res) => {
  try {
    const { category_id, file_url, team_name, team_members, referral_code } = req.body;
    const userId = req.user.userId; // Get from authenticated JWT token

    const trimmedFileUrl = typeof file_url === "string" ? file_url.trim() : file_url;
    const trimmedTeamName = typeof team_name === "string" ? team_name.trim() : team_name;
    const trimmedReferralCode = typeof referral_code === "string" ? referral_code.trim() : "";

    // Validate Google Drive link
    if (!trimmedFileUrl || !isGoogleDriveLink(trimmedFileUrl)) {
      return response.error(res, "file_url must be a valid Google Drive link", 400);
    }

    // Validate referral code early if provided
    if (trimmedReferralCode) {
      const referralCheck = await validateReferralCode(trimmedReferralCode, userId);
      if (!referralCheck.valid) {
        return response.error(res, referralCheck.message, 400);
      }
    }

    // Get category to check team_type (Drizzle port)
    const [category] = await db
      .select({ team_type: schema.Category.team_type })
      .from(schema.Category)
      .where(eq(schema.Category.category_id, category_id))
      .limit(1);

    if (!category) {
      return response.error(res, "Category not found", 404);
    }

    // Build registration data based on team_type
    let registrationData = {
      user_id: userId,
      category_id,
      file_url: trimmedFileUrl,
    };

    if (category.team_type === "GROUP") {
      if (!trimmedTeamName || !team_members) {
        return response.error(res, "team_name and team_members are required for GROUP registration", 400);
      }
      registrationData.team_name = trimmedTeamName;
      registrationData.team_members = team_members;
    }

    // Validate data
    const validation = createRegistrationSchema.safeParse(registrationData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const registration = await createRegistration({
      ...validation.data,
      is_verified: false,
    });

    // Record referral log if referral code was used
    if (trimmedReferralCode) {
      try {
        await recordReferralOnRegistration(
          registration.registration_id,
          trimmedReferralCode,
          userId
        );
      } catch (refErr) {
        console.error("Gagal mencatat referral log:", refErr);
      }
    }

    return response.success(res, registration, "Registration submitted successfully", 201);
  } catch (error) {
    if (error.message === "Category not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Team name is required for group registrations") {
      return response.error(res, error.message, 400);
    }
    if (error.message === "User already registered for this category") {
      return response.error(res, error.message, 400);
    }
    if (error.message === "Nama tim sudah digunakan dalam kategori lomba ini") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to submit registration", 500, error.message);
  }
};

// Check team name availability within a category
export const checkTeamNameAvailabilityController = async (req, res) => {
  try {
    const { category_id, team_name, exclude_id } = req.query;
    if (!category_id || !team_name) {
      return response.validation(res, {
        message: "category_id dan team_name wajib disertakan",
      });
    }

    const result = await checkTeamNameAvailability(category_id, team_name, exclude_id);
    return response.success(res, result, result.message);
  } catch (error) {
    return response.error(res, "Gagal memeriksa ketersediaan nama tim", 500, error.message);
  }
};

// Update registration (user only - Fixes QA-02 by checking owner authorization)
export const updateExistingRegistration = async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { file_url, team_name, team_members } = req.body;
    const userId = req.user.userId;

    // Check if registration exists and verify ownership
    const [registration] = await db
      .select()
      .from(schema.Registration)
      .where(eq(schema.Registration.registration_id, registrationId))
      .limit(1);

    if (!registration) {
      return response.error(res, "Registration not found", 404);
    }

    if (registration.user_id !== userId && req.user.role !== "ADMIN") {
      return response.error(res, "Forbidden: You are not authorized to update this registration", 403);
    }

    if (registration.is_verified && req.user.role !== "ADMIN") {
      return response.error(res, "Tidak dapat mengedit data tim yang sudah terverifikasi", 400);
    }

    const trimmedFileUrl = typeof file_url === "string" ? file_url.trim() : file_url;
    const trimmedTeamName = typeof team_name === "string" ? team_name.trim() : team_name;

    // Validate Google Drive link if provided
    if (trimmedFileUrl && !isGoogleDriveLink(trimmedFileUrl)) {
      return response.error(res, "file_url must be a valid Google Drive link", 400);
    }

    // Only allow update of file_url, team_name, team_members
    const updateData = {};
    if (trimmedFileUrl) updateData.file_url = trimmedFileUrl;
    if (trimmedTeamName !== undefined) updateData.team_name = trimmedTeamName;
    if (team_members !== undefined) updateData.team_members = team_members;

    // Validate data
    const validation = updateRegistrationSchema.safeParse(updateData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedRegistration = await updateRegistration(registrationId, validation.data, userId);

    return response.success(res, updatedRegistration, "Registration updated successfully");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Team name is required for group registrations") {
      return response.error(res, error.message, 400);
    }
    if (error.message === "Nama tim sudah digunakan dalam kategori lomba ini") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to update registration", 500, error.message);
  }
};

// Delete registration (user only - Fixes QA-02 by checking owner authorization)
export const deleteRegistrationById = async (req, res) => {
  try {
    const registrationId = req.params.id;
    const userId = req.user.userId;

    // Check if registration exists and verify ownership
    const [registration] = await db
      .select()
      .from(schema.Registration)
      .where(eq(schema.Registration.registration_id, registrationId))
      .limit(1);

    if (!registration) {
      return response.error(res, "Registration not found", 404);
    }

    if (registration.user_id !== userId && req.user.role !== "ADMIN") {
      return response.error(res, "Forbidden: You are not authorized to delete this registration", 403);
    }

    await deleteRegistration(registrationId);
    return response.success(res, null, "Registration deleted successfully");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to delete registration", 500, error.message);
  }
};

// Admin only: verify registration
export const verifyRegistrationByAdmin = async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { is_verified } = req.body;
    const updatedRegistration = await updateRegistration(registrationId, { is_verified }, req.user?.userId);
    return response.success(res, updatedRegistration, "Registration verified successfully");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to verify registration", 500, error.message);
  }
};

// PATCH: Admin memberikan feedback ke registration
export const giveRegistrationFeedback = async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { feedback } = req.body;

    if (!feedback || typeof feedback !== "string" || feedback.length < 3) {
      return response.validation(res, { feedback: "Feedback is required and must be at least 3 characters" });
    }

    // Update registration dengan feedback
    const updatedRegistration = await updateRegistration(registrationId, { feedback }, req.user?.userId);

    return response.success(res, updatedRegistration, "Feedback diberikan ke peserta");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to give feedback", 500, error.message);
  }
};
