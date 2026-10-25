import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema.js";
import {
  createSubmission,
  getSubmissionById,
  getAllSubmissions,
  getUserSubmissions,
  updateSubmission,
  deleteSubmission,
} from "../src/services/submission.service.js";
import { deleteRegistration } from "../src/services/registration.service.js";
import { generateCuid } from "../src/db/cuid.js";
import { eq } from "drizzle-orm";

describe("Submission Registration Refactor Integration Suite", () => {
  const testUserId = generateCuid();
  const otherUserId = generateCuid();
  const testCatId = generateCuid();
  const testRegId = generateCuid();
  let createdSubId = null;

  test("1. Schema columns verification", () => {
    const submissionColumns = Object.keys(schema.Submission);
    assert.equal(submissionColumns.includes("registration_id"), true);
    assert.equal(submissionColumns.includes("thumbnail_url"), true);
    assert.equal(submissionColumns.includes("user_id"), false);
    assert.equal(submissionColumns.includes("category_id"), false);
    assert.equal(submissionColumns.includes("team_name"), false);
  });

  test("2. Setup mock Category, User, and Registration", async () => {
    await db.insert(schema.User).values([
      {
        users_id: testUserId,
        name: "Test Participant",
        email: `test_part_${Date.now()}@example.com`,
        password: "hashedpassword123",
        role: "USER",
        is_verified: true,
      },
      {
        users_id: otherUserId,
        name: "Other Participant",
        email: `other_part_${Date.now()}@example.com`,
        password: "hashedpassword123",
        role: "USER",
        is_verified: true,
      },
    ]);

    await db.insert(schema.Category).values({
      category_id: testCatId,
      user_id: testUserId,
      name: "App Development",
      category_name: "App Development",
      slug: "APP",
      image: "https://example.com/banner.jpg",
      status: "VERIFIED",
      organizer: "MIA 2026",
      title: "App Dev 2026",
      description: "Lomba aplikasi",
      team_type: "GROUP",
      is_submission_open: true,
      deadline: new Date(Date.now() + 86400000),
    });

    await db.insert(schema.Registration).values({
      registration_id: testRegId,
      user_id: testUserId,
      category_id: testCatId,
      file_url: "https://drive.google.com/test",
      team_name: "Tim Garuda Sakti",
      is_verified: true,
    });
  });

  test("3. Reject submission if registration_id is missing", async () => {
    await assert.rejects(
      async () => {
        await createSubmission(
          {
            project_name: "My App",
            description: "Deskripsi aplikasi yang lebih dari 10 karakter",
            flow_application: "Flow aplikasi lengkap dan jelas",
            links: [{ link_type: "OTHER", url: "https://example.com" }],
          },
          testUserId
        );
      },
      { message: "Registration ID is required" }
    );
  });

  test("4. Reject submission if registration belongs to another user", async () => {
    await assert.rejects(
      async () => {
        await createSubmission(
          {
            registration_id: testRegId,
            project_name: "My App",
            description: "Deskripsi aplikasi yang lebih dari 10 karakter",
            flow_application: "Flow aplikasi lengkap dan jelas",
            links: [{ link_type: "OTHER", url: "https://example.com" }],
          },
          otherUserId
        );
      },
      { message: "Unauthorized: Registration does not belong to user" }
    );
  });

  test("5. Create valid submission with registration_id and verify resolved fields", async () => {
    const created = await createSubmission(
      {
        registration_id: testRegId,
        project_name: "Garuda App",
        description: "Deskripsi project Garuda App lebih dari 10 karakter",
        flow_application: "Flow aplikasi Garuda lengkap dan detail",
        links: [{ link_type: "OTHER", url: "https://garuda.app" }],
      },
      testUserId
    );

    assert.ok(created.submission_id);
    createdSubId = created.submission_id;
    assert.equal(created.registration_id, testRegId);
    assert.equal(created.team_name, "Tim Garuda Sakti");
    assert.equal(created.category_id, testCatId);
    assert.equal(created.user_id, testUserId);
    assert.equal(created.user?.name, "Test Participant");
    assert.equal(created.category?.name, "App Development");
  });

  test("6. Reject duplicate submission on same registration", async () => {
    await assert.rejects(
      async () => {
        await createSubmission(
          {
            registration_id: testRegId,
            project_name: "Garuda App 2",
            description: "Deskripsi kedua project Garuda App",
            flow_application: "Flow aplikasi Garuda lengkap",
            links: [{ link_type: "OTHER", url: "https://garuda2.app" }],
          },
          testUserId
        );
      },
      { message: "User already has a submission for this category" }
    );
  });

  test("7. getSubmissionById resolves team_name and category_id", async () => {
    const fetched = await getSubmissionById(createdSubId, { isInternal: true });
    assert.equal(fetched.team_name, "Tim Garuda Sakti");
    assert.equal(fetched.category_id, testCatId);
    assert.equal(fetched.links.length, 1);
  });

  test("8. getUserSubmissions retrieves submission via registration join", async () => {
    const userSubs = await getUserSubmissions(testUserId);
    assert.equal(userSubs.submissions.length, 1);
    assert.equal(userSubs.submissions[0].team_name, "Tim Garuda Sakti");
  });

  test("9. getAllSubmissions with search by team_name", async () => {
    const searchResult = await getAllSubmissions({ search: "Garuda Sakti", isStaff: true });
    assert.ok(searchResult.submissions.some((s) => s.submission_id === createdSubId));
  });

  test("10. updateSubmission updates project_name without requiring team_name", async () => {
    const updated = await updateSubmission(
      createdSubId,
      { project_name: "Garuda App V2" },
      testUserId,
      "USER"
    );
    assert.equal(updated.project_name, "Garuda App V2");
  });

  test("11. deleteRegistration cleans up associated submission", async () => {
    await deleteRegistration(testRegId, testUserId);
    const [subAfterDelete] = await db
      .select()
      .from(schema.Submission)
      .where(eq(schema.Submission.submission_id, createdSubId));
    assert.equal(subAfterDelete, undefined);

    // Final cleanup of users and category
    await db.delete(schema.Category).where(eq(schema.Category.category_id, testCatId));
    await db.delete(schema.User).where(eq(schema.User.users_id, testUserId));
    await db.delete(schema.User).where(eq(schema.User.users_id, otherUserId));
  });
});
