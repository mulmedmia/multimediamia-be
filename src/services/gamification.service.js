import prisma from "../config/prisma.js";

// Update user points (Admin/Mentor only)
export const updateUserPoints = async (userId, pointsToAdd) => {
  // Cari user
  const user = await prisma.user.findUnique({
    where: { users_id: userId },
  });
  if (!user) throw new Error("User not found");

  // Ambil points lama, pastikan tipe data sesuai schema (Int/String)
  const currentPoints =
    typeof user.points === "string" ? Number(user.points) : user.points;
  const newPoints = currentPoints + pointsToAdd;

  // Update points
  const updated = await prisma.user.update({
    where: { users_id: userId },
    data: {
      points:
        typeof user.points === "string" ? newPoints.toString() : newPoints,
    },
  });

  return {
    users_id: updated.users_id,
    name: updated.name,
    email: updated.email,
    points: updated.points,
    role: updated.role,
  };
};

// Redeem product with points
export const redeemProduct = async (userId, productId) => {
  // Ambil user dan produk
  const user = await prisma.user.findUnique({ where: { users_id: userId } });
  if (!user) throw new Error("User not found");

  const product = await prisma.product.findUnique({
    where: { product_id: productId },
  });
  if (!product) throw new Error("Product not found");

  if (!product.is_active) throw new Error("Product is not active");
  if (product.stock <= 0) throw new Error("Product is out of stock");

  // Pastikan poin cukup
  if (user.points < product.price) throw new Error("Insufficient points");

  // Kurangi poin user dan stok produk (gunakan transaksi)
  const [updatedUser, updatedProduct, redemption] = await prisma.$transaction([
    prisma.user.update({
      where: { users_id: userId },
      data: { points: user.points - product.price },
    }),
    prisma.product.update({
      where: { product_id: productId },
      data: { stock: product.stock - 1 },
    }),
    prisma.redemption.create({
      data: {
        user_id: userId,
        product_id: productId,
        points_used: product.price,
      },
    }),
  ]);

  return {
    user: {
      users_id: updatedUser.users_id,
      name: updatedUser.name,
      email: updatedUser.email,
      points: updatedUser.points,
    },
    product: {
      product_id: updatedProduct.product_id,
      name: updatedProduct.name,
      stock: updatedProduct.stock,
    },
    redemption_id: redemption.redemption_id,
  };
};

// Get all redemption history (admin only)
export const getAllRedeemUser = async (filters = {}) => {
  const { page = 1, limit = 10, search, user_id, product_id } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {};

  if (user_id) where.user_id = user_id;
  if (product_id) where.product_id = product_id;

  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { product: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [redemptions, total] = await Promise.all([
    prisma.redemption.findMany({
      where,
      include: {
        user: { select: { users_id: true, name: true, email: true } },
        product: { select: { product_id: true, name: true, price: true } },
      },
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.redemption.count({ where }),
  ]);

  return {
    redemptions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};
