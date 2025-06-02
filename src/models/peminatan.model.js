import { z } from "zod";

export const createPeminatanSchema = z.object({
  nama_peminatan: z.string().min(3, "Nama peminatan minimal 3 karakter"),
  // user_id dan imageUrl diisi otomatis di controller
});

export const updatePeminatanSchema = z.object({
  nama_peminatan: z.string().min(3, "Nama peminatan minimal 3 karakter").optional(),
  // imageUrl diisi otomatis jika upload file
});