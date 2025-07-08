import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../services/product.service.js";
import { response } from "../utils/response.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../models/product.model.js";

// Get all products with filtering
export const getProducts = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
    };

    const result = await getAllProducts(filters);

    return response.success(res, result, "Products retrieved successfully");
  } catch (error) {
    return response.error(
      res,
      "Failed to retrieve products",
      500,
      error.message
    );
  }
};

// Get product by ID
export const getProduct = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);

    return response.success(res, product, "Product retrieved successfully");
  } catch (error) {
    if (error.message === "Product not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(
      res,
      "Failed to retrieve product",
      500,
      error.message
    );
  }
};

// Create new product (admin only)
export const createNewProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Validate input data
    const validation = createProductSchema.safeParse(productData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const product = await createProduct(validation.data);

    return response.success(
      res,
      product,
      "Product created successfully",
      201
    );
  } catch (error) {
    return response.error(res, "Failed to create product", 500, error.message);
  }
};

// Update existing product (admin only)
export const updateExistingProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const productData = req.body;

    // Validate input data
    const validation = updateProductSchema.safeParse(productData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    const updatedProduct = await updateProduct(productId, validation.data);

    return response.success(
      res,
      updatedProduct,
      "Product updated successfully"
    );
  } catch (error) {
    if (error.message === "Product not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update product", 500, error.message);
  }
};

// Delete product (admin only)
export const deleteProductById = async (req, res) => {
  try {
    await deleteProduct(req.params.id);

    return response.success(res, null, "Product deleted successfully");
  } catch (error) {
    if (error.message === "Product not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to delete product", 500, error.message);
  }
};