import { z } from "zod";

// Team name regex: allows alphanumeric, spaces, and common team name symbols: ' . , - _ & / ( ) ! # + [ ] "
const teamNameRegex = /^[a-zA-Z0-9\s'.,_&/()!#+[\]"-]*$/;

// Google Drive URL regex: allows http or https drive.google.com URLs
const driveUrlRegex = /^https?:\/\/drive\.google\.com\/.+/;

export const createRegistrationSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  category_id: z.string().min(1, "Category ID is required"),
  file_url: z
    .string()
    .trim()
    .url("Valid file URL is required")
    .regex(driveUrlRegex, "file_url must be a Google Drive link"),
  team_name: z
    .string()
    .trim()
    .max(100, "Team name must not exceed 100 characters")
    .regex(teamNameRegex, "Team name contains invalid characters")
    .optional(),
  team_members: z
    .string()
    .trim()
    .max(1000, "Team members text must not exceed 1000 characters")
    .optional(),
  is_verified: z.boolean().optional(),
});

export const updateRegistrationSchema = z.object({
  file_url: z
    .string()
    .trim()
    .url("Valid file URL is required")
    .regex(driveUrlRegex, "file_url must be a Google Drive link")
    .optional(),
  team_name: z
    .string()
    .trim()
    .max(100, "Team name must not exceed 100 characters")
    .regex(teamNameRegex, "Team name contains invalid characters")
    .optional(),
  team_members: z
    .string()
    .trim()
    .max(1000, "Team members text must not exceed 1000 characters")
    .optional(),
  is_verified: z.boolean().optional(),
});