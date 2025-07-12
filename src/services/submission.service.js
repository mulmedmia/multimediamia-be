import prisma from "../config/prisma.js";

// Get all submissions with filtering
export const getAllSubmissions = async (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    category_id,
    user_id,
    status,
    is_verified,
  } = filters;
  const skip = (page - 1) * Number(limit);

  const where = {};

  if (category_id) where.category_id = category_id;
  if (user_id) where.user_id = user_id;
  if (status) where.status = status;
  if (is_verified !== undefined) where.is_verified = is_verified === "true";

  const [submissions, totalSubmissions] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { category_name: true, name: true } },
        links: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    submissions,
    meta: {
      total: totalSubmissions,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalSubmissions / Number(limit)),
    },
  };
};

// Get submission by ID
export const getSubmissionById = async (id) => {
  const submission = await prisma.submission.findUnique({
    where: { submission_id: id },
    include: {
      user: { select: { name: true, email: true } },
      category: { select: { category_name: true, name: true } },
      links: true,
    },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  return submission;
};

// Get user's submissions
export const getUserSubmissions = async (userId, filters = {}) => {
  const { page = 1, limit = 10, category_id, status } = filters;
  const skip = (page - 1) * Number(limit);

  const where = { user_id: userId };

  if (category_id) where.category_id = category_id;
  if (status) where.status = status;

  const [submissions, totalSubmissions] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        category: { select: { category_name: true, name: true } },
        links: true,
      },
      orderBy: { created_at: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    submissions,
    meta: {
      total: totalSubmissions,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalSubmissions / Number(limit)),
    },
  };
};

// Create new submission
export const createSubmission = async (submissionData, userId) => {
  const { links, ...submissionFields } = submissionData;

  // Validasi userId
  if (!userId) {
    throw new Error("User ID is required");
  }

  // Add user_id dari JWT
  submissionFields.user_id = userId;

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { category_id: submissionFields.category_id },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  // Check if user already has a submission for this category
  const existingSubmission = await prisma.submission.findFirst({
    where: {
      user_id: userId,
      category_id: submissionFields.category_id,
    },
  });

  if (existingSubmission) {
    throw new Error("User already has a submission for this category");
  }

  // Create submission with links in transaction
  const submission = await prisma.$transaction(async (prisma) => {
    // Create submission
    const newSubmission = await prisma.submission.create({
      data: submissionFields,
    });

    // Create links
    if (links && links.length > 0) {
      await prisma.submissionLink.createMany({
        data: links.map((link) => ({
          submission_id: newSubmission.submission_id,
          ...link,
        })),
      });
    }

    // Return submission with links
    return await prisma.submission.findUnique({
      where: { submission_id: newSubmission.submission_id },
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { category_name: true, name: true } },
        links: true,
      },
    });
  });

  return submission;
};

// Update submission (check ownership)
export const updateSubmission = async (id, submissionData, userId) => {
  const { links, ...submissionFields } = submissionData;

  // Check if submission exists and belongs to user
  const submission = await prisma.submission.findUnique({
    where: { submission_id: id },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  // Check ownership
  if (submission.user_id !== userId) {
    throw new Error("Unauthorized to update this submission");
  }

  // Update submission with links in transaction
  const updatedSubmission = await prisma.$transaction(async (prisma) => {
    // Update submission
    const updated = await prisma.submission.update({
      where: { submission_id: id },
      data: submissionFields,
    });

    // Update links if provided
    if (links !== undefined) {
      // Delete existing links
      await prisma.submissionLink.deleteMany({
        where: { submission_id: id },
      });

      // Create new links
      if (links.length > 0) {
        await prisma.submissionLink.createMany({
          data: links.map((link) => ({
            submission_id: id,
            ...link,
          })),
        });
      }
    }

    // Return updated submission with links
    return await prisma.submission.findUnique({
      where: { submission_id: id },
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { category_name: true, name: true } },
        links: true,
      },
    });
  });

  return updatedSubmission;
};

// Delete submission (check ownership)
export const deleteSubmission = async (id, userId) => {
  const submission = await prisma.submission.findUnique({
    where: { submission_id: id },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  // Check ownership
  if (submission.user_id !== userId) {
    throw new Error("Unauthorized to delete this submission");
  }

  // Delete submission (links akan dihapus otomatis karena cascade)
  await prisma.submission.delete({
    where: { submission_id: id },
  });

  return true;
};

// Update submission status (admin only)
export const updateSubmissionStatus = async (id, statusData) => {
  const submission = await prisma.submission.findUnique({
    where: { submission_id: id },
  });

  if (!submission) {
    throw new Error("Submission not found");
  }

  const updatedSubmission = await prisma.submission.update({
    where: { submission_id: id },
    data: statusData,
    include: {
      user: { select: { name: true, email: true } },
      category: { select: { category_name: true, name: true } },
      links: true,
    },
  });

  return updatedSubmission;
};

// Update submission score and feedback (admin or juri only)
export const updateSubmissionScoreFeedback = async (id, data) => {
  const submission = await prisma.submission.findUnique({
    where: { submission_id: id },
  });
  if (!submission) throw new Error("Submission not found");

  return await prisma.submission.update({
    where: { submission_id: id },
    data: {
      score: data.score,
      feedback: data.feedback,
    },
    include: {
      user: { select: { name: true, email: true } },
      category: { select: { category_name: true, name: true } },
      links: true,
    },
  });
};