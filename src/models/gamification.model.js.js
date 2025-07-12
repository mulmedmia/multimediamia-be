import { z } from "zod";

export const updatePointsSchema = z.object({
  points: z.number(),
});