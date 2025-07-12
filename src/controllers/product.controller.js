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
import imagekit from "../lib/imagekit.js";

// Upload image to ImageKit
const uploadToImageKit = async (file) => {
  const fileBuffer = file.buffer;
  const base64Image = fileBuffer.toString("base64");

  const result = await imagekit.upload({
    file: base64Image,
    fileName: `${Date.now()}_${file.originalname}`,
    folder: "/product-images",
  });

  return result.url;
};

// Get all products with filtering
export const getProducts = async (req, res) => {
  try {
    const filters = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      is_active: req.query.is_active,
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

// Create new product with image upload
export const createNewProduct = async (req, res) => {
  try {
    // Parse product data
    let productData = {};

    if (req.body.data) {
      try {
        productData = JSON.parse(req.body.data);
      } catch (parseError) {
        productData = req.body.data;
      }
    } else {
      const { image, ...formData } = req.body;
      productData = formData;
    }

    // Convert price to number
    if (productData.price) {
      productData.price = Number(productData.price);
    }

    // Convert is_active to boolean
    if (productData.is_active !== undefined) {
      productData.is_active =
        productData.is_active === "true" || productData.is_active === true;
    }

    // Convert stock to number
    if (productData.stock !== undefined) {
      productData.stock = Number(productData.stock);
    }

    // Validate input data
    const validation = createProductSchema.safeParse(productData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    // Check if image file exists
    if (!req.file) {
      return response.error(res, "Image is required", 400);
    }

    // Upload image to ImageKit
    const imageUrl = await uploadToImageKit(req.file);

    // Create product with image URL
    const finalProductData = {
      ...validation.data,
      image_url: imageUrl,
    };

    const product = await createProduct(finalProductData);
    return response.success(res, product, "Product created successfully", 201);
  } catch (error) {
    return response.error(res, "Failed to create product", 500, error.message);
  }
};

// Update existing product with optional image upload
export const updateExistingProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    // Parse product data
    let productData = {};

    if (req.body.data) {
      try {
        productData = JSON.parse(req.body.data);
      } catch (parseError) {
        productData = req.body.data;
      }
    } else {
      const { image, ...formData } = req.body;
      productData = formData;
    }

    // Convert price to number if provided
    if (productData.price) {
      productData.price = Number(productData.price);
    }

    // Convert is_active to boolean if provided
    if (productData.is_active !== undefined) {
      productData.is_active =
        productData.is_active === "true" || productData.is_active === true;
    }

    // Convert stock to number if provided
    if (productData.stock !== undefined) {
      productData.stock = Number(productData.stock);
    }

    // Validate input data
    const validation = updateProductSchema.safeParse(productData);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }

    let finalProductData = { ...validation.data };

    // Upload new image if provided
    if (req.file) {
      const imageUrl = await uploadToImageKit(req.file);
      finalProductData.image_url = imageUrl;
    }

    const updatedProduct = await updateProduct(productId, finalProductData);
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

// Delete product
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
