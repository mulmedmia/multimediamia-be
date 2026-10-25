import { z } from "zod";

// Schema for creating a submission
export const createSubmissionSchema = z
  .object({
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
      .optional(),
    thumbnail: z
      .string()
      .url("Valid thumbnail URL is required")
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
            "PRESENTATION",
            "ORIGINALITY_STATEMENT",
            "OTHER",
          ]),
          url: z.string().url("Valid URL is required"),
          description: z.string().optional(),
        }),
      )
      .min(1, "At least one link is required"),
  })
  .superRefine((data, ctx) => {
    const thumb = data.thumbnail_url || data.thumbnail;
    if (!thumb || typeof thumb !== "string" || thumb.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Thumbnail karya wajib diunggah",
        path: ["thumbnail_url"],
      });
    }
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
    .min(1, "Thumbnail karya tidak boleh kosong")
    .url("Valid thumbnail URL is required")
    .optional(),
  thumbnail: z
    .string()
    .min(1, "Thumbnail karya tidak boleh kosong")
    .url("Valid thumbnail URL is required")
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
