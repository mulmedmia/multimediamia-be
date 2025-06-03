import prisma from "../config/prisma.js";

// Update user points and badge (Admin/Mentor only)
export const updateUserPointsAndBadge = async (userId, data) => {
  const { points, badge } = data;
  
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { users_id: userId },
    select: { users_id: true, name: true, email: true }
  });
  
  if (!user) {
    throw new Error("User not found");
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { users_id: userId },
    data: {
      ...(points !== undefined && { point: points.toString() }),
      ...(badge && { badge }),
      updated_at: new Date()
    },
    select: {
      users_id: true,
      name: true,
      email: true,
      point: true,
      badge: true,
      updated_at: true
    }
  });

  return updatedUser;
};

// Get leaderboard
export const getUserLeaderboard = async (filters = {}) => {
  const { limit = 10, page = 1 } = filters;
  const skip = (page - 1) * limit;

  const users = await prisma.user.findMany({
    select: {
      users_id: true,
      name: true,
      point: true,
      badge: true,
      created_at: true
    },
    orderBy: [
      {
        point: 'desc'
      },
      {
        name: 'asc'
      }
    ],
    take: limit,
    skip: skip,
    where: {
      point: {
        not: null
      }
    }
  });

  const totalUsers = await prisma.user.count({
    where: {
      point: {
        not: null
      }
    }
  });

  return {
    data: users.map((user, index) => ({
      ...user,
      rank: skip + index + 1,
      point: user.point ? parseInt(user.point) : 0
    })),
    pagination: {
      page,
      limit,
      total: totalUsers,
      totalPages: Math.ceil(totalUsers / limit)
    }
  };
};

// Get user statistics
export const getUserStats = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { users_id: userId },
    select: {
      users_id: true,
      name: true,
      nim: true,
      email: true,
      point: true,
      badge: true,
      created_at: true,
      registrations: {
        select: {
          registration_id: true,
          is_verified: true,
          created_at: true,
          category: {
            select: {
              name: true,
              team_type: true
            }
          }
        }
      },
      blogs: {
        select: {
          id_blog: true,
          title: true,
          is_active: true,
          created_at: true
        }
      }
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Calculate statistics
  const stats = {
    user: {
      users_id: user.users_id,
      name: user.name,
      nim: user.nim,
      email: user.email,
      point: user.point ? parseInt(user.point) : 0,
      badge: user.badge,
      joined_at: user.created_at
    },
    statistics: {
      total_registrations: user.registrations.length,
      verified_registrations: user.registrations.filter(r => r.is_verified).length,
      total_blogs: user.blogs.length,
      active_blogs: user.blogs.filter(b => b.is_active).length
    },
    recent_activities: {
      registrations: user.registrations.slice(-5).map(r => ({
        id: r.registration_id,
        category: r.category.name,
        team_type: r.category.team_type,
        is_verified: r.is_verified,
        created_at: r.created_at
      })),
      blogs: user.blogs.slice(-5).map(b => ({
        id: b.id_blog,
        title: b.title,
        is_active: b.is_active,
        created_at: b.created_at
      }))
    }
  };

  return stats;
};

// Update user profile (name, nim)
export const updateUserProfile = async (userId, profileData) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { users_id: userId },
    select: { users_id: true }
  });
  
  if (!user) {
    throw new Error("User not found");
  }

  // If nim is being updated, check if it's already taken by another user
  if (profileData.nim) {
    const existingUser = await prisma.user.findFirst({
      where: {
        nim: profileData.nim,
        users_id: {
          not: userId
        }
      }
    });
    
    if (existingUser) {
      throw new Error("NIM already taken by another user");
    }
  }

  // Update user profile
  const updatedUser = await prisma.user.update({
    where: { users_id: userId },
    data: {
      ...profileData,
      updated_at: new Date()
    },
    select: {
      users_id: true,
      name: true,
      nim: true,
      email: true,
      point: true,
      badge: true,
      role: true,
      created_at: true,
      updated_at: true
    }
  });

  return updatedUser;
};