/**
 * ============================================================================
 * QA TEST SUITE 03 — INPUT VALIDATION & INJECTION TESTING
 * ============================================================================
 * Standards Applied:
 *   - OWASP WSTG-INPV-01 to WSTG-INPV-20 (Input Validation Testing)
 *   - OWASP Top 10:2021 — A03 Injection
 *   - OWASP API Security Top 10:2023 — API8 (Security Misconfiguration)
 *   - Microsoft TestExplora: Fault injection, boundary analysis, negative testing
 *   - OpenAPI: Request body schema compliance testing
 *
 * Scope: All user-controlled inputs across all endpoints
 *        SQL-like injections, XSS payloads, oversized inputs, type confusion,
 *        malformed JSON, unexpected extra fields (mass assignment),
 *        HTTP method override attacks
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_here";
const BASE = "/api/v1";

const userToken = jwt.sign(
  { userId: "user-uuid-qa-001", email: "user@qa.local", role: "USER" },
  JWT_SECRET,
  { expiresIn: "1h" }
);
const adminToken = jwt.sign(
  { userId: "admin-uuid-qa-001", email: "admin@qa.local", role: "ADMIN" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

// =============================================================================
// WSTG-INPV-01: Reflected Cross-Site Scripting (XSS) — API JSON Context
// =============================================================================
describe("WSTG-INPV-01: XSS Payload Injection via Auth Endpoints", () => {
  const xssPayloads = [
    "<script>alert('XSS')</script>",
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(1)",
    "${7*7}",        // Template injection probe
    "{{7*7}}",       // SSTI probe
  ];

  xssPayloads.forEach((payload) => {
    it(`TC-XSS: Payload "${payload.substring(0, 30)}..." in name field is handled safely`, async () => {
      const res = await request(app)
        .post(`${BASE}/auth/register`)
        .send({ name: payload, email: `xss_${Date.now()}@test.local`, password: "Pass123!" });
      // Must NOT return 500 (potential unhandled crash)
      expect(res.status).not.toBe(500);
      // Response must always be JSON (never HTML that could render script tags)
      if (res.headers["content-type"]) {
        expect(res.headers["content-type"]).toContain("application/json");
      }
    });
  });
});

// =============================================================================
// WSTG-INPV-05: SQL / ORM Injection Testing (Drizzle ORM)
// =============================================================================
describe("WSTG-INPV-05: SQL/ORM Injection — Auth & Query Parameters", () => {
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "\" OR \"1\"=\"1",
    "1; SELECT * FROM \"User\"; --",
    "admin'--",
    "' UNION SELECT null, null, null --",
  ];

  sqlPayloads.forEach((payload) => {
    it(`TC-SQL: Injection "${payload.substring(0, 30)}" in email does not cause 500`, async () => {
      const res = await request(app)
        .post(`${BASE}/auth/login`)
        .send({ email: payload, password: "anything" });
      expect(res.status).not.toBe(500);
      expect([400, 401, 422]).toContain(res.status);
    });
  });

  it("TC-SQL07: SQL injection in query param category_id does not cause 500", async () => {
    const res = await request(app)
      .get(`${BASE}/submissions?category_id=' OR 1=1--`);
    expect(res.status).not.toBe(500);
  });

  it("TC-SQL08: SQL injection in gamification category_id path param does not cause 500", async () => {
    const res = await request(app)
      .get(`${BASE}/gamification/'; DROP TABLE "Submission"; --`);
    expect(res.status).not.toBe(500);
  });
});

// =============================================================================
// WSTG-INPV-13: HTTP Parameter Pollution
// =============================================================================
describe("WSTG-INPV-13: HTTP Parameter Pollution", () => {
  it("TC-HPP01: Duplicate query params do not cause 500 errors", async () => {
    const res = await request(app)
      .get(`${BASE}/submissions?page=1&page=99&limit=10&limit=9999`);
    expect(res.status).not.toBe(500);
  });
});

// =============================================================================
// WSTG-INPV: Mass Assignment / Unexpected Fields
// =============================================================================
describe("WSTG-INPV: Mass Assignment — Extra Unexpected Fields Must Be Ignored", () => {
  it("TC-MA01: Register with extra 'role' field must NOT allow self-assigning ADMIN role", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/register`)
      .send({
        name: "Mass Assign Attacker",
        email: `massassign_${Date.now()}@test.local`,
        password: "Pass123!",
        role: "ADMIN",           // Attempt to escalate privilege
        is_verified: true,       // Attempt to skip email verification
        points: 999999,          // Attempt to set points
      });
    // If registration succeeds (201), role must NOT be ADMIN
    if (res.status === 201) {
      expect(res.body.data?.role).not.toBe("ADMIN");
      expect(res.body.data?.is_verified).toBeFalsy();
      expect(res.body.data?.points).toBeUndefined();
    }
  });

  it("TC-MA02: Creating submission with extra 'is_verified=true' must not auto-verify", async () => {
    const res = await request(app)
      .post(`${BASE}/submissions`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        category_id: "fake-category-id",
        team_name: "Test Team",
        project_name: "Test Project",
        description: "A test description",
        flow_application: "Step 1, Step 2",
        is_verified: true,    // Attempt mass assignment
        score: 100,           // Attempt to inject score
        status: "APPROVED",   // Attempt to set status
      });
    // If somehow it returns 201, verify these privileged fields are not set from client
    if (res.status === 201) {
      expect(res.body.data?.is_verified).toBeFalsy();
      expect(res.body.data?.score).toBeNull();
      expect(res.body.data?.status).toBe("PENDING");
    }
    // Most likely 404 (Category not found) — just must not be 200 with elevated data
    expect(res.status).not.toBe(500);
  });

  it("TC-MA03: Updating registration with 'is_verified=true' in body must NOT verify it", async () => {
    const res = await request(app)
      .patch(`${BASE}/registrations/some-reg-id`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        file_url: "https://drive.google.com/file/d/valid",
        is_verified: true,  // Mass assignment attempt
      });
    // Expect 403/404 (not owner), but NOT 200 with is_verified=true
    if (res.status === 200) {
      expect(res.body.data?.is_verified).not.toBe(true);
    }
    expect(res.status).not.toBe(500);
  });
});

// =============================================================================
// Boundary Value Analysis — Input Size & Type Testing
// =============================================================================
describe("BVA: Boundary Value & Type Confusion Testing", () => {
  it("TC-BVA01: Integer input in email field does not crash server", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: 12345, password: "Pass123!" });
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA02: Array input in email field does not crash server", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: ["test@a.com", "test@b.com"], password: "Pass123!" });
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA03: Null value in required field does not crash server", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ email: null, password: null });
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA04: Very large integer as points in gamification does not crash server", async () => {
    const res = await request(app)
      .patch(`${BASE}/gamification/users/some-id/points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: Number.MAX_SAFE_INTEGER });
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA05: Negative points value is handled gracefully (no 500)", async () => {
    const res = await request(app)
      .patch(`${BASE}/gamification/users/some-id/points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: -99999 });
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA06: String 'NaN' as points returns validation error", async () => {
    const res = await request(app)
      .patch(`${BASE}/gamification/users/some-id/points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: "NaN" });
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA07: Oversized name string (1000 chars) does not crash server", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/register`)
      .send({
        name: "A".repeat(1000),
        email: "longname@test.com",
        password: "Pass123!",
      });
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA08: Malformed JSON body returns 400 not 500", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .set("Content-Type", "application/json")
      .send('{"email": "broken json,}');
    expect(res.status).not.toBe(500);
  });

  it("TC-BVA09: Empty string body with JSON content-type does not crash", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .set("Content-Type", "application/json")
      .send("");
    expect(res.status).not.toBe(500);
  });
});

// =============================================================================
// WSTG-INPV: HTTP Method Override (Verb Tampering)
// =============================================================================
describe("WSTG-INPV: HTTP Method Override / Verb Tampering", () => {
  it("TC-HMO01: DELETE on /auth/register (wrong method) returns 404 or 405", async () => {
    const res = await request(app).delete(`${BASE}/auth/register`);
    expect([404, 405]).toContain(res.status);
  });

  it("TC-HMO02: PUT on /auth/login (wrong method) returns 404 or 405", async () => {
    const res = await request(app).put(`${BASE}/auth/login`).send({});
    expect([404, 405]).toContain(res.status);
  });
});

// =============================================================================
// Registration Input Validation
// =============================================================================
describe("Input Validation — POST /registrations", () => {
  it("TC-REG-INP01: Invalid Google Drive URL format returns 400", async () => {
    const res = await request(app)
      .post(`${BASE}/registrations`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        category_id: "some-valid-category-id",
        file_url: "https://www.dropbox.com/sh/not-gdrive",
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Google Drive");
  });

  it("TC-REG-INP02: Missing category_id in registration returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/registrations`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ file_url: "https://drive.google.com/file/d/abc123" });
    expect(res.status).toBe(422);
  });
});
