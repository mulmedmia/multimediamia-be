import prisma from "../config/prisma.js";

export const getAllBlogs = async (filters = {}) => {
  const { page = 1, limit = 10, category, search, active } = filters;
  const skip = (page - 1) * Number(limit);
  
  const where = {};
  
  if (category) {
    where.category = category;
  }
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  if (active !== undefined) {
    where.is_active = active === 'true';
  }
  
  const [blogs, totalBlogs] = await Promise.all([
    prisma.blog.findMany({
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
        created_at: 'desc',
      },
      skip,
      take: Number(limit),
    }),
    prisma.blog.count({ where }),
  ]);
  
  return {
    blogs,
    meta: {
      total: totalBlogs,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalBlogs / Number(limit)),
    },
  };
};

export const getBlogById = async (id) => {
  const blog = await prisma.blog.findUnique({
    where: { id_blog: id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  
  if (!blog) {
    throw new Error("Blog not found");
  }
  
  return blog;
};

export const createBlog = async (blogData) => {
  const blog = await prisma.blog.create({
    data: {
      ...blogData,
      published_at: blogData.is_active ? new Date() : null,
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
  
  return blog;
};

export const updateBlog = async (id, blogData) => {
  // Check if blog exists
  const blog = await prisma.blog.findUnique({
    where: { id_blog: id },
  });
  
  if (!blog) {
    throw new Error("Blog not found");
  }
  
  // If changing from inactive to active, set published_at
  let updateData = { ...blogData };
  if (blog.is_active === false && blogData.is_active === true) {
    updateData.published_at = new Date();
  }
  
  const updatedBlog = await prisma.blog.update({
    where: { id_blog: id },
    data: updateData,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  
  return updatedBlog;
};

export const deleteBlog = async (id) => {
  // Check if blog exists
  const blog = await prisma.blog.findUnique({
    where: { id_blog: id },
  });
  
  if (!blog) {
    throw new Error("Blog not found");
  }
  
  await prisma.blog.delete({
    where: { id_blog: id },
  });
  
  return true;
};