import { z } from "zod";

// Schema for creating a submission
export const createSubmissionSchema = z.object({
  registration_id: z.string().min(1, "Registration ID is required"),
  project_name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(150, "Project name must not exceed 150 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  flow_application: z
    .string()
    .min(10, "Flow application must be at least 10 characters"),
  thumbnail_url: z
    .string()
    .url("Valid thumbnail URL is required")
    .optional()
    .nullable()
    .or(z.literal("")),
  thumbnail: z
    .string()
    .url("Valid thumbnail URL is required")
    .optional()
    .nullable()
    .or(z.literal("")),
  links: z
    .array(
      z.object({
        link_type: z.enum([
          "GITHUB",
          "GITHUB_SECONDARY",
          "YOUTUBE",
          "DEPLOYMENT",
          "PROPOSAL",
          "FIGMA",
          "FIGMA_PROTOTYPE",
          "PRESENTATION",
          "ORIGINALITY_STATEMENT",
          "OTHER",
        ]),
        url: z.string().url("Valid URL is required"),
        description: z.string().optional(),
      }),
    )
    .min(1, "At least one link is required"),
});

// Schema for updating a submission
export const updateSubmissionSchema = z.object({
  project_name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(150, "Project name must not exceed 150 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  flow_application: z
    .string()
    .min(10, "Flow application must be at least 10 characters")
    .optional(),
  thumbnail_url: z
    .string()
    .url("Valid thumbnail URL is required")
    .optional()
    .nullable()
    .or(z.literal("")),
  thumbnail: z
    .string()
    .url("Valid thumbnail URL is required")
    .optional()
    .nullable()
    .or(z.literal("")),
  links: z
    .array(
      z.object({
        link_type: z.enum([
          "GITHUB",
          "GITHUB_SECONDARY",
          "YOUTUBE",
          "DEPLOYMENT",
          "PROPOSAL",
          "FIGMA",
          "FIGMA_PROTOTYPE",
          "PRESENTATION",
          "ORIGINALITY_STATEMENT",
          "OTHER",
        ]),
        url: z.string().url("Valid URL is required"),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

// Schema for admin to update submission status
export const updateSubmissionStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "REVISION"]),
  is_verified: z.boolean().optional(),
});


