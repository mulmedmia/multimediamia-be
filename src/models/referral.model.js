import { z } from "zod";

export const validateReferralCodeSchema = z.object({
  referral_code: z
    .string()
    .trim()
    .min(3, "Kode referral minimal 3 karakter")
    .max(50, "Kode referral maksimal 50 karakter"),
});

export const reviewReferralSchema = z.object({
  admin_notes: z.string().max(500, "Catatan admin maksimal 500 karakter").optional(),
});
