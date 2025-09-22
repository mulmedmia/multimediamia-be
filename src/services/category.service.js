import prisma from "../config/prisma.js";

// Get all categories with optional filtering
export const getAllCategories = async (filters = {}) => {
  const { page = 1, limit = 10, search, status } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {};

  if (search) {
    where.OR = [
      { category_name: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const [categories, totalCategories] = await Promise.all([
    prisma.category.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: Number(limit),
    }),
    prisma.category.count({ where }),
  ]);

  return {
    categories,
    meta: {
      total: totalCategories,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCategories / Number(limit)),
    },
  };
};

// Get category by ID
export const getCategoryById = async (id) => {
  const category = await prisma.category.findUnique({
    where: { category_id: id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
};

// Create new category (admin only)
export const createCategory = async (categoryData, userId) => {
  const category = await prisma.category.create({
    data: {
      ...categoryData,
      user_id: userId,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return category;
};

// Update existing category (admin only)
export const updateCategory = async (id, categoryData) => {
  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { category_id: id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  const updatedCategory = await prisma.category.update({
    where: { category_id: id },
    data: categoryData,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return updatedCategory;
};

// Delete category (admin only)
/**
 * Deletes a category and all associated registrations and submissions.
 * @param {string} id - The category ID to delete.
 * @returns {Promise<boolean>} - Returns true if deletion is successful.
 * @throws {Error} - Throws error if category not found.
 */
export const deleteCategory = async (id) => {
  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { category_id: id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Delete associated registrations and submissions first
  await prisma.registration.deleteMany({
    where: { category_id: id },
  });

  await prisma.submission.deleteMany({
    where: { category_id: id },
  });

  // Now delete the category
  await prisma.category.delete({
    where: { category_id: id },
  });

  return true;
};
