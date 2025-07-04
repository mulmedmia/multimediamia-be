import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").optional(),
  nim: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
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