import { z } from "zod";

// Schema for creating a product
export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be a positive number"),
  is_active: z.boolean().default(true),
});

// Schema for updating a product
export const updateProductSchema = z.object({
  name: z.string().min(1, "Product name is required").optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  is_active: z.boolean().optional(),
});
