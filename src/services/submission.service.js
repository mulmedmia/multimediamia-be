import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, or, like, ilike, and, sql, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { generateCuid } from "../db/cuid.js";

const creatorUser = alias(schema.User, "creatorUser");
const updaterUser = alias(schema.User, "updaterUser");

// Get all submissions with filtering
export const getAllSubmissions = async (filters = {}) => {
  const {
    page = 1,
    limit = 10,
    category_id,
    user_id,
    status,
    is_verified,
    search,
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
    conditions.push(eq(schema.Submission.is_verified, is_verified === "true" || is_verified === true));
  }
  if (search && search.trim() !== "") {
    const searchPattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.User.name, searchPattern),
        ilike(schema.User.email, searchPattern),
        ilike(schema.Submission.project_name, searchPattern),
        ilike(schema.Submission.team_name, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [submissionsList, [countResult]] = await Promise.all([
    db
      .select({ submission_id: schema.Submission.submission_id })
      .from(schema.Submission)
      .leftJoin(schema.User, eq(schema.Submission.user_id, schema.User.users_id))
      .where(whereClause)
      .orderBy(desc(schema.Submission.created_at))
      .limit(Number(limit))
      .offset(skip),
    db
      .select({ count: sql`count(*)` })
      .from(schema.Submission)
      .leftJoin(schema.User, eq(schema.Submission.user_id, schema.User.users_id))
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
    .select({
      Submission: schema.Submission,
      User: schema.User,
      Category: schema.Category,
      SubmissionLink: schema.SubmissionLink,
      creator: { name: creatorUser.name, email: creatorUser.email },
      updater: { name: updaterUser.name, email: updaterUser.email },
    })
    .from(schema.Submission)
    .leftJoin(schema.User, eq(schema.Submission.user_id, schema.User.users_id))
    .leftJoin(schema.Category, eq(schema.Submission.category_id, schema.Category.category_id))
    .leftJoin(schema.SubmissionLink, eq(schema.Submission.submission_id, schema.SubmissionLink.submission_id))
    .leftJoin(creatorUser, eq(schema.Submission.created_by, creatorUser.users_id))
    .leftJoin(updaterUser, eq(schema.Submission.updated_by, updaterUser.users_id))
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
              ...row.Category,
              name: row.Category.name,
              slug: row.Category.slug,
              category_name: row.Category.name,
            }
          : null,
        created_by_name: row.creator?.name || row.Submission.created_by || "-",
        updated_by_name: row.updater?.name || row.Submission.updated_by || "-",
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
    .select({
      Submission: schema.Submission,
      User: schema.User,
      Category: schema.Category,
      SubmissionLink: schema.SubmissionLink,
      creator: { name: creatorUser.name, email: creatorUser.email },
      updater: { name: updaterUser.name, email: updaterUser.email },
    })
    .from(schema.Submission)
    .leftJoin(schema.User, eq(schema.Submission.user_id, schema.User.users_id))
    .leftJoin(schema.Category, eq(schema.Submission.category_id, schema.Category.category_id))
    .leftJoin(schema.SubmissionLink, eq(schema.Submission.submission_id, schema.SubmissionLink.submission_id))
    .leftJoin(creatorUser, eq(schema.Submission.created_by, creatorUser.users_id))
    .leftJoin(updaterUser, eq(schema.Submission.updated_by, updaterUser.users_id))
    .where(eq(schema.Submission.submission_id, id));

  if (details.length === 0) {
    throw new Error("Submission not found");
  }

  const submission = {
    ...details[0].Submission,
    user: details[0].User ? { name: details[0].User.name, email: details[0].User.email } : null,
    category: details[0].Category
      ? {
          ...details[0].Category,
          name: details[0].Category.name,
          slug: details[0].Category.slug,
          category_name: details[0].Category.name,
        }
      : null,
    created_by_name: details[0].creator?.name || details[0].Submission.created_by || "-",
    updated_by_name: details[0].updater?.name || details[0].Submission.updated_by || "-",
    links: [],
  };

  const seenLinkIds = new Set();
  for (const row of details) {
    if (row.SubmissionLink && !seenLinkIds.has(row.SubmissionLink.link_id)) {
      seenLinkIds.add(row.SubmissionLink.link_id);
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
              ...row.Category,
              name: row.Category.name,
              slug: row.Category.slug,
              category_name: row.Category.name,
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

// Validasi aturan link khusus kategori Web In Action (WIA)
const validateWiaLinks = (links = [], category, isFinalPhase = false) => {
  const proposalLink = links.find(
    (l) => l.link_type === "PROPOSAL" && l.url && l.url.trim() !== ""
  );
  const githubLink = links.find(
    (l) => l.link_type === "GITHUB" && l.url && l.url.trim() !== ""
  );
  const deploymentLink = links.find(
    (l) => l.link_type === "DEPLOYMENT" && l.url && l.url.trim() !== ""
  );
  const youtubeLink = links.find(
    (l) => l.link_type === "YOUTUBE" && l.url && l.url.trim() !== ""
  );

  if (!proposalLink) {
    throw new Error("Link draft proposal (Google Docs) wajib diisi untuk kategori Web In Action (WIA).");
  }

  if (!githubLink) {
    throw new Error("Link repository GitHub utama wajib diisi untuk kategori Web In Action (WIA).");
  }

  if (isFinalPhase) {
    if (!deploymentLink) {
      throw new Error("Link deployment / live website wajib diisi pada fase pengumpulan karya final.");
    }
    if (!youtubeLink) {
      throw new Error("Link video demo YouTube wajib diisi pada fase pengumpulan karya final.");
    }
  }
};

// Validasi aturan link khusus kategori UI/UX In Action (UIA)
const validateUiaLinks = (links = [], category, isFinalPhase = false) => {
  const proposalLink = links.find(
    (l) => l.link_type === "PROPOSAL" && l.url && l.url.trim() !== ""
  );
  const figmaLink = links.find(
    (l) => l.link_type === "FIGMA" && l.url && l.url.trim() !== ""
  );
  const figmaPrototypeLink = links.find(
    (l) => l.link_type === "FIGMA_PROTOTYPE" && l.url && l.url.trim() !== ""
  );
  const youtubeLink = links.find(
    (l) => l.link_type === "YOUTUBE" && l.url && l.url.trim() !== ""
  );

  if (!proposalLink) {
    throw new Error("Link draft proposal (Google Docs) wajib diisi untuk kategori UI/UX In Action (UIA).");
  }

  if (!figmaLink) {
    throw new Error("Link desain Figma wajib diisi untuk kategori UI/UX In Action (UIA).");
  }

  if (isFinalPhase) {
    if (!figmaPrototypeLink) {
      throw new Error("Link prototipe Figma wajib diisi pada fase pengumpulan karya final.");
    }
    if (!youtubeLink) {
      throw new Error("Link video demo YouTube wajib diisi pada fase pengumpulan karya final.");
    }
  }
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

  // Validate deadline and submission status
  const now = new Date();
  const preliminaryDeadline = category.preliminary_deadline
    ? new Date(category.preliminary_deadline)
    : (category.deadline ? new Date(category.deadline) : null);
  const finalDeadline = category.final_deadline
    ? new Date(category.final_deadline)
    : preliminaryDeadline;

  if (category.is_submission_open === false) {
    throw new Error("Pengumpulan karya untuk kategori ini sedang ditutup oleh admin.");
  }

  if (finalDeadline && now > finalDeadline) {
    throw new Error("Batas akhir pengumpulan karya final telah berakhir.");
  }

  if (preliminaryDeadline && now > preliminaryDeadline && !category.allow_revision) {
    throw new Error("Batas pengumpulan karya sementara telah berakhir. Menunggu admin membuka fase perbaikan.");
  }

  // Khusus kategori WIA & UIA, validasi field link yang wajib
  if (category.slug?.toUpperCase() === "WIA") {
    const isFinalPhase = Boolean(
      category.allow_revision ||
      (preliminaryDeadline && now > preliminaryDeadline)
    );
    validateWiaLinks(links, category, isFinalPhase);
  } else if (category.slug?.toUpperCase() === "UIA") {
    const isFinalPhase = Boolean(
      category.allow_revision ||
      (preliminaryDeadline && now > preliminaryDeadline)
    );
    validateUiaLinks(links, category, isFinalPhase);
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
      created_by: userId,
      updated_by: userId,
    });

    if (links && links.length > 0) {
      const linkValues = links.map((link) => ({
        link_id: generateCuid(),
        submission_id: newSubId,
        link_type: link.link_type,
        url: link.url,
        description: link.description || null,
        created_by: userId,
        updated_by: userId,
      }));
      await tx.insert(schema.SubmissionLink).values(linkValues);
    }
  });

  return await getSubmissionById(newSubId);
};

// Update submission
export const updateSubmission = async (id, submissionData, userId, userRole = "USER") => {
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

  // Check ownership unless requester is ADMIN or JURI
  if (submission.user_id !== userId && userRole !== "ADMIN" && userRole !== "JURI") {
    throw new Error("Unauthorized to update this submission");
  }

  // When requester is a participant (USER role), validate submission status & deadlines
  if (userRole === "USER") {
    const [category] = await db
      .select()
      .from(schema.Category)
      .where(eq(schema.Category.category_id, submission.category_id))
      .limit(1);

    if (category) {
      const now = new Date();
      const preliminaryDeadline = category.preliminary_deadline
        ? new Date(category.preliminary_deadline)
        : (category.deadline ? new Date(category.deadline) : null);
      const finalDeadline = category.final_deadline
        ? new Date(category.final_deadline)
        : preliminaryDeadline;

      if (category.is_submission_open === false) {
        throw new Error("Pengumpulan karya sedang ditutup oleh admin. Karya tidak dapat diubah.");
      }

      if (finalDeadline && now > finalDeadline) {
        throw new Error("Batas akhir pengumpulan karya final telah berakhir. Karya tidak dapat diubah lagi.");
      }

      if (preliminaryDeadline && now > preliminaryDeadline && !category.allow_revision) {
        throw new Error("Batas pengumpulan karya sementara telah berakhir. Karya tidak dapat diedit sampai admin membuka fase perbaikan.");
      }

      // Khusus kategori WIA & UIA, validasi kelengkapan links jika links diperbarui
      if (links !== undefined) {
        const isFinalPhase = Boolean(
          category.allow_revision ||
          (preliminaryDeadline && now > preliminaryDeadline)
        );
        if (category.slug?.toUpperCase() === "WIA") {
          validateWiaLinks(links, category, isFinalPhase);
        } else if (category.slug?.toUpperCase() === "UIA") {
          validateUiaLinks(links, category, isFinalPhase);
        }
      }
    }
  }

  await db.transaction(async (tx) => {
    // Update submission
    await tx
      .update(schema.Submission)
      .set({
        ...submissionFields,
        updated_by: userId,
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
          created_by: userId,
          updated_by: userId,
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
export const updateSubmissionStatus = async (id, statusData, updatedBy = null) => {
  const [submission] = await db
    .select()
    .from(schema.Submission)
    .where(eq(schema.Submission.submission_id, id))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  const updateFields = {
    ...statusData,
    updated_at: new Date(),
  };
  if (updatedBy) {
    updateFields.updated_by = updatedBy;
  }

  await db
    .update(schema.Submission)
    .set(updateFields)
    .where(eq(schema.Submission.submission_id, id));

  return await getSubmissionById(id);
};

// Update submission score and feedback
export const updateSubmissionScoreFeedback = async (id, data, updatedBy = null) => {
  const [submission] = await db
    .select()
    .from(schema.Submission)
    .where(eq(schema.Submission.submission_id, id))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  if (data.score !== undefined && data.score !== null) {
    const numericScore = Number(data.score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      throw new Error("Score must be between 0 and 100");
    }
  }

  const updateFields = { updated_at: new Date() };
  if (updatedBy) updateFields.updated_by = updatedBy;
  if (data.score !== undefined) {
    updateFields.score = data.score !== null ? Number(data.score) : null;
  }
  if (data.feedback !== undefined) updateFields.feedback = data.feedback;

  await db
    .update(schema.Submission)
    .set(updateFields)
    .where(eq(schema.Submission.submission_id, id));

  return await getSubmissionById(id);
};