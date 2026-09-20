import { Router } from "express";
import {
  getGuidebook,
  updateGuidebook,
} from "../controllers/setting.controller.js";
import { authenticateToken, isAdmin } from "../middleware/jwtAuth.js";

const router = Router();

// GET /api/v1/settings/guidebook - Publik, digunakan oleh seluruh tombol website
router.get("/guidebook", getGuidebook);

// PUT /api/v1/settings/guidebook - Khusus Admin, memperbarui link Google Drive guidebook
router.put("/guidebook", authenticateToken, isAdmin, updateGuidebook);

export default router;
