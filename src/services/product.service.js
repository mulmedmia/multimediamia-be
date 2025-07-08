import prisma from "../config/prisma.js";

// Get all products with filtering
export const getAllProducts = async (filters = {}) => {
  const { page = 1, limit = 10, search, min_price, max_price } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (min_price || max_price) {
    where.price = {};
    if (min_price) where.price.gte = Number(min_price);
    if (max_price) where.price.lte = Number(max_price);
  }

  const [products, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: Number(limit),
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    meta: {
      total: totalProducts,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalProducts / Number(limit)),
    },
  };
};

// Get product by ID
export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { product_id: id },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

// Create new product (admin only)
export const createProduct = async (productData) => {
  const product = await prisma.product.create({
    data: productData,
  });

  return product;
};

// Update existing product (admin only)
export const updateProduct = async (id, productData) => {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { product_id: id },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const updatedProduct = await prisma.product.update({
    where: { product_id: id },
    data: productData,
  });

  return updatedProduct;
};

// Delete product (admin only)
export const deleteProduct = async (id) => {
  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { product_id: id },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  await prisma.product.delete({
    where: { product_id: id },
  });

  return true;
};