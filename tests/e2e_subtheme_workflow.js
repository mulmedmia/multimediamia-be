import axios from "axios";
import assert from "node:assert/strict";

const API_BASE = "http://localhost:5000/api/v1";

async function runE2EWorkflow() {
  console.log("🚀 Starting E2E Sub-Theme & Admin Filter Verification...");

  // 1. Login as UI/UX participant (Anisa Putri - Tim Aurora Studio)
  console.log("\n1️⃣  Logging in as UI/UX Participant (peserta.aurora@mia2026.com)...");
  const userLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: "peserta.aurora@mia2026.com",
    password: "Password123!",
  });
  const userToken = userLoginRes.data.data.token;
  assert.ok(userToken, "User token should be received");
  console.log("✅ Logged in successfully as participant.");

  const userHeaders = { Authorization: `Bearer ${userToken}` };

  // 2. Fetch participant submissions
  console.log("\n2️⃣  Fetching user's current submission...");
  const mySubmissionsRes = await axios.get(`${API_BASE}/submissions/my/submissions`, {
    headers: userHeaders,
  });
  const submissions = mySubmissionsRes.data.data.submissions;
  assert.ok(submissions.length > 0, "Participant should have at least 1 submission");
  const targetSub = submissions[0];
  console.log(`Found submission: "${targetSub.project_name}" (ID: ${targetSub.submission_id})`);
  console.log(`Initial sub_theme: "${targetSub.sub_theme || '(None)'}"`);

  // 3. Update submission with MULTIPLE sub-themes (kotak centang: Smart Mobility & Accessible Technology)
  console.log("\n3️⃣  Updating submission with multiple sub-themes (array: ['Smart Mobility', 'Accessible Technology'])...");
  const patchRes = await axios.patch(
    `${API_BASE}/submissions/${targetSub.submission_id}`,
    {
      sub_theme: ["Smart Mobility", "Accessible Technology"],
    },
    { headers: userHeaders }
  );
  assert.equal(patchRes.data.data.sub_theme, "Smart Mobility, Accessible Technology");
  console.log("✅ PATCH response sub_theme:", patchRes.data.data.sub_theme);

  // 4. Verify GET my-submissions reflects the updated multiple sub-themes
  console.log("\n4️⃣  Verifying GET /submissions/my-submissions has multiple sub-themes...");
  const reFetchMyRes = await axios.get(`${API_BASE}/submissions/my/submissions`, {
    headers: userHeaders,
  });
  const updatedSub = reFetchMyRes.data.data.submissions.find((s) => s.submission_id === targetSub.submission_id);
  assert.equal(updatedSub.sub_theme, "Smart Mobility, Accessible Technology");
  console.log("✅ Verified: User dashboard receives sub_theme:", updatedSub.sub_theme);

  // 5. Login as Admin
  console.log("\n5️⃣  Logging in as Admin (Admin@email.com)...");
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: "Admin@email.com",
    password: "Admin123",
  });
  const adminToken = adminLoginRes.data.data.token;
  assert.ok(adminToken, "Admin token should be received");
  console.log("✅ Logged in successfully as admin.");

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 6. Test Admin Filter: Filter by sub_theme="Smart Mobility"
  console.log("\n6️⃣  Testing Admin Filter with sub_theme='Smart Mobility'...");
  const filterSmartRes = await axios.get(`${API_BASE}/submissions`, {
    headers: adminHeaders,
    params: { sub_theme: "Smart Mobility" },
  });
  const foundSmart = filterSmartRes.data.data.submissions.some((s) => s.submission_id === targetSub.submission_id);
  assert.ok(foundSmart, "Target submission MUST appear when filtering by 'Smart Mobility'");
  console.log(`✅ Filter 'Smart Mobility' returned ${filterSmartRes.data.data.submissions.length} results, target submission FOUND.`);

  // 7. Test Admin Filter: Filter by sub_theme="Accessible Technology"
  console.log("\n7️⃣  Testing Admin Filter with sub_theme='Accessible Technology'...");
  const filterAccessRes = await axios.get(`${API_BASE}/submissions`, {
    headers: adminHeaders,
    params: { sub_theme: "Accessible Technology" },
  });
  const foundAccess = filterAccessRes.data.data.submissions.some((s) => s.submission_id === targetSub.submission_id);
  assert.ok(foundAccess, "Target submission MUST appear when filtering by 'Accessible Technology'");
  console.log(`✅ Filter 'Accessible Technology' returned ${filterAccessRes.data.data.submissions.length} results, target submission FOUND.`);

  // 8. Test Admin Filter: Filter by non-matching sub_theme="Open Government Data"
  console.log("\n8️⃣  Testing Admin Filter with non-matching sub_theme='Open Government Data'...");
  const filterOtherRes = await axios.get(`${API_BASE}/submissions`, {
    headers: adminHeaders,
    params: { sub_theme: "Open Government Data" },
  });
  const foundOther = filterOtherRes.data.data.submissions.some((s) => s.submission_id === targetSub.submission_id);
  assert.equal(foundOther, false, "Target UIA submission MUST NOT appear when filtering by 'Open Government Data'");
  console.log(`✅ Filter 'Open Government Data' correctly EXCLUDED target submission.`);

  // 9. Test Search Box with Sub-theme: Searching "Accessible" in search input
  console.log("\n9️⃣  Testing Search bar matching sub-theme ('Accessible')...");
  const searchRes = await axios.get(`${API_BASE}/submissions`, {
    headers: adminHeaders,
    params: { search: "Accessible" },
  });
  const foundInSearch = searchRes.data.data.submissions.some((s) => s.submission_id === targetSub.submission_id);
  assert.ok(foundInSearch, "Target submission MUST appear when searching by sub-theme keyword");
  console.log(`✅ Search by sub-theme keyword 'Accessible' returned target submission.`);

  console.log("\n🎉 ALL E2E SUB-THEME & ADMIN FILTER TESTS PASSED SUCCESSFULLY! 🎉\n");
}

runE2EWorkflow().catch((err) => {
  console.error("❌ E2E Workflow Test Failed:", err?.response?.data || err.message);
  process.exit(1);
});
