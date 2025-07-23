import prisma from "../config/prisma.js";

// Get all registrations with filtering
export const getAllRegistrations = async (filters = {}) => {
  const { page = 1, limit = 10, category_id, user_id, is_verified } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {};
  
  if (category_id) {
    where.category_id = category_id;
  }
  
  if (user_id) {
    where.user_id = user_id;
  }
  
  if (is_verified !== undefined) {
    where.is_verified = is_verified === 'true';
  }

  const [registrations, totalRegistrations] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            category_name: true,
            team_type: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: Number(limit),
    }),
    prisma.registration.count({ where }),
  ]);

  return {
    registrations,
    meta: {
      total: totalRegistrations,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalRegistrations / Number(limit)),
    },
  };
};

// Get registration by ID
export const getRegistrationById = async (id) => {
  const registration = await prisma.registration.findUnique({
    where: { registration_id: id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          category_name: true,
          team_type: true,
          name: true,
        },
      },
    },
  });

  if (!registration) {
    throw new Error("Registration not found");
  }

  return registration;
};

// Create new registration
export const createRegistration = async (registrationData) => {
  // Get the category to check team_type
  const category = await prisma.category.findUnique({
    where: { category_id: registrationData.category_id },
    select: { team_type: true },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Check if user already registered for this category
  const existingRegistration = await prisma.registration.findFirst({
    where: {
      user_id: registrationData.user_id,
      category_id: registrationData.category_id,
    },
  });

  if (existingRegistration) {
    throw new Error("User already registered for this category");
  }

  // Validate based on team_type
  if (category.team_type === "GROUP" && !registrationData.team_name) {
    throw new Error("Team name is required for group registrations");
  }

  const registration = await prisma.registration.create({
    data: registrationData,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          category_name: true,
          team_type: true,
          name: true,
        },
      },
    },
  });

  return registration;
};

// Update registration
export const updateRegistration = async (id, registrationData) => {
  // Check if registration exists
  const registration = await prisma.registration.findUnique({
    where: { registration_id: id },
    include: {
      category: {
        select: { team_type: true },
      },
    },
  });

  if (!registration) {
    throw new Error("Registration not found");
  }

  // If this is a GROUP registration and team name is being set to null, reject
  if (
    registration.category.team_type === "GROUP" && 
    registrationData.team_name === null
  ) {
    throw new Error("Team name is required for group registrations");
  }

   const updatedRegistration = await prisma.registration.update({
    where: { registration_id: id },
    data: registrationData,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      category: {
        select: {
          category_name: true,
          team_type: true,
          name: true,
        },
      },
    },
  });
  return updatedRegistration;
};

// Delete registration
export const deleteRegistration = async (id) => {
  // Check if registration exists
  const registration = await prisma.registration.findUnique({
    where: { registration_id: id },
  });

  if (!registration) {
    throw new Error("Registration not found");
  }

  await prisma.registration.delete({
    where: { registration_id: id },
  });

  return true;
};