import {
  getAllRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistration,
  deleteRegistration,
} from "../services/registration.service.js";
import { response } from "../utils/response.js";
import { createRegistrationSchema, updateRegistrationSchema } from "../models/registration.model.js";
import prisma from "../config/prisma.js";

// Helper: Validate Google Drive link
const isGoogleDriveLink = (url) => {
  return /^https:\/\/drive\.google\.com\/.+/.test(url);
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
    };
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
    return response.success(res, registration, "Registration retrieved successfully");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to retrieve registration", 500, error.message);
  }
};

// Create new registration (user only)
export const createNewRegistration = async (req, res) => {
  try {
    const { user_id, category_id, file_url, team_name, team_members } = req.body;

    // Validate Google Drive link
    if (!file_url || !isGoogleDriveLink(file_url)) {
      return response.error(res, "file_url must be a valid Google Drive link", 400);
    }

    // Get category to check team_type
    const category = await prisma.category.findUnique({
      where: { category_id },
      select: { team_type: true },
    });
    if (!category) {
      return response.error(res, "Category not found", 404);
    }

    // Build registration data based on team_type
    let registrationData = {
      user_id,
      category_id,
      file_url,
    };

    if (category.team_type === "GROUP") {
      if (!team_name || !team_members) {
        return response.error(res, "team_name and team_members are required for GROUP registration", 400);
      }
      registrationData.team_name = team_name;
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
    return response.error(res, "Failed to submit registration", 500, error.message);
  }
};

// Update registration (user only, cannot update is_verified)
export const updateExistingRegistration = async (req, res) => {
  try {
    const registrationId = req.params.id;
    const { file_url, team_name, team_members } = req.body;

    // Validate Google Drive link if provided
    if (file_url && !isGoogleDriveLink(file_url)) {
      return response.error(res, "file_url must be a valid Google Drive link", 400);
    }

    // Only allow update of file_url, team_name, team_members
    const updateData = {};
    if (file_url) updateData.file_url = file_url;
    if (team_name) updateData.team_name = team_name;
    if (team_members) updateData.team_members = team_members;

    // Validate data
    const validation = updateRegistrationSchema.safeParse(updateData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedRegistration = await updateRegistration(registrationId, validation.data);

    return response.success(res, updatedRegistration, "Registration updated successfully");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Team name is required for group registrations") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to update registration", 500, error.message);
  }
};

// Delete registration (user only)
export const deleteRegistrationById = async (req, res) => {
  try {
    await deleteRegistration(req.params.id);
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
    const updatedRegistration = await updateRegistration(registrationId, { is_verified });
    return response.success(res, updatedRegistration, "Registration verified successfully");
  } catch (error) {
    if (error.message === "Registration not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to verify registration", 500, error.message);
  }
};