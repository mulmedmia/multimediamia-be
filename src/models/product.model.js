import { z } from "zod";

// Schema for creating a product
export const createProductSchema = z.object({
  category_id: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (!val || val === "ALL" || val === "all" ? null : val)),
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be a positive number"),
  is_active: z.boolean().default(true),
  is_unlimited_stock: z.boolean().default(false),
  is_single_redeem: z.boolean().default(false),
  reward_xp: z
    .number()
    .int()
    .min(0, "Reward XP must be a non-negative integer")
    .default(0),
  stock: z
    .number()
    .int()
    .min(0, "Stock must be a non-negative integer")
    .default(0),
});

// Schema for updating a product
export const updateProductSchema = z.object({
  category_id: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (!val || val === "ALL" || val === "all" ? null : val)),
  name: z.string().min(1, "Product name is required").optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  is_active: z.boolean().optional(),
  is_unlimited_stock: z.boolean().optional(),
  is_single_redeem: z.boolean().optional(),
  reward_xp: z
    .number()
    .int()
    .min(0, "Reward XP must be a non-negative integer")
    .optional(),
  stock: z
    .number()
    .int()
    .min(0, "Stock must be a non-negative integer")
    .optional(),
});



