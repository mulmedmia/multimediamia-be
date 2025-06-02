import { Router } from "express";
import {
  getPeminatanList,
  getPeminatanDetail,
  createNewPeminatan,
  updateExistingPeminatan,
  deletePeminatanById,
  upload, // tambahkan ini
} from "../controllers/peminatan.controller.js";
import { authenticateToken, isAdminOrMentor } from "../middleware/jwtAuth.js";

const router = Router();

// Public
router.get("/", getPeminatanList);
router.get("/:id", getPeminatanDetail);

// Admin/Mentor only
router.post("/", authenticateToken, isAdminOrMentor, upload.single("image"), createNewPeminatan);
router.patch("/:id", authenticateToken, isAdminOrMentor, upload.single("image"), updateExistingPeminatan);
router.delete("/:id", authenticateToken, isAdminOrMentor, deletePeminatanById);

export default router;