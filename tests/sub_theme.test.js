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
} from "../src/services/submission.service.js";
import { deleteRegistration } from "../src/services/registration.service.js";
import { generateCuid } from "../src/db/cuid.js";
import { eq } from "drizzle-orm";

describe("Sub-Theme Feature Integration Tests", () => {
  const testUserIdUIA = generateCuid();
  const testUserIdWIA = generateCuid();
  const testCatIdUIA = generateCuid();
  const testCatIdWIA = generateCuid();
  const testRegIdUIA = generateCuid();
  const testRegIdWIA = generateCuid();

  let createdSubIdUIA = null;
  let createdSubIdWIA = null;

  test("1. Verify sub_theme column exists in schema", () => {
    const submissionColumns = Object.keys(schema.Submission);
    assert.equal(
      submissionColumns.includes("sub_theme"),
      true,
      "Column sub_theme must exist on Submission table"
    );
  });

  test("2. Setup Mock Users, Categories (UIA & WIA), and Registrations", async () => {
    // Insert Mock Users
    await db.insert(schema.User).values([
      {
        users_id: testUserIdUIA,
        name: "Peserta UIA Tester",
        email: `uia_tester_${Date.now()}@test.com`,
        password: "hashedpassword123",
        role: "USER",
        is_verified: true,
      },
      {
        users_id: testUserIdWIA,
        name: "Peserta WIA Tester",
        email: `wia_tester_${Date.now()}@test.com`,
        password: "hashedpassword123",
        role: "USER",
        is_verified: true,
      },
    ]);

    // Insert Mock UIA Category
    await db.insert(schema.Category).values([
      {
        category_id: testCatIdUIA,
        user_id: testUserIdUIA,
        name: "UI/UX In Action",
        slug: "UIA",
        image: "https://example.com/uia.jpg",
        status: "VERIFIED",
        organizer: "MIA 2026",
        description: "Lomba UI/UX In Action 2026",
        team_type: "GROUP",
        is_submission_open: true,
        deadline: new Date(Date.now() + 86400000),
      },
      {
        category_id: testCatIdWIA,
        user_id: testUserIdWIA,
        name: "Web In Action",
        slug: "WIA",
        image: "https://example.com/wia.jpg",
        status: "VERIFIED",
        organizer: "MIA 2026",
        description: "Lomba Web In Action 2026",
        team_type: "GROUP",
        is_submission_open: true,
        deadline: new Date(Date.now() + 86400000),
      },
    ]);

    // Insert Registrations
    await db.insert(schema.Registration).values([
      {
        registration_id: testRegIdUIA,
        user_id: testUserIdUIA,
        category_id: testCatIdUIA,
        file_url: "https://drive.google.com/test-uia",
        team_name: "Tim Kreatif UI/UX",
        is_verified: true,
      },
      {
        registration_id: testRegIdWIA,
        user_id: testUserIdWIA,
        category_id: testCatIdWIA,
        file_url: "https://drive.google.com/test-wia",
        team_name: "Tim Canggih Web",
        is_verified: true,
      },
    ]);
  });

  test("3. Reject UIA submission if sub_theme is missing", async () => {
    await assert.rejects(
      async () => {
        await createSubmission(
          {
            registration_id: testRegIdUIA,
            project_name: "Aplikasi Tanpa Subtema",
            description: "Deskripsi project lebih dari 10 karakter untuk testing",
            flow_application: "Alur aplikasi testing lengkap",
            thumbnail_url: "https://ik.imagekit.io/mia2026/thumb.webp",
            // sub_theme omitted
            links: [
              { link_type: "PROPOSAL", url: "https://docs.google.com/proposal" },
              { link_type: "FIGMA", url: "https://figma.com/design/test" },
            ],
          },
          testUserIdUIA
        );
      },
      { message: "Sub-tema wajib dipilih untuk kategori UI/UX In Action (UIA)." }
    );
  });

  test("4. Successfully create UIA submission with valid sub_theme (Smart Mobility)", async () => {
    const created = await createSubmission(
      {
        registration_id: testRegIdUIA,
        project_name: "SmartRide - Solusi Mobilitas Cerdas",
        description: "Perancangan UI/UX aplikasi navigasi transportasi publik terintegrasi",
        flow_application: "1. Login 2. Pilih rute transit 3. Pesan tiket multimodal",
        sub_theme: "Smart Mobility",
        thumbnail_url: "https://ik.imagekit.io/mia2026/smartride.webp",
        links: [
          { link_type: "PROPOSAL", url: "https://docs.google.com/proposal" },
          { link_type: "FIGMA", url: "https://figma.com/design/test" },
        ],
      },
      testUserIdUIA
    );

    assert.ok(created.submission_id);
    createdSubIdUIA = created.submission_id;
    assert.equal(created.sub_theme, "Smart Mobility");
    assert.equal(created.project_name, "SmartRide - Solusi Mobilitas Cerdas");
    assert.equal(created.team_name, "Tim Kreatif UI/UX");
  });

  test("5. Verify getSubmissionById returns sub_theme", async () => {
    const sub = await getSubmissionById(createdSubIdUIA, { isInternal: true });
    assert.equal(sub.sub_theme, "Smart Mobility");
  });

  test("6. Verify getUserSubmissions returns sub_theme for participant", async () => {
    const res = await getUserSubmissions(testUserIdUIA);
    assert.equal(res.submissions.length, 1);
    assert.equal(res.submissions[0].sub_theme, "Smart Mobility");
  });

  test("7. Participant can edit/update sub_theme (e.g. from Smart Mobility to Accessible Technology)", async () => {
    const updated = await updateSubmission(
      createdSubIdUIA,
      {
        sub_theme: "Accessible Technology",
        project_name: "SmartRide Access - Inovasi Aksesibilitas",
      },
      testUserIdUIA,
      "USER"
    );

    assert.equal(updated.sub_theme, "Accessible Technology");
    assert.equal(updated.project_name, "SmartRide Access - Inovasi Aksesibilitas");

    // Double check via getSubmissionById
    const reFetched = await getSubmissionById(createdSubIdUIA, { isInternal: true });
    assert.equal(reFetched.sub_theme, "Accessible Technology");
  });

  test("8. Reject WIA submission if sub_theme is missing", async () => {
    await assert.rejects(
      async () => {
        await createSubmission(
          {
            registration_id: testRegIdWIA,
            project_name: "Portal Tanpa Subtema",
            description: "Deskripsi web development lebih dari 10 karakter",
            flow_application: "Alur sistem portal web",
            thumbnail_url: "https://ik.imagekit.io/mia2026/wia.webp",
            // sub_theme omitted
            links: [
              { link_type: "PRESENTATION", url: "https://canva.com/slides" },
              { link_type: "GITHUB", url: "https://github.com/test/repo" },
            ],
          },
          testUserIdWIA
        );
      },
      { message: "Sub-tema wajib dipilih untuk kategori Web In Action (WIA)." }
    );
  });

  test("9. Successfully create WIA submission with valid sub_theme (Open Government Data)", async () => {
    const created = await createSubmission(
      {
        registration_id: testRegIdWIA,
        project_name: "SatuData Transparan Daerah",
        description: "Website visualisasi real-time data anggaran dan kinerja proyek daerah",
        flow_application: "1. Buka dashboard publik 2. Filter statistik 3. Ekspor insight",
        sub_theme: "Open Government Data",
        thumbnail_url: "https://ik.imagekit.io/mia2026/satudata.webp",
        links: [
          { link_type: "PRESENTATION", url: "https://canva.com/slides" },
          { link_type: "GITHUB", url: "https://github.com/test/repo" },
        ],
      },
      testUserIdWIA
    );

    assert.ok(created.submission_id);
    createdSubIdWIA = created.submission_id;
    assert.equal(created.sub_theme, "Open Government Data");
    assert.equal(created.team_name, "Tim Canggih Web");
  });

  test("10. Verify getAllSubmissions returns sub_theme for admin & export", async () => {
    const result = await getAllSubmissions({ isStaff: true });
    const uiaSub = result.submissions.find((s) => s.submission_id === createdSubIdUIA);
    const wiaSub = result.submissions.find((s) => s.submission_id === createdSubIdWIA);

    assert.ok(uiaSub, "UIA submission must be in getAllSubmissions list");
    assert.equal(uiaSub.sub_theme, "Accessible Technology");

    assert.ok(wiaSub, "WIA submission must be in getAllSubmissions list");
    assert.equal(wiaSub.sub_theme, "Open Government Data");
  });

  test("11. Participant can update to multiple sub-themes (array of sub-themes)", async () => {
    const updated = await updateSubmission(
      createdSubIdUIA,
      {
        sub_theme: ["Smart Mobility", "Sustainable Environment"],
      },
      testUserIdUIA,
      "USER"
    );

    assert.equal(updated.sub_theme, "Smart Mobility, Sustainable Environment");

    const reFetched = await getSubmissionById(createdSubIdUIA, { isInternal: true });
    assert.equal(reFetched.sub_theme, "Smart Mobility, Sustainable Environment");
  });

  test("12. Verify getAllSubmissions can filter by sub_theme", async () => {
    const filterSmartMobility = await getAllSubmissions({
      isStaff: true,
      sub_theme: "Smart Mobility",
    });
    const foundUia = filterSmartMobility.submissions.some((s) => s.submission_id === createdSubIdUIA);
    assert.ok(foundUia, "Should find UIA submission when filtering by Smart Mobility");

    const filterOpenGov = await getAllSubmissions({
      isStaff: true,
      sub_theme: "Open Government Data",
    });
    const foundWia = filterOpenGov.submissions.some((s) => s.submission_id === createdSubIdWIA);
    assert.ok(foundWia, "Should find WIA submission when filtering by Open Government Data");
    const foundUiaInWia = filterOpenGov.submissions.some((s) => s.submission_id === createdSubIdUIA);
    assert.equal(foundUiaInWia, false, "UIA submission should NOT appear in Open Government Data filter");
  });

  test("13. Cleanup test fixtures", async () => {
    if (testRegIdUIA) await deleteRegistration(testRegIdUIA, testUserIdUIA);
    if (testRegIdWIA) await deleteRegistration(testRegIdWIA, testUserIdWIA);

    await db.delete(schema.Category).where(eq(schema.Category.category_id, testCatIdUIA));
    await db.delete(schema.Category).where(eq(schema.Category.category_id, testCatIdWIA));
    await db.delete(schema.User).where(eq(schema.User.users_id, testUserIdUIA));
    await db.delete(schema.User).where(eq(schema.User.users_id, testUserIdWIA));
  });
});
