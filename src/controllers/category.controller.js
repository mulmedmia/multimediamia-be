import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/category.service.js";
import { response } from "../utils/response.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../models/category.model.js";
import multer from "multer";
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

// Handle image upload to ImageKit
const uploadToImageKit = async (file) => {
  // Convert file buffer to base64
  const fileBuffer = file.buffer;
  const base64Image = fileBuffer.toString("base64");

  // Upload to ImageKit
  const result = await imagekit.upload({
    file: base64Image,
    fileName: `${Date.now()}_${file.originalname}`,
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
    if (typeof categoryData.startDate === "string") {
      categoryData.startDate = new Date(categoryData.startDate).toISOString();
    }

    if (typeof categoryData.endDate === "string") {
      categoryData.endDate = new Date(categoryData.endDate).toISOString();
    }

    if (typeof categoryData.deadline === "string") {
      categoryData.deadline = new Date(categoryData.deadline).toISOString();
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
    if (categoryData.startDate) {
      categoryData.startDate = new Date(categoryData.startDate).toISOString();
    }

    if (categoryData.endDate) {
      categoryData.endDate = new Date(categoryData.endDate).toISOString();
    }

    if (categoryData.deadline) {
      categoryData.deadline = new Date(categoryData.deadline).toISOString();
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
    const updatedCategory = await updateCategory(categoryId, categoryData);

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
