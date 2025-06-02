import prisma from "../config/prisma.js";

// Get all peminatan
export const getAllPeminatan = async () => {
  return await prisma.peminatan.findMany({
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { created_at: "desc" },
  });
};

// Get peminatan by ID
export const getPeminatanById = async (id) => {
  const peminatan = await prisma.peminatan.findUnique({
    where: { peminatan_id: id },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });
  if (!peminatan) throw new Error("Peminatan not found");
  return peminatan;
};

// Create peminatan
export const createPeminatan = async (data) => {
  return await prisma.peminatan.create({
    data,
    include: {
      user: { select: { name: true, email: true } },
    },
  });
};

// Update peminatan
export const updatePeminatan = async (id, data) => {
  const exist = await prisma.peminatan.findUnique({ where: { peminatan_id: id } });
  if (!exist) throw new Error("Peminatan not found");
  return await prisma.peminatan.update({
    where: { peminatan_id: id },
    data,
    include: {
      user: { select: { name: true, email: true } },
    },
  });
};

// Delete peminatan
export const deletePeminatan = async (id) => {
  const exist = await prisma.peminatan.findUnique({ where: { peminatan_id: id } });
  if (!exist) throw new Error("Peminatan not found");
  await prisma.peminatan.delete({ where: { peminatan_id: id } });
  return true;
};