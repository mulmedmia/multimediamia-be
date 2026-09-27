import { z } from "zod";

export const createRegistrationSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  category_id: z.string().min(1, "Category ID is required"),
  file_url: z.string().url("Valid file URL is required").regex(/^https:\/\/drive\.google\.com\/.+/, "file_url must be a Google Drive link"),
  team_name: z
    .string()
    .trim()
    .max(100, "Team name must not exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s'.,-]+$/, "Team name contains invalid characters")
    .optional(),
  team_members: z
    .string()
    .trim()
    .max(1000, "Team members text must not exceed 1000 characters")
    .optional(),
  is_verified: z.boolean().optional(),
});

export const updateRegistrationSchema = z.object({
  file_url: z.string().url("Valid file URL is required").regex(/^https:\/\/drive\.google\.com\/.+/, "file_url must be a Google Drive link").optional(),
  team_name: z
    .string()
    .trim()
    .max(100, "Team name must not exceed 100 characters")
    .regex(/^[a-zA-Z0-9\s'.,-]+$/, "Team name contains invalid characters")
    .optional(),
  team_members: z
    .string()
    .trim()
    .max(1000, "Team members text must not exceed 1000 characters")
    .optional(),
  is_verified: z.boolean().optional(),
});