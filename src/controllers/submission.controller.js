import {
  getAllSubmissions,
  getSubmissionById,
  getUserSubmissions,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  updateSubmissionStatus,
} from "../services/submission.service.js";
import { response } from "../utils/response.js";
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  updateSubmissionStatusSchema,
} from "../models/submission.model.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";

const getJuriCategory = async (userId) => {
  const [juri] = await db
    .select()
    .from(schema.Juri)
    .where(eq(schema.Juri.users_id, userId))
    .limit(1);
  return juri ? juri.category_id : null;
};

// Get all submissions (admin/mentor/show-it public)
export const getSubmissions = async (req, res) => {
  try {
    const isStaff = req.user && (req.user.role === "ADMIN" || req.user.role === "JURI");
    const isShowItExplicit = req.query.show_it === "true" || req.query.show_it === true;
    const isShowIt = isShowItExplicit || !isStaff;

    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      category_id: req.query.category_id,
      user_id: req.query.user_id,
      registration_id: req.query.registration_id,
      status: req.query.status,
      is_verified: req.query.is_verified,
      search: req.query.search,
      show_it: isShowIt,
      isStaff,
    };

    const result = await getAllSubmissions(filters);
    return response.success(res, result, "Submissions retrieved successfully");
  } catch (error) {
    return response.error(
      res,
      "Failed to retrieve submissions",
      500,
      error.message
    );
  }
};

// Get user's own submissions
export const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user.userId; // Fix: gunakan field yang benar dari JWT
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      category_id: req.query.category_id,
      status: req.query.status,
    };

    const result = await getUserSubmissions(userId, filters);
    return response.success(
      res,
      result,
      "Your submissions retrieved successfully"
    );
  } catch (error) {
    return response.error(
      res,
      "Failed to retrieve your submissions",
      500,
      error.message
    );
  }
};

// Get submission by ID
export const getSubmission = async (req, res) => {
  try {
    const isStaff = req.user && (req.user.role === "ADMIN" || req.user.role === "JURI");
    const userId = req.user?.userId;
    const submission = await getSubmissionById(req.params.id, { isStaff, userId });
    return response.success(
      res,
      submission,
      "Submission retrieved successfully"
    );
  } catch (error) {
    if (
      error.message === "Submission not found" ||
      error.message === "Karya belum dipublikasikan di Show It"
    ) {
      return response.error(res, error.message, 404);
    }
    return response.error(
      res,
      "Failed to retrieve submission",
      500,
      error.message
    );
  }
};

// Create new submission (user_id from JWT)
export const createNewSubmission = async (req, res) => {
  try {
    const submissionData = req.body;
    const userId = req.user.userId; // Fix: gunakan field yang benar dari JWT

    // Validate data
    const validation = createSubmissionSchema.safeParse(submissionData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const submission = await createSubmission(validation.data, userId);
    return response.success(
      res,
      submission,
      "Submission created successfully",
      201
    );
  } catch (error) {
    if (
      error.message === "Category not found" ||
      error.message === "Registration not found"
    ) {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Unauthorized: Registration does not belong to user") {
      return response.error(res, error.message, 403);
    }
    if (
      error.message === "User already has a submission for this category" ||
      error.message?.includes("Batas") ||
      error.message?.includes("Pengumpulan karya") ||
      error.message?.includes("wajib diisi")
    ) {
      return response.error(res, error.message, 400);
    }
    return response.error(
      res,
      "Failed to create submission",
      500,
      error.message
    );
  }
};

// Update submission (check ownership / JURI category match)
export const updateExistingSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submissionData = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Jika pemanggil adalah JURI, pastikan submission berada di kategori yang diampu
    if (userRole === "JURI") {
      const submission = await getSubmissionById(submissionId, { isInternal: true });
      const assignedCategoryId = await getJuriCategory(userId);
      if (
        !assignedCategoryId ||
        submission.category_id !== assignedCategoryId
      ) {
        return response.error(
          res,
          "Forbidden: You can only edit submissions in your assigned category",
          403
        );
      }
    }

    // Validate data
    const validation = updateSubmissionSchema.safeParse(submissionData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedSubmission = await updateSubmission(
      submissionId,
      validation.data,
      userId,
      userRole
    );
    return response.success(
      res,
      updatedSubmission,
      "Submission updated successfully"
    );
  } catch (error) {
    if (error.message === "Submission not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Unauthorized to update this submission") {
      return response.error(res, error.message, 403);
    }
    return response.error(
      res,
      "Failed to update submission",
      500,
      error.message
    );
  }
};

// Delete submission (check ownership)
export const deleteSubmissionById = async (req, res) => {
  try {
    const userId = req.user.userId; // Fix: gunakan field yang benar dari JWT
    await deleteSubmission(req.params.id, userId);
    return response.success(res, null, "Submission deleted successfully");
  } catch (error) {
    if (error.message === "Submission not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "Unauthorized to delete this submission") {
      return response.error(res, error.message, 403);
    }
    return response.error(
      res,
      "Failed to delete submission",
      500,
      error.message
    );
  }
};

// Update submission status (admin only)
export const updateSubmissionStatusById = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const statusData = req.body;

    // Validate data
    const validation = updateSubmissionStatusSchema.safeParse(statusData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedSubmission = await updateSubmissionStatus(
      submissionId,
      validation.data,
      req.user?.userId
    );
    return response.success(
      res,
      updatedSubmission,
      "Submission status updated successfully"
    );
  } catch (error) {
    if (error.message === "Submission not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(
      res,
      "Failed to update submission status",
      500,
      error.message
    );
  }
};

