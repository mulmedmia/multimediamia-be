import { z } from "zod";

// Zod validation schemas for blog
export const createBlogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  thumbnail: z.string().min(1, "Thumbnail is required"),
  category: z.string().min(1, "Category is required"),
  is_active: z.boolean().default(true),
  user_id: z.string().min(1, "User ID is required"),
});

export const createBlogWithImageSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  is_active: z.boolean().default(true),
  user_id: z.string().min(1, "User ID is required"),
});

export const updateBlogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").optional(),
  content: z.string().min(10, "Content must be at least 10 characters").optional(),
  thumbnail: z.string().min(1, "Thumbnail is required").optional(),
  category: z.string().min(1, "Category is required").optional(),
  is_active: z.boolean().optional(),
});