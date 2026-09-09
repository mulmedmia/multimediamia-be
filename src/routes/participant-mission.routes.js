import { Router } from "express";
import {
  getUserMissions,
  getUserMissionDetail,
  submitUserMission,
} from "../controllers/participant-mission.controller.js";
import { authenticateToken } from "../middleware/jwtAuth.js";

const router = Router();

// Semua route memerlukan autentikasi (USER & ADMIN bisa akses)

// 1. GET /api/v1/missions - Mengambil seluruh daftar misi aktif + status pengumpulan user
router.get("/", authenticateToken, getUserMissions);

// 2. GET /api/v1/missions/:id - Mengambil detail misi berdasarkan ID + status pengumpulan user
router.get("/:id", authenticateToken, getUserMissionDetail);

// 3. POST /api/v1/missions/:id/submit - Peserta submit link pengumpulan misi
router.post("/:id/submit", authenticateToken, submitUserMission);

export default router;
