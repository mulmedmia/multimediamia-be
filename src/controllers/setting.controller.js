import { z } from "zod";
import {
  getGuidebookUrl,
  updateGuidebookUrl,
} from "../services/setting.service.js";
import { response } from "../utils/response.js";

const updateGuidebookSchema = z.object({
  guidebook_url: z
    .string({ required_error: "Link guidebook wajib diisi" })
    .trim()
    .url("Link guidebook harus berupa URL yang valid (diawali http:// atau https://)")
    .refine(
      (val) => val.includes("drive.google.com"),
      {
        message: "Link guidebook harus berupa link Google Drive yang valid",
      }
    ),
});

/**
 * GET /api/v1/settings/guidebook
 * Public endpoint to retrieve the current guidebook URL
 */
export const getGuidebook = async (req, res) => {
  try {
    const guidebook_url = await getGuidebookUrl();
    return response.success(
      res,
      { guidebook_url },
      "Berhasil mengambil link guidebook"
    );
  } catch (error) {
    console.error("Error getGuidebook:", error);
    return response.error(res, "Gagal mengambil link guidebook", 500, error.message);
  }
};

/**
 * PUT /api/v1/settings/guidebook
 * Admin endpoint to update the guidebook URL
 */
export const updateGuidebook = async (req, res) => {
  try {
    const parseResult = updateGuidebookSchema.safeParse(req.body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Input tidak valid";
      return response.error(res, firstError, 400, parseResult.error.format());
    }

    const { guidebook_url } = parseResult.data;
    const updated = await updateGuidebookUrl(guidebook_url, req.user?.userId);

    return response.success(
      res,
      { guidebook_url: updated.value },
      "Link guidebook berhasil diperbarui"
    );
  } catch (error) {
    console.error("Error updateGuidebook:", error);
    return response.error(res, "Gagal memperbarui link guidebook", 500, error.message);
  }
};
