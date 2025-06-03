import { z } from "zod";

export const createKelasSchema = z.object({
  peminatan_id: z.string().min(1, "Peminatan ID is required"),
  nama_kelas: z.string().min(3, "Nama kelas minimal 3 karakter"),
  linkClassroom: z.string().url("Link classroom harus berupa URL yang valid"),
});

export const updateKelasSchema = z.object({
  peminatan_id: z.string().min(1, "Peminatan ID is required").optional(),
  nama_kelas: z.string().min(3, "Nama kelas minimal 3 karakter").optional(),
  linkClassroom: z.string().url("Link classroom harus berupa URL yang valid").optional(),
});