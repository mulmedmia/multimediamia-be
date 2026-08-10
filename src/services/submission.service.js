import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, and, sql, desc, inArray } from "drizzle-orm";
import { generateCuid } from "../db/cuid.js";

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

  const conditions = [];

  if (category_id) {
    conditions.push(eq(schema.Submission.category_id, category_id));
  }
  if (user_id) {
    conditions.push(eq(schema.Submission.user_id, user_id));
  }
  if (status) {
    conditions.push(eq(schema.Submission.status, status));
  }
  if (is_verified !== undefined) {
    conditions.push(eq(schema.Submission.is_verified, is_verified === "true"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [submissionsList, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.Submission)
      .where(whereClause)
      .orderBy(desc(schema.Submission.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Submission)
      .where(whereClause),
  ]);

  const total = Number(countResult?.count || 0);

  if (submissionsList.length === 0) {
    return {
      submissions: [],
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  const submissionIds = submissionsList.map((s) => s.submission_id);

  const details = await db
    .select()
    .from(schema.Submission)
    .leftJoin(schema.User, eq(schema.Submission.user_id, schema.User.users_id))
    .leftJoin(schema.Category, eq(schema.Submission.category_id, schema.Category.category_id))
    .leftJoin(schema.SubmissionLink, eq(schema.Submission.submission_id, schema.SubmissionLink.submission_id))
    .where(inArray(schema.Submission.submission_id, submissionIds));

  const submissionMap = {};
  for (const row of details) {
    const subId = row.Submission.submission_id;
    if (!submissionMap[subId]) {
      submissionMap[subId] = {
        ...row.Submission,
        user: row.User ? { name: row.User.name, email: row.User.email } : null,
        category: row.Category
          ? {
              category_name: row.Category.category_name,
              name: row.Category.name,
            }
          : null,
        links: [],
      };
    }
    if (row.SubmissionLink) {
      submissionMap[subId].links.push(row.SubmissionLink);
    }
  }

  const submissions = submissionsList.map((s) => submissionMap[s.submission_id]).filter(Boolean);

  return {
    submissions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Get submission by ID
export const getSubmissionById = async (id) => {
  const details = await db
    .select()
    .from(schema.Submission)
    .leftJoin(schema.User, eq(schema.Submission.user_id, schema.User.users_id))
    .leftJoin(schema.Category, eq(schema.Submission.category_id, schema.Category.category_id))
    .leftJoin(schema.SubmissionLink, eq(schema.Submission.submission_id, schema.SubmissionLink.submission_id))
    .where(eq(schema.Submission.submission_id, id));

  if (details.length === 0) {
    throw new Error("Submission not found");
  }

  const submission = {
    ...details[0].Submission,
    user: details[0].User ? { name: details[0].User.name, email: details[0].User.email } : null,
    category: details[0].Category
      ? {
          category_name: details[0].Category.category_name,
          name: details[0].Category.name,
        }
      : null,
    links: [],
  };

  for (const row of details) {
    if (row.SubmissionLink) {
      submission.links.push(row.SubmissionLink);
    }
  }

  return submission;
};

// Get user's submissions
export const getUserSubmissions = async (userId, filters = {}) => {
  const { page = 1, limit = 10, category_id, status } = filters;
  const skip = (page - 1) * Number(limit);

  const conditions = [eq(schema.Submission.user_id, userId)];

  if (category_id) {
    conditions.push(eq(schema.Submission.category_id, category_id));
  }
  if (status) {
    conditions.push(eq(schema.Submission.status, status));
  }

  const whereClause = and(...conditions);

  const [submissionsList, [countResult]] = await Promise.all([
    db
      .select()
      .from(schema.Submission)
      .where(whereClause)
      .orderBy(desc(schema.Submission.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Submission)
      .where(whereClause),
  ]);

  const total = Number(countResult?.count || 0);

  if (submissionsList.length === 0) {
    return {
      submissions: [],
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  const submissionIds = submissionsList.map((s) => s.submission_id);

  const details = await db
    .select()
    .from(schema.Submission)
    .leftJoin(schema.Category, eq(schema.Submission.category_id, schema.Category.category_id))
    .leftJoin(schema.SubmissionLink, eq(schema.Submission.submission_id, schema.SubmissionLink.submission_id))
    .where(inArray(schema.Submission.submission_id, submissionIds));

  const submissionMap = {};
  for (const row of details) {
    const subId = row.Submission.submission_id;
    if (!submissionMap[subId]) {
      submissionMap[subId] = {
        ...row.Submission,
        category: row.Category
          ? {
              category_name: row.Category.category_name,
              name: row.Category.name,
            }
          : null,
        links: [],
      };
    }
    if (row.SubmissionLink) {
      submissionMap[subId].links.push(row.SubmissionLink);
    }
  }

  const submissions = submissionsList.map((s) => submissionMap[s.submission_id]).filter(Boolean);

  return {
    submissions,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Create new submission
export const createSubmission = async (submissionData, userId) => {
  const { links, ...submissionFields } = submissionData;

  if (!userId) {
    throw new Error("User ID is required");
  }

  // Check if category exists
  const [category] = await db
    .select()
    .from(schema.Category)
    .where(eq(schema.Category.category_id, submissionFields.category_id))
    .limit(1);

  if (!category) {
    throw new Error("Category not found");
  }

  // Check if user already has a submission for this category
  const [existingSubmission] = await db
    .select()
    .from(schema.Submission)
    .where(
      and(
        eq(schema.Submission.user_id, userId),
        eq(schema.Submission.category_id, submissionFields.category_id)
      )
    )
    .limit(1);

  if (existingSubmission) {
    throw new Error("User already has a submission for this category");
  }

  const newSubId = generateCuid();

  // Create submission with links in transaction
  await db.transaction(async (tx) => {
    await tx.insert(schema.Submission).values({
      submission_id: newSubId,
      user_id: userId,
      category_id: submissionFields.category_id,
      team_name: submissionFields.team_name,
      project_name: submissionFields.project_name,
      description: submissionFields.description,
      flow_application: submissionFields.flow_application,
      status: "PENDING",
      is_verified: false,
    });

    if (links && links.length > 0) {
      const linkValues = links.map((link) => ({
        link_id: generateCuid(),
        submission_id: newSubId,
        link_type: link.link_type,
        url: link.url,
        description: link.description || null,
      }));
      await tx.insert(schema.SubmissionLink).values(linkValues);
    }
  });

  return await getSubmissionById(newSubId);
};

// Update submission
export const updateSubmission = async (id, submissionData, userId) => {
  const { links, ...submissionFields } = submissionData;

  // Check if submission exists
  const [submission] = await db
    .select()
    .from(schema.Submission)
    .where(eq(schema.Submission.submission_id, id))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  // Check ownership
  if (submission.user_id !== userId) {
    throw new Error("Unauthorized to update this submission");
  }

  await db.transaction(async (tx) => {
    // Update submission
    await tx
      .update(schema.Submission)
      .set({
        ...submissionFields,
        updated_at: new Date(),
      })
      .where(eq(schema.Submission.submission_id, id));

    // Update links if provided
    if (links !== undefined) {
      // Delete existing links
      await tx.delete(schema.SubmissionLink).where(eq(schema.SubmissionLink.submission_id, id));

      // Create new links
      if (links.length > 0) {
        const linkValues = links.map((link) => ({
          link_id: generateCuid(),
          submission_id: id,
          link_type: link.link_type,
          url: link.url,
          description: link.description || null,
        }));
        await tx.insert(schema.SubmissionLink).values(linkValues);
      }
    }
  });

  return await getSubmissionById(id);
};

// Delete submission
export const deleteSubmission = async (id, userId) => {
  const [submission] = await db
    .select()
    .from(schema.Submission)
    .where(eq(schema.Submission.submission_id, id))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  // Check ownership
  if (submission.user_id !== userId) {
    throw new Error("Unauthorized to delete this submission");
  }

  // Delete submission (links cascade on DB level)
  await db.delete(schema.Submission).where(eq(schema.Submission.submission_id, id));

  return true;
};

// Update submission status (admin only)
export const updateSubmissionStatus = async (id, statusData) => {
  const [submission] = await db
    .select()
    .from(schema.Submission)
    .where(eq(schema.Submission.submission_id, id))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  await db
    .update(schema.Submission)
    .set({
      ...statusData,
      updated_at: new Date(),
    })
    .where(eq(schema.Submission.submission_id, id));

  return await getSubmissionById(id);
};

// Update submission score and feedback
export const updateSubmissionScoreFeedback = async (id, data) => {
  const [submission] = await db
    .select()
    .from(schema.Submission)
    .where(eq(schema.Submission.submission_id, id))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  const updateFields = { updated_at: new Date() };
  if (data.score !== undefined) updateFields.score = Number(data.score);
  if (data.feedback !== undefined) updateFields.feedback = data.feedback;

  await db
    .update(schema.Submission)
    .set(updateFields)
    .where(eq(schema.Submission.submission_id, id));

  return await getSubmissionById(id);
};