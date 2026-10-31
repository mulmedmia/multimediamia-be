import { z } from "zod";

// Schema for creating a product
export const createProductSchema = z
  .object({
    category_id: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (!val || val === "ALL" || val === "all" ? null : val)),
    name: z.string().min(1, "Product name is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    price: z.number().min(0, "Price must be a non-negative number").default(0),
    price_xp: z
      .number()
      .int()
      .min(0, "Price XP must be a non-negative integer")
      .default(0),
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
  })
  .superRefine((data, ctx) => {
    const price = Number(data.price || 0);
    const priceXp = Number(data.price_xp || 0);
    const rewardXp = Number(data.reward_xp || 0);

    if (price <= 0 && priceXp <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal salah satu harga (Diamond atau XP) harus lebih dari 0",
        path: ["price"],
      });
    }

    if (priceXp > 0 && rewardXp > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Produk dengan harga XP tidak dapat dikonversi ke XP (Reward XP harus 0)",
        path: ["reward_xp"],
      });
    }
  });

// Schema for updating a product
export const updateProductSchema = z
  .object({
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
    price: z.number().min(0, "Price must be a non-negative number").optional(),
    price_xp: z
      .number()
      .int()
      .min(0, "Price XP must be a non-negative integer")
      .optional(),
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
  })
  .superRefine((data, ctx) => {
    if (
      data.price_xp !== undefined &&
      data.price_xp > 0 &&
      data.reward_xp !== undefined &&
      data.reward_xp > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Produk dengan harga XP tidak dapat dikonversi ke XP (Reward XP harus 0)",
        path: ["reward_xp"],
      });
    }
  });
