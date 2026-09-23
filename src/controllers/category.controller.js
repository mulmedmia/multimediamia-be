import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategorySubmission,
  toggleCategoryShowIt,
} from "../services/category.service.js";
import { response } from "../utils/response.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../models/category.model.js";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import imagekit from "../lib/imagekit.js";

// Configure multer for temporary storage
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Handle image upload to ImageKit with automatic AVIF conversion
const uploadToImageKit = async (file) => {
  let fileBuffer = file.buffer;
  let fileName = `${Date.now()}_${file.originalname}`;

  try {
    // Convert image buffer (PNG, JPG, WEBP, etc.) to AVIF
    const avifBuffer = await sharp(file.buffer)
      .avif({ quality: 80, effort: 4 })
      .toBuffer();

    fileBuffer = avifBuffer;
    const baseName = path.parse(file.originalname).name || "banner";
    fileName = `${Date.now()}_${baseName}.avif`;
  } catch (conversionError) {
    console.warn("Failed to convert image to AVIF, uploading original buffer:", conversionError.message);
  }

  // Convert file buffer to base64
  const base64Image = fileBuffer.toString("base64");

  // Upload to ImageKit
  const result = await imagekit.upload({
    file: base64Image,
    fileName,
    folder: "/category-images",
  });

  return result.url;
};

// Get all categories with filtering
export const getCategories = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      status: req.query.status,
    };

    const result = await getAllCategories(filters);

    return response.success(res, result, "Categories retrieved successfully");
  } catch (error) {
    return response.error(
      res,
      "Failed to retrieve categories",
      500,
      error.message
    );
  }
};

// Get category by ID
export const getCategory = async (req, res) => {
  try {
    const category = await getCategoryById(req.params.id);

    return response.success(res, category, "Category retrieved successfully");
  } catch (error) {
    if (error.message === "Category not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(
      res,
      "Failed to retrieve category",
      500,
      error.message
    );
  }
};

// Create new category with image upload (admin only)
export const createNewCategory = async (req, res) => {
  try {
    // Extract category data - handle both JSON string and direct form fields
    let categoryData = {};

    if (req.body.data) {
      // Try to parse JSON if data is provided as a string
      try {
        categoryData = JSON.parse(req.body.data);
      } catch (parseError) {
        // If JSON parsing fails, use the data field directly
        // This handles cases where data might already be an object
        categoryData = req.body.data;
      }
    } else {
      // If no data field, use all form fields except file-related ones
      const { image, ...formData } = req.body;
      categoryData = formData;
    }

    // Convert string dates to proper datetime formats if needed
    if (typeof categoryData.deadline === "string" && categoryData.deadline) {
      categoryData.deadline = new Date(categoryData.deadline).toISOString();
    }

    if (typeof categoryData.preliminary_deadline === "string" && categoryData.preliminary_deadline) {
      categoryData.preliminary_deadline = new Date(categoryData.preliminary_deadline).toISOString();
    }

    if (typeof categoryData.final_deadline === "string" && categoryData.final_deadline) {
      categoryData.final_deadline = new Date(categoryData.final_deadline).toISOString();
    }

    if (categoryData.batch_1_start) {
      categoryData.batch_1_start = new Date(categoryData.batch_1_start).toISOString();
    } else if (categoryData.batch_1_start === "") {
      categoryData.batch_1_start = null;
    }

    if (categoryData.batch_1_end) {
      categoryData.batch_1_end = new Date(categoryData.batch_1_end).toISOString();
    } else if (categoryData.batch_1_end === "") {
      categoryData.batch_1_end = null;
    }

    if (categoryData.batch_2_start) {
      categoryData.batch_2_start = new Date(categoryData.batch_2_start).toISOString();
    } else if (categoryData.batch_2_start === "") {
      categoryData.batch_2_start = null;
    }

    if (categoryData.batch_2_end) {
      categoryData.batch_2_end = new Date(categoryData.batch_2_end).toISOString();
    } else if (categoryData.batch_2_end === "") {
      categoryData.batch_2_end = null;
    }

    // Fallback if category_name was sent instead of slug
    if (!categoryData.slug && categoryData.category_name) {
      categoryData.slug = categoryData.category_name;
    }

    // Validate input data
    const validation = createCategorySchema.safeParse(categoryData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    // Check if image file exists in the request
    if (!req.file) {
      return response.error(res, "Image is required", 400);
    }

    // Upload image to ImageKit
    const imageUrl = await uploadToImageKit(req.file);

    // Get user ID from JWT token
    const userId = req.user.userId;

    // Create category with image URL and validated data
    const finalCategoryData = {
      ...validation.data,
      image: imageUrl,
    };

    const category = await createCategory(finalCategoryData, userId);

    return response.success(
      res,
      category,
      "Category created successfully",
      201
    );
  } catch (error) {
    return response.error(res, "Failed to create category", 500, error.message);
  }
};

// Update existing category with optional image upload (admin only)
export const updateExistingCategory = async (req, res) => {
  try {
    // Get category ID from params
    const categoryId = req.params.id;

    // Extract category data - handle both JSON string and direct form fields
    let categoryData = {};

    if (req.body.data) {
      // Try to parse JSON if data is provided as a string
      try {
        categoryData = JSON.parse(req.body.data);
      } catch (parseError) {
        // If JSON parsing fails, use the data field directly
        categoryData = req.body.data;
      }
    } else {
      // If no data field, use all form fields except file-related ones
      const { image, ...formData } = req.body;
      categoryData = formData;
    }

    // Convert string dates to proper datetime formats if provided
    if (categoryData.deadline) {
      categoryData.deadline = new Date(categoryData.deadline).toISOString();
    }

    if (categoryData.preliminary_deadline) {
      categoryData.preliminary_deadline = new Date(categoryData.preliminary_deadline).toISOString();
    }

    if (categoryData.final_deadline) {
      categoryData.final_deadline = new Date(categoryData.final_deadline).toISOString();
    }

    if (categoryData.batch_1_start) {
      categoryData.batch_1_start = new Date(categoryData.batch_1_start).toISOString();
    } else if (categoryData.batch_1_start === "") {
      categoryData.batch_1_start = null;
    }

    if (categoryData.batch_1_end) {
      categoryData.batch_1_end = new Date(categoryData.batch_1_end).toISOString();
    } else if (categoryData.batch_1_end === "") {
      categoryData.batch_1_end = null;
    }

    if (categoryData.batch_2_start) {
      categoryData.batch_2_start = new Date(categoryData.batch_2_start).toISOString();
    } else if (categoryData.batch_2_start === "") {
      categoryData.batch_2_start = null;
    }

    if (categoryData.batch_2_end) {
      categoryData.batch_2_end = new Date(categoryData.batch_2_end).toISOString();
    } else if (categoryData.batch_2_end === "") {
      categoryData.batch_2_end = null;
    }

    // Fallback if category_name was sent instead of slug
    if (!categoryData.slug && categoryData.category_name) {
      categoryData.slug = categoryData.category_name;
    }

    // Validate the category data
    const validation = updateCategorySchema.safeParse(categoryData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    // If there's a file, upload it and add the URL to categoryData
    if (req.file) {
      const imageUrl = await uploadToImageKit(req.file);
      categoryData.image = imageUrl;
    }

    // Update category with the combined data
    const updatedCategory = await updateCategory(categoryId, categoryData, req.user?.userId);

    return response.success(
      res,
      updatedCategory,
      "Category updated successfully"
    );
  } catch (error) {
    if (error.message === "Category not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update category", 500, error.message);
  }
};

// Toggle submission open/close (admin only)
export const toggleSubmissionStatus = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { is_submission_open, allow_revision } = req.body || {};
    const updatedCategory = await toggleCategorySubmission(categoryId, {
      is_submission_open,
      allow_revision,
    }, req.user?.userId);

    return response.success(
      res,
      updatedCategory,
      `Pengumpulan karya berhasil ${updatedCategory.is_submission_open ? "dibuka" : "ditutup"}`
    );
  } catch (error) {
    if (error.message === "Category not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Gagal mengubah status pengumpulan", 500, error.message);
  }
};

// Toggle Show It status open/close (admin only)
export const toggleShowItStatus = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { is_show_it_open } = req.body || {};
    const updatedCategory = await toggleCategoryShowIt(
      categoryId,
      { is_show_it_open },
      req.user?.userId
    );

    return response.success(
      res,
      updatedCategory,
      `Penayangan karya di Show It berhasil ${updatedCategory.is_show_it_open ? "dibuka" : "ditutup"}`
    );
  } catch (error) {
    if (error.message === "Category not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Gagal mengubah status penayangan Show It", 500, error.message);
  }
};

// Delete category (admin only)
export const deleteCategoryById = async (req, res) => {
  try {
    await deleteCategory(req.params.id);

    return response.success(res, null, "Category deleted successfully");
  } catch (error) {
    if (error.message === "Category not found") {
      return response.error(res, error.message, 404);
    }
    if (
      error.message === "Cannot delete category with existing registrations"
    ) {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to delete category", 500, error.message);
  }
};
