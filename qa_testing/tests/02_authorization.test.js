/**
 * ============================================================================
 * QA TEST SUITE 02 — AUTHORIZATION & ACCESS CONTROL TESTING
 * ============================================================================
 * Standards Applied:
 *   - OWASP WSTG-ATHZ-01 to WSTG-ATHZ-04 (Authorization Testing)
 *   - OWASP API Security Top 10:2023 — API1 (BOLA), API5 (BFLA)
 *   - OpenAPI: Each role should only access permitted endpoints
 *   - Microsoft TestExplora: Role-based equivalence classes, negative testing
 *
 * Scope:
 *   - Unauthenticated access to all protected endpoints
 *   - Cross-role access (User accessing Admin endpoints)
 *   - BOLA: Accessing/modifying other users' resources via ID manipulation
 *   - BFLA: Calling privileged functions with insufficient role
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const BASE = "/api/v1";

// ─── Token Factories ──────────────────────────────────────────────────────────
const makeToken = (payload, expiresIn = "1h") =>
  jwt.sign(payload, JWT_SECRET, { expiresIn });

const userToken = makeToken({ userId: "user-uuid-qa-001", email: "user@qa.local", role: "USER" });
const juriToken = makeToken({ userId: "juri-uuid-qa-001", email: "juri@qa.local", role: "JURI" });
const adminToken = makeToken({ userId: "admin-uuid-qa-001", email: "admin@qa.local", role: "ADMIN" });
const expiredToken = makeToken({ userId: "exp-uuid", email: "exp@qa.local", role: "USER" }, "-1s");
const malformedToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.INVALID.SIG";

// =============================================================================
// WSTG-ATHZ-01: Unauthenticated Access Tests (No Token)
// =============================================================================
describe("WSTG-ATHZ-01: Unauthenticated Access — All Protected Endpoints Must Return 401", () => {
  const protectedEndpoints = [
    { method: "get",    path: `${BASE}/registrations` },
    { method: "post",   path: `${BASE}/registrations` },
    { method: "get",    path: `${BASE}/users/profile` },
    { method: "patch",  path: `${BASE}/users/profile` },
    { method: "get",    path: `${BASE}/users` },
    { method: "get",    path: `${BASE}/users/regular` },
    { method: "get",    path: `${BASE}/submissions/my/submissions` },
    { method: "post",   path: `${BASE}/submissions` },
    { method: "post",   path: `${BASE}/gamification/redeem` },
    { method: "get",    path: `${BASE}/gamification/redeem/my` },
    { method: "get",    path: `${BASE}/auth/juri` },
    { method: "post",   path: `${BASE}/auth/juri` },
  ];

  protectedEndpoints.forEach(({ method, path }) => {
    it(`TC-UA [${method.toUpperCase()}] ${path} → must return 401 without token`, async () => {
      const res = await request(app)[method](path).send({});
      expect(res.status).toBe(401);
    });
  });
});

// =============================================================================
// WSTG-ATHZ-02: Expired / Malformed Token Rejection
// =============================================================================
describe("WSTG-ATHZ-02: Expired & Malformed JWT Token Must Be Rejected", () => {
  it("TC-TK01 [SECURITY] Expired JWT token returns 401 Unauthorized", async () => {
    const res = await request(app)
      .get(`${BASE}/users/profile`)
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it("TC-TK02 [SECURITY] Malformed/tampered JWT token returns 401", async () => {
    const res = await request(app)
      .get(`${BASE}/users/profile`)
      .set("Authorization", malformedToken);
    expect(res.status).toBe(401);
  });

  it("TC-TK03 [SECURITY] JWT with role=ADMIN but wrong secret returns 401", async () => {
    const fakeAdminToken = jwt.sign(
      { userId: "fake-admin", email: "fake@admin.com", role: "ADMIN" },
      "wrong_secret_completely"
    );
    const res = await request(app)
      .get(`${BASE}/users`)
      .set("Authorization", `Bearer ${fakeAdminToken}`);
    expect(res.status).toBe(401);
  });

  it("TC-TK04 [SECURITY] Token with tampered role (USER→ADMIN) is rejected", async () => {
    // Sign with correct secret but payload claims ADMIN — server should accept but RBAC must enforce
    // This TC verifies the server relies on server-signed tokens, not client-side claims
    const selfElevatedToken = jwt.sign(
      { userId: "user-uuid-qa-001", email: "user@qa.local", role: "ADMIN" },
      "different_secret"
    );
    const res = await request(app)
      .get(`${BASE}/users`)
      .set("Authorization", `Bearer ${selfElevatedToken}`);
    expect(res.status).toBe(401); // Wrong secret → invalid token
  });

  it("TC-TK05 [SECURITY] Authorization header with no Bearer prefix returns 401", async () => {
    const res = await request(app)
      .get(`${BASE}/users/profile`)
      .set("Authorization", userToken); // Missing 'Bearer ' prefix
    expect(res.status).toBe(401);
  });
});

// =============================================================================
// WSTG-ATHZ-03 & API5:BFLA — Broken Function Level Authorization
// =============================================================================
describe("WSTG-ATHZ-03 [BFLA]: USER Role Cannot Access ADMIN-Only Endpoints", () => {
  it("TC-BFLA01: USER cannot GET all users list → must return 403", async () => {
    const res = await request(app)
      .get(`${BASE}/users`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("TC-BFLA02: USER cannot GET regular users list → must return 403", async () => {
    const res = await request(app)
      .get(`${BASE}/users/regular`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("TC-BFLA03: USER cannot access admin redeem history → must return 403", async () => {
    const res = await request(app)
      .get(`${BASE}/gamification/admin/redeem/all`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("TC-BFLA04: USER cannot create JURI account → must return 403", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/juri`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Fake Juri", email: "fakejuri@test.com", password: "Pass123!" });
    expect(res.status).toBe(403);
  });

  it("TC-BFLA05: USER cannot delete JURI → must return 403", async () => {
    const res = await request(app)
      .delete(`${BASE}/auth/juri/some-juri-id`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("TC-BFLA06: USER cannot update submission status → must return 403", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/some-submission-id/status`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ status: "APPROVED" });
    expect(res.status).toBe(403);
  });

  it("TC-BFLA07: USER cannot update points of another user → must return 403", async () => {
    const res = await request(app)
      .patch(`${BASE}/gamification/users/other-user-id/points`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ points: 9999 });
    expect(res.status).toBe(403);
  });
});

describe("WSTG-ATHZ-03 [BFLA]: JURI Role Authorization Boundaries", () => {
  it("TC-BFLA08: JURI can access score-feedback endpoint → must NOT be 403", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/nonexistent-sub-id/score-feedback`)
      .set("Authorization", `Bearer ${juriToken}`)
      .send({ score: 85, feedback: "Great work!" });
    // JURI is authorized — must NOT be 403. Expected 404 (sub not found) is OK.
    expect(res.status).not.toBe(403);
  });

  it("TC-BFLA09: JURI cannot access admin redeem history → must return 403", async () => {
    const res = await request(app)
      .get(`${BASE}/gamification/admin/redeem/all`)
      .set("Authorization", `Bearer ${juriToken}`);
    expect(res.status).toBe(403);
  });

  it("TC-BFLA10: ADMIN can access score-feedback endpoint → must NOT be 403", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/nonexistent-sub-id/score-feedback`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ score: 90, feedback: "Excellent!" });
    expect(res.status).not.toBe(403);
  });
});

// =============================================================================
// OWASP API1:BOLA — Broken Object Level Authorization (IDOR)
// =============================================================================
describe("API1:BOLA (IDOR): Users Cannot Access/Modify Resources of Other Users", () => {
  it("TC-BOLA01: USER cannot access registration belonging to another user via ID", async () => {
    const res = await request(app)
      .get(`${BASE}/registrations/OTHER_USER_REG_ID_99`)
      .set("Authorization", `Bearer ${userToken}`);
    // Should return 403 Forbidden or 404 Not Found — never 200 with other user's data
    expect([403, 404]).toContain(res.status);
  });

  it("TC-BOLA02: USER cannot update registration belonging to another user", async () => {
    const res = await request(app)
      .patch(`${BASE}/registrations/OTHER_USER_REG_ID_99`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ file_url: "https://drive.google.com/file/d/FAKE" });
    expect([403, 404]).toContain(res.status);
  });

  it("TC-BOLA03: USER cannot delete registration belonging to another user", async () => {
    const res = await request(app)
      .delete(`${BASE}/registrations/OTHER_USER_REG_ID_99`)
      .set("Authorization", `Bearer ${userToken}`);
    expect([403, 404]).toContain(res.status);
  });

  it("TC-BOLA04: USER cannot update submission belonging to another user", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/OTHER_USER_SUB_ID_99`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ project_name: "Hijacked Project" });
    expect([403, 404]).toContain(res.status);
  });
});
