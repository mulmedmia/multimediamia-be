import { z } from "zod";

// Schema for creating a submission
export const createSubmissionSchema = z.object({
  category_id: z.string().min(1, "Category ID is required"),
  team_name: z.string().min(1, "Team name is required"),
  project_name: z.string().min(1, "Project name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  flow_application: z
    .string()
    .min(10, "Flow application must be at least 10 characters"),
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
  team_name: z.string().min(1, "Team name is required").optional(),
  project_name: z.string().min(1, "Project name is required").optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .optional(),
  flow_application: z
    .string()
    .min(10, "Flow application must be at least 10 characters")
    .optional(),
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

// Schema for admin/juri to update submission score and feedback
export const updateSubmissionScoreFeedbackSchema = z.object({
  score: z.coerce
    .number({ invalid_type_error: "Score must be a number" })
    .min(0, "Score must be at least 0")
    .max(100, "Score must not exceed 100")
    .nullable()
    .optional(),
  feedback: z.string().optional(),
});

