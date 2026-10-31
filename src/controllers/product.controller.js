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
import path from "path";
import sharp from "sharp";
import imagekit from "../lib/imagekit.js";

// Handle image upload to ImageKit with high-speed WebP conversion and auto-resize
const uploadToImageKit = async (file) => {
  let fileBuffer = file.buffer;
  let fileName = `${Date.now()}_${file.originalname}`;

  try {
    // Resize down jika dimensi melebihi 1920px dan encode ke WebP (effort: 2)
    const webpBuffer = await sharp(file.buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 80, effort: 2 })
      .toBuffer();

    fileBuffer = webpBuffer;
    const baseName = path.parse(file.originalname).name || "product";
    fileName = `${Date.now()}_${baseName}.webp`;
  } catch (conversionError) {
    console.warn(
      "Failed to convert product image to WebP, uploading original buffer:",
      conversionError.message
    );
  }

  // Convert file buffer to base64
  const base64Image = fileBuffer.toString("base64");

  const result = await imagekit.upload({
    file: base64Image,
    fileName,
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
      category_id: req.query.category_id,
      exact: req.query.exact,
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
    if (productData.price !== undefined && productData.price !== "") {
      productData.price = Number(productData.price);
    } else {
      productData.price = 0;
    }

    // Convert price_xp to number
    if (productData.price_xp !== undefined && productData.price_xp !== "") {
      productData.price_xp = Number(productData.price_xp);
    } else {
      productData.price_xp = 0;
    }

    // Convert is_active to boolean
    if (productData.is_active !== undefined) {
      productData.is_active =
        productData.is_active === "true" || productData.is_active === true;
    }

    // Convert is_unlimited_stock to boolean
    if (productData.is_unlimited_stock !== undefined) {
      productData.is_unlimited_stock =
        productData.is_unlimited_stock === "true" || productData.is_unlimited_stock === true;
    }

    // Convert is_single_redeem to boolean
    if (productData.is_single_redeem !== undefined) {
      productData.is_single_redeem =
        productData.is_single_redeem === "true" || productData.is_single_redeem === true;
    }

    // Convert reward_xp to number (if price_xp > 0, cannot convert to XP)
    if (productData.price_xp > 0) {
      productData.reward_xp = 0;
    } else if (productData.reward_xp !== undefined && productData.reward_xp !== "") {
      productData.reward_xp = Number(productData.reward_xp);
    } else {
      productData.reward_xp = 0;
    }

    // Convert stock to number (default 0 if unlimited stock)
    if (productData.is_unlimited_stock) {
      productData.stock = 0;
    } else if (productData.stock !== undefined && productData.stock !== "") {
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

    const product = await createProduct(finalProductData, req.user?.userId);
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
    if (productData.price !== undefined && productData.price !== "") {
      productData.price = Number(productData.price);
    }

    // Convert price_xp to number if provided
    if (productData.price_xp !== undefined && productData.price_xp !== "") {
      productData.price_xp = Number(productData.price_xp);
      if (productData.price_xp > 0) {
        productData.reward_xp = 0;
      }
    }

    // Convert is_active to boolean if provided
    if (productData.is_active !== undefined) {
      productData.is_active =
        productData.is_active === "true" || productData.is_active === true;
    }

    // Convert is_unlimited_stock to boolean if provided
    if (productData.is_unlimited_stock !== undefined) {
      productData.is_unlimited_stock =
        productData.is_unlimited_stock === "true" || productData.is_unlimited_stock === true;
    }

    // Convert is_single_redeem to boolean if provided
    if (productData.is_single_redeem !== undefined) {
      productData.is_single_redeem =
        productData.is_single_redeem === "true" || productData.is_single_redeem === true;
    }

    // Convert reward_xp to number if provided
    if (productData.reward_xp !== undefined && productData.reward_xp !== "") {
      productData.reward_xp = Number(productData.reward_xp);
    }

    // Convert stock to number if provided
    if (productData.is_unlimited_stock) {
      productData.stock = 0;
    } else if (productData.stock !== undefined && productData.stock !== "") {
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

    const updatedProduct = await updateProduct(productId, finalProductData, req.user?.userId);
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
