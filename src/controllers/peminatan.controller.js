import {
  getAllPeminatan,
  getPeminatanById,
  createPeminatan,
  updatePeminatan,
  deletePeminatan,
} from "../services/peminatan.service.js";
import { response } from "../utils/response.js";
import { createPeminatanSchema, updatePeminatanSchema } from "../models/peminatan.model.js";
import multer from "multer";
import imagekit from "../lib/imagekit.js";

// Multer config
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

// Upload to ImageKit
const uploadToImageKit = async (file) => {
  const base64Image = file.buffer.toString("base64");
  const result = await imagekit.upload({
    file: base64Image,
    fileName: `${Date.now()}_${file.originalname}`,
    folder: "/peminatan-images",
  });
  return result.url;
};

// Get all
export const getPeminatanList = async (req, res) => {
  try {
    const data = await getAllPeminatan();
    return response.success(res, data, "Daftar peminatan berhasil diambil");
  } catch (error) {
    return response.error(res, "Gagal mengambil daftar peminatan", 500, error.message);
  }
};

// Get by ID
export const getPeminatanDetail = async (req, res) => {
  try {
    const data = await getPeminatanById(req.params.id);
    return response.success(res, data, "Detail peminatan berhasil diambil");
  } catch (error) {
    if (error.message === "Peminatan not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Gagal mengambil detail peminatan", 500, error.message);
  }
};

// Create (pakai upload file dan ambil user_id dari token)
export const createNewPeminatan = async (req, res) => {
  try {
    // Ambil user_id dari token
    const user_id = req.user.userId;

    // Validasi nama_peminatan
    const validation = createPeminatanSchema.omit({ user_id: true, imageUrl: true }).safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    // Cek file image
    if (!req.file) {
      return response.error(res, "Image is required", 400);
    }

    // Upload ke ImageKit
    const imageUrl = await uploadToImageKit(req.file);

    // Buat data untuk insert
    const data = {
      ...validation.data,
      user_id,
      imageUrl,
    };

    const created = await createPeminatan(data);
    return response.success(res, created, "Peminatan berhasil dibuat", 201);
  } catch (error) {
    return response.error(res, "Gagal membuat peminatan", 500, error.message);
  }
};

// Update (opsional: bisa update nama_peminatan dan/atau image)
export const updateExistingPeminatan = async (req, res) => {
  try {
    // Validasi body
    const validation = updatePeminatanSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    let updateData = { ...validation.data };

    // Jika ada file baru, upload dan update imageUrl
    if (req.file) {
      const imageUrl = await uploadToImageKit(req.file);
      updateData.imageUrl = imageUrl;
    }

    const data = await updatePeminatan(req.params.id, updateData);
    return response.success(res, data, "Peminatan berhasil diupdate");
  } catch (error) {
    if (error.message === "Peminatan not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Gagal update peminatan", 500, error.message);
  }
};

// Delete
export const deletePeminatanById = async (req, res) => {
  try {
    await deletePeminatan(req.params.id);
    return response.success(res, null, "Peminatan berhasil dihapus");
  } catch (error) {
    if (error.message === "Peminatan not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Gagal hapus peminatan", 500, error.message);
  }
};