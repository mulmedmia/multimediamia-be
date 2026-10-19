import { z } from "zod";

export const createMissionSchema = z
  .object({
    category_id: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (!val || val === "ALL" || val === "all" ? null : val)),
    title: z
      .string({ required_error: "Title is required" })
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(255, "Title must not exceed 255 characters"),
    description: z
      .string({ required_error: "Description is required" })
      .trim()
      .min(5, "Description must be at least 5 characters"),
    deadline: z
      .string({ required_error: "Deadline is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid deadline datetime format (e.g. ISO 8601)",
      }),
    min_xp: z
      .number({ required_error: "min_xp is required" })
      .int("min_xp must be an integer")
      .nonnegative("min_xp cannot be negative"),
    max_xp: z
      .number({ required_error: "max_xp is required" })
      .int("max_xp must be an integer")
      .nonnegative("max_xp cannot be negative"),
    min_diamond: z
      .number({ required_error: "min_diamond is required" })
      .int("min_diamond must be an integer")
      .nonnegative("min_diamond cannot be negative"),
    max_diamond: z
      .number({ required_error: "max_diamond is required" })
      .int("max_diamond must be an integer")
      .nonnegative("max_diamond cannot be negative"),
    google_docs_url: z
      .string({ required_error: "google_docs_url is required" })
      .url("Invalid Google Docs URL"),
    status: z.enum(["ACTIVE", "EXPIRED", "DRAFT"]).default("ACTIVE"),
  })
  .refine((data) => data.max_xp >= data.min_xp, {
    message: "max_xp must be greater than or equal to min_xp",
    path: ["max_xp"],
  })
  .refine((data) => data.max_diamond >= data.min_diamond, {
    message: "max_diamond must be greater than or equal to min_diamond",
    path: ["max_diamond"],
  });

export const updateMissionSchema = z
  .object({
    category_id: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((val) => (!val || val === "ALL" || val === "all" ? null : val)),
    title: z.string().trim().min(3).max(255).optional(),
    description: z.string().trim().min(5).optional(),
    deadline: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid deadline datetime format",
      })
      .optional(),
    min_xp: z.number().int().nonnegative().optional(),
    max_xp: z.number().int().nonnegative().optional(),
    min_diamond: z.number().int().nonnegative().optional(),
    max_diamond: z.number().int().nonnegative().optional(),
    google_docs_url: z.string().url("Invalid Google Docs URL").optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "DRAFT"]).optional(),
  })
  .refine(
    (data) => {
      if (data.min_xp !== undefined && data.max_xp !== undefined) {
        return data.max_xp >= data.min_xp;
      }
      return true;
    },
    {
      message: "max_xp must be greater than or equal to min_xp",
      path: ["max_xp"],
    }
  )
  .refine(
    (data) => {
      if (data.min_diamond !== undefined && data.max_diamond !== undefined) {
        return data.max_diamond >= data.min_diamond;
      }
      return true;
    },
    {
      message: "max_diamond must be greater than or equal to min_diamond",
      path: ["max_diamond"],
    }
  );

export const queryMissionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  category_id: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "DRAFT"]).optional(),
});

export const querySubmissionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  category_id: z.string().trim().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

// --- Participant Mission Submission ---

export const submitMissionSchema = z.object({
  submission_url: z
    .string({ required_error: "submission_url is required" })
    .url("submission_url must be a valid URL"),
  notes: z
    .string()
    .trim()
    .max(1000, "notes must not exceed 1000 characters")
    .nullable()
    .optional(),
  registration_id: z.string().trim().nullable().optional(),
  category_id: z.string().trim().nullable().optional(),
});

// --- Admin Review Mission Submission ---

export const reviewMissionSubmissionSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"], {
      required_error: "status is required and must be either APPROVED or REJECTED",
    }),
    awarded_xp: z.number().int().nonnegative("awarded_xp must be non-negative").optional(),
    awarded_diamond: z.number().int().nonnegative("awarded_diamond must be non-negative").optional(),
    admin_feedback: z
      .string()
      .trim()
      .max(1000, "admin_feedback must not exceed 1000 characters")
      .nullable()
      .optional(),
    registration_id: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "APPROVED") {
        return data.awarded_xp !== undefined && data.awarded_diamond !== undefined;
      }
      return true;
    },
    {
      message: "awarded_xp and awarded_diamond are required when status is APPROVED",
      path: ["status"],
    }
  );

