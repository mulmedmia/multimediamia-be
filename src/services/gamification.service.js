import prisma from "../config/prisma.js";

// Update user points (Admin/Mentor only)
export const updateUserPoints = async (userId, pointsToAdd) => {
  // Cari user
  const user = await prisma.user.findUnique({
    where: { users_id: userId },
  });
  if (!user) throw new Error("User not found");

  // Ambil points lama, pastikan tipe data sesuai schema (Int/String)
  const currentPoints = typeof user.points === "string" ? Number(user.points) : user.points;
  const newPoints = currentPoints + pointsToAdd;

  // Update points
  const updated = await prisma.user.update({
    where: { users_id: userId },
    data: {
      points: typeof user.points === "string" ? newPoints.toString() : newPoints,
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