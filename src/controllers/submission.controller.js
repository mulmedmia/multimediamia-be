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

// Get all submissions (admin/mentor)
export const getSubmissions = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      category_id: req.query.category_id,
      user_id: req.query.user_id,
      status: req.query.status,
      is_verified: req.query.is_verified,
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
    const submission = await getSubmissionById(req.params.id);
    return response.success(
      res,
      submission,
      "Submission retrieved successfully"
    );
  } catch (error) {
    if (error.message === "Submission not found") {
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
    if (error.message === "Category not found") {
      return response.error(res, error.message, 404);
    }
    if (error.message === "User already has a submission for this category") {
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

// Update submission (check ownership)
export const updateExistingSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const submissionData = req.body;
    const userId = req.user.userId; // Fix: gunakan field yang benar dari JWT

    // Validate data
    const validation = updateSubmissionSchema.safeParse(submissionData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedSubmission = await updateSubmission(
      submissionId,
      validation.data,
      userId
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
      validation.data
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
