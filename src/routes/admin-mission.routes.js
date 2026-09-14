import { Router } from "express";
import {
  createNewMission,
  getMissions,
  getMission,
  updateExistingMission,
  deleteMissionById,
  getMissionSubmissionsById,
} from "../controllers/admin-mission.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// Seluruh route di bawah ini diproteksi autentikasi JWT dan hanya boleh diakses oleh ADMIN
router.use(authenticateToken, isAdmin);

// 1. POST /api/v1/admin/missions - Membuat misi harian baru
router.post("/", createNewMission);

// 2. GET /api/v1/admin/missions - Mengambil daftar seluruh misi harian
router.get("/", getMissions);

// 3. GET /api/v1/admin/missions/:id - Mengambil detail misi harian
router.get("/:id", getMission);

// 4. PUT /api/v1/admin/missions/:id - Mengedit data misi harian
router.put("/:id", updateExistingMission);

// 5. DELETE /api/v1/admin/missions/:id - Menghapus data misi harian
router.delete("/:id", deleteMissionById);

// 6. GET /api/v1/admin/missions/:id/submissions - Mengambil daftar pengumpulan peserta pada misi tertentu
router.get("/:id/submissions", getMissionSubmissionsById);

export default router;
