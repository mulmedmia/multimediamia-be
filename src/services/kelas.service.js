import prisma from "../config/prisma.js";

// Get all kelas dengan filter berdasarkan peminatan
export const getAllKelas = async (filters = {}) => {
  const { page = 1, limit = 10, peminatan_id, badge } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {};
  
  if (peminatan_id) {
    where.peminatan_id = peminatan_id;
  }

  const [kelasList, totalKelas] = await Promise.all([
    prisma.kelas.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        peminatan: {
          select: {
            nama_peminatan: true,
            imageUrl: true,
          },
        },
        enrollments: {
          include: {
            user: {
              select: {
                name: true,
                nim: true,
                point: true,
                badge: true,
              },
            },
          },
          // Filter berdasarkan badge jika diperlukan
          where: badge ? {
            user: {
              badge: badge,
            },
          } : undefined,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: Number(limit),
    }),
    prisma.kelas.count({ where }),
  ]);

  return {
    kelas: kelasList,
    meta: {
      total: totalKelas,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalKelas / Number(limit)),
    },
  };
};

// Get kelas by ID
export const getKelasById = async (id) => {
  const kelas = await prisma.kelas.findUnique({
    where: { kelas_id: id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      peminatan: {
        select: {
          nama_peminatan: true,
          imageUrl: true,
        },
      },
      enrollments: {
        include: {
          user: {
            select: {
              name: true,
              nim: true,
              point: true,
              badge: true,
            },
          },
        },
      },
    },
  });

  if (!kelas) {
    throw new Error("Kelas not found");
  }

  return kelas;
};

// Create new kelas
export const createKelas = async (kelasData, userId) => {
  // Check if peminatan exists
  const peminatan = await prisma.peminatan.findUnique({
    where: { peminatan_id: kelasData.peminatan_id },
  });

  if (!peminatan) {
    throw new Error("Peminatan not found");
  }

  return await prisma.kelas.create({
    data: {
      ...kelasData,
      user_id: userId,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      peminatan: {
        select: {
          nama_peminatan: true,
          imageUrl: true,
        },
      },
    },
  });
};

// Update kelas
export const updateKelas = async (id, kelasData) => {
  // Check if kelas exists
  const kelas = await prisma.kelas.findUnique({
    where: { kelas_id: id },
  });

  if (!kelas) {
    throw new Error("Kelas not found");
  }

  // If peminatan_id is being updated, check if it exists
  if (kelasData.peminatan_id) {
    const peminatan = await prisma.peminatan.findUnique({
      where: { peminatan_id: kelasData.peminatan_id },
    });

    if (!peminatan) {
      throw new Error("Peminatan not found");
    }
  }

  return await prisma.kelas.update({
    where: { kelas_id: id },
    data: kelasData,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      peminatan: {
        select: {
          nama_peminatan: true,
          imageUrl: true,
        },
      },
    },
  });
};

// Delete kelas
export const deleteKelas = async (id) => {
  // Check if kelas exists
  const kelas = await prisma.kelas.findUnique({
    where: { kelas_id: id },
  });

  if (!kelas) {
    throw new Error("Kelas not found");
  }

  // Check if kelas has enrollments
  const enrollments = await prisma.userKelas.findMany({
    where: { kelas_id: id },
  });

  if (enrollments.length > 0) {
    throw new Error("Cannot delete kelas with existing enrollments");
  }

  await prisma.kelas.delete({
    where: { kelas_id: id },
  });

  return true;
};

// Get murid dalam kelas berdasarkan peminatan dan badge
export const getMuridByKelas = async (kelasId, filters = {}) => {
  const { badge } = filters;
  
  const where = {
    kelas_id: kelasId,
  };
  
  if (badge) {
    where.user = {
      badge: badge,
    };
  }

  return await prisma.userKelas.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          nim: true,
          email: true,
          point: true,
          badge: true,
        },
      },
      kelas: {
        include: {
          peminatan: {
            select: {
              nama_peminatan: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        user: {
          point: 'desc', // Sort by point descending
        },
      },
      {
        user: {
          name: 'asc',
        },
      },
    ],
  });
};

// Enroll user ke kelas - FIX BUG DI SINI
export const enrollUserToKelas = async (userId, kelasId) => {
  // Check if already enrolled - PERBAIKAN: Gunakan findFirst dengan composite condition
  const existingEnrollment = await prisma.userKelas.findFirst({
    where: {
      user_id: userId,
      kelas_id: kelasId,
    },
  });

  if (existingEnrollment) {
    throw new Error("User already enrolled in this class");
  }

  // Check if kelas exists
  const kelas = await prisma.kelas.findUnique({
    where: { kelas_id: kelasId },
  });

  if (!kelas) {
    throw new Error("Kelas not found");
  }

  return await prisma.userKelas.create({
    data: {
      user_id: userId,
      kelas_id: kelasId,
    },
    include: {
      user: {
        select: {
          name: true,
          nim: true,
          point: true,
          badge: true,
        },
      },
      kelas: {
        include: {
          peminatan: true,
        },
      },
    },
  });
};

// Unenroll user dari kelas
export const unenrollUserFromKelas = async (userId, kelasId) => {
  const enrollment = await prisma.userKelas.findFirst({
    where: {
      user_id: userId,
      kelas_id: kelasId,
    },
  });

  if (!enrollment) {
    throw new Error("User is not enrolled in this class");
  }

  await prisma.userKelas.delete({
    where: {
      id: enrollment.id,
    },
  });

  return true;
};