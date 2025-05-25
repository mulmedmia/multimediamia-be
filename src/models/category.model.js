import { z } from "zod";

// Validation schema for creating a category (without image, as image will be handled by multer)
export const createCategorySchema = z.object({
  category_name: z
    .string()
    .min(3, "Category name must be at least 3 characters"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  startDate: z.string().datetime({ message: "Invalid start date format" }),
  endDate: z.string().datetime({ message: "Invalid end date format" }),
  organizer: z.string().min(3, "Organizer must be at least 3 characters"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  deadline: z.string().datetime({ message: "Invalid deadline format" }),
  status: z.enum(["VERIFIED", "NOT_VERIFIED"]).default("NOT_VERIFIED"),
});

// Validation schema for updating a category (without image, as image will be handled by multer)
export const updateCategorySchema = z.object({
  category_name: z
    .string()
    .min(3, "Category name must be at least 3 characters")
    .optional(),
  name: z.string().min(3, "Name must be at least 3 characters").optional(),
  startDate: z
    .string()
    .datetime({ message: "Invalid start date format" })
    .optional(),
  endDate: z
    .string()
    .datetime({ message: "Invalid end date format" })
    .optional(),
  organizer: z
    .string()
    .min(3, "Organizer must be at least 3 characters")
    .optional(),
  title: z.string().min(3, "Title must be at least 3 characters").optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  deadline: z
    .string()
    .datetime({ message: "Invalid deadline format" })
    .optional(),
  status: z.enum(["VERIFIED", "NOT_VERIFIED"]).optional(),
});
