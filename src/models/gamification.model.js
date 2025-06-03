import { z } from "zod";

export const updatePointsSchema = z.object({
  points: z.number().min(0, "Points must be a positive number"),
  badge: z.string().optional(),
});

// Schema untuk user update profile
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  nim: z.string().min(1, "NIM cannot be empty").optional(),
});