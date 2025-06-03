import {
  getAllKelas,
  getKelasById,
  createKelas,
  updateKelas,
  deleteKelas,
  getMuridByKelas,
  enrollUserToKelas,
  unenrollUserFromKelas,
} from "../services/kelas.service.js";
import { response } from "../utils/response.js";
import { createKelasSchema, updateKelasSchema } from "../models/kelas.model.js";

// Get all kelas dengan filter
export const getKelasList = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      peminatan_id: req.query.peminatan_id,
      badge: req.query.badge,
    };
    
    const result = await getAllKelas(filters);
    return response.success(res, result, "Kelas retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to retrieve kelas", 500, error.message);
  }
};

// Get kelas by ID
export const getKelasDetail = async (req, res) => {
  try {
    const kelas = await getKelasById(req.params.id);
    return response.success(res, kelas, "Kelas detail retrieved successfully");
  } catch (error) {
    if (error.message === "Kelas not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to retrieve kelas detail", 500, error.message);
  }
};

// Create new kelas (admin/mentor only)
export const createNewKelas = async (req, res) => {
  try {
    // Validate input
    const validation = createKelasSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const userId = req.user.userId;
    const kelas = await createKelas(validation.data, userId);
    
    return response.success(res, kelas, "Kelas created successfully", 201);
  } catch (error) {
    if (error.message === "Peminatan not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to create kelas", 500, error.message);
  }
};

// Update kelas (admin/mentor only)
export const updateExistingKelas = async (req, res) => {
  try {
    // Validate input
    const validation = updateKelasSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const kelas = await updateKelas(req.params.id, validation.data);
    return response.success(res, kelas, "Kelas updated successfully");
  } catch (error) {
    if (error.message === "Kelas not found" || error.message === "Peminatan not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update kelas", 500, error.message);
  }
};

// Delete kelas (admin/mentor only)
export const deleteKelasById = async (req, res) => {
  try {
    await deleteKelas(req.params.id);
    return response.success(res, null, "Kelas deleted successfully");
  } catch (error) {
    if (error.message === "Kelas not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Cannot delete kelas with existing enrollments") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to delete kelas", 500, error.message);
  }
};

// Get murid dalam kelas tertentu
export const getMuridInKelas = async (req, res) => {
  try {
    const { kelasId } = req.params;
    const { badge } = req.query;
    
    const murid = await getMuridByKelas(kelasId, { badge });
    return response.success(res, murid, "Murid retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to retrieve murid", 500, error.message);
  }
};

// Enroll user ke kelas
export const enrollToKelas = async (req, res) => {
  try {
    const { kelasId } = req.params;
    const userId = req.user.userId;
    
    const enrollment = await enrollUserToKelas(userId, kelasId);
    return response.success(res, enrollment, "Successfully enrolled to class", 201);
  } catch (error) {
    if (error.message === "User already enrolled in this class") {
      return response.error(res, error.message, 400);
    }
    if (error.message === "Kelas not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to enroll to class", 500, error.message);
  }
};

// Unenroll user dari kelas
export const unenrollFromKelas = async (req, res) => {
  try {
    const { kelasId } = req.params;
    const userId = req.user.userId;
    
    await unenrollUserFromKelas(userId, kelasId);
    return response.success(res, null, "Successfully unenrolled from class");
  } catch (error) {
    if (error.message === "User is not enrolled in this class") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to unenroll from class", 500, error.message);
  }
};