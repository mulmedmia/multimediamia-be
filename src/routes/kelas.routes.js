import { Router } from "express";
import {
  getKelasList,
  getKelasDetail,
  createNewKelas,
  updateExistingKelas,
  deleteKelasById,
  getMuridInKelas,
  enrollToKelas,
  unenrollFromKelas,
} from "../controllers/kelas.controller.js";
import { authenticateToken, isAdminOrMentor } from "../middleware/jwtAuth.js";

const router = Router();

// Public routes
router.get("/", getKelasList); // GET /api/v1/kelas?peminatan_id=xxx&badge=xxx
router.get("/:id", getKelasDetail); // GET /api/v1/kelas/xxx
router.get("/:kelasId/murid", getMuridInKelas); // GET /api/v1/kelas/xxx/murid?badge=xxx

// Protected routes for users
router.post("/:kelasId/enroll", authenticateToken, enrollToKelas);
router.delete("/:kelasId/unenroll", authenticateToken, unenrollFromKelas);

// Protected routes for admin/mentor
router.post("/", authenticateToken, isAdminOrMentor, createNewKelas);
router.patch("/:id", authenticateToken, isAdminOrMentor, updateExistingKelas);
router.delete("/:id", authenticateToken, isAdminOrMentor, deleteKelasById);

export default router;