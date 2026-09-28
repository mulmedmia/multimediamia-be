import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must not exceed 100 characters")
    .regex(
      /^[a-zA-Z0-9\s'.,-]+$/,
      "Name contains invalid characters (no HTML or special symbols allowed)"
    )
    .optional(),
  nim: z
    .string()
    .trim()
    .max(30, "NIM must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9.-]*$/, "NIM contains invalid characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string().email("Invalid email format").optional(),
  whatsapp_number: z
    .string()
    .trim()
    .max(25, "Nomor WhatsApp maksimal 25 karakter")
    .regex(/^(\+?[0-9\s-]{8,25})?$/, "Format nomor WhatsApp tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  whatsapp: z
    .string()
    .trim()
    .max(25, "Nomor WhatsApp maksimal 25 karakter")
    .regex(/^(\+?[0-9\s-]{8,25})?$/, "Format nomor WhatsApp tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  current_password: z.string().min(1, "Current password is required").optional(),
  new_password: z.string().min(6, "New password must be at least 6 characters").optional(),
}).refine((data) => {
  // If new_password is provided, current_password must also be provided
  if (data.new_password && !data.current_password) {
    return false;
  }
  return true;
}, {
  message: "Current password is required when changing password",
  path: ["current_password"],
});

export const getUserProfileSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});