import { z } from "zod";

// Validation schema for creating a category (without image, as image will be handled by multer)
export const createCategorySchema = z.object({
  slug: z
    .string()
    .min(2, "Singkatan / Slug minimal 2 karakter")
    .max(20, "Singkatan / Slug maksimal 20 karakter")
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(3, "Nama perlombaan minimal 3 karakter"),
  file_url: z.string().url("Link guidebook harus berupa URL yang valid").optional(),
  whatsapp_group_url: z
    .string()
    .url("Link grup WhatsApp harus berupa URL yang valid")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  organizer: z.string().min(3, "Penyelenggara minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  deadline: z.string().datetime({ message: "Format deadline tidak valid" }).optional(),
  preliminary_deadline: z.string().datetime({ message: "Format deadline sementara tidak valid" }).optional(),
  final_deadline: z.string().datetime({ message: "Format deadline final tidak valid" }).optional(),
  batch_1_start: z.string().datetime({ message: "Format tanggal mulai Batch 1 tidak valid" }).optional().nullable(),
  batch_1_end: z.string().datetime({ message: "Format tanggal selesai Batch 1 tidak valid" }).optional().nullable(),
  batch_2_start: z.string().datetime({ message: "Format tanggal mulai Batch 2 tidak valid" }).optional().nullable(),
  batch_2_end: z.string().datetime({ message: "Format tanggal selesai Batch 2 tidak valid" }).optional().nullable(),
  is_submission_open: z.boolean().optional(),
  allow_revision: z.boolean().optional(),
  team_type: z.enum(["INDIVIDUAL", "GROUP"]).default("INDIVIDUAL"),
  status: z.enum(["VERIFIED", "NOT_VERIFIED"]).default("NOT_VERIFIED"),
});

// Validation schema for updating a category (without image, as image will be handled by multer)
export const updateCategorySchema = z.object({
  slug: z
    .string()
    .min(2, "Singkatan / Slug minimal 2 karakter")
    .max(20, "Singkatan / Slug maksimal 20 karakter")
    .transform((val) => val.trim().toUpperCase())
    .optional(),
  name: z.string().min(3, "Nama perlombaan minimal 3 karakter").optional(),
  file_url: z.string().url("Link guidebook harus berupa URL yang valid").optional(),
  whatsapp_group_url: z
    .string()
    .url("Link grup WhatsApp harus berupa URL yang valid")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
  organizer: z
    .string()
    .min(3, "Penyelenggara minimal 3 karakter")
    .optional(),
  description: z
    .string()
    .min(10, "Deskripsi minimal 10 karakter")
    .optional(),
  deadline: z
    .string()
    .datetime({ message: "Format deadline tidak valid" })
    .optional(),
  preliminary_deadline: z
    .string()
    .datetime({ message: "Format deadline sementara tidak valid" })
    .optional(),
  final_deadline: z
    .string()
    .datetime({ message: "Format deadline final tidak valid" })
    .optional(),
  batch_1_start: z
    .string()
    .datetime({ message: "Format tanggal mulai Batch 1 tidak valid" })
    .optional()
    .nullable(),
  batch_1_end: z
    .string()
    .datetime({ message: "Format tanggal selesai Batch 1 tidak valid" })
    .optional()
    .nullable(),
  batch_2_start: z
    .string()
    .datetime({ message: "Format tanggal mulai Batch 2 tidak valid" })
    .optional()
    .nullable(),
  batch_2_end: z
    .string()
    .datetime({ message: "Format tanggal selesai Batch 2 tidak valid" })
    .optional()
    .nullable(),
  is_submission_open: z.boolean().optional(),
  allow_revision: z.boolean().optional(),
  team_type: z.enum(["INDIVIDUAL", "GROUP"]).optional(),
  status: z.enum(["VERIFIED", "NOT_VERIFIED"]).optional(),
});