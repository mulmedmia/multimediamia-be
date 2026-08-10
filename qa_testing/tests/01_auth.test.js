/**
 * ============================================================================
 * QA TEST SUITE 01 — AUTHENTICATION TESTING
 * ============================================================================
 * Standards Applied:
 *   - OWASP WSTG-ATHN-01 to WSTG-ATHN-10 (Authentication Testing)
 *   - OWASP API Security Top 10:2023 — API2 (Broken Authentication)
 *   - OpenAPI: Validates request/response contract on /api/v1/auth endpoints
 *   - Microsoft TestExplora: Equivalence Partitioning, Boundary Value Analysis
 *
 * Scope: POST /auth/register, /auth/login, /auth/verify-otp,
 *        /auth/request-otp, /auth/forgot-password,
 *        /auth/verify-reset-otp, /auth/reset-password
 * ============================================================================
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app.js";

const BASE = "/api/v1/auth";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const validRegisterPayload = () => ({
  name: "Test User QA",
  email: `qa_user_${Date.now()}@mia-test.local`,
  password: "SecurePass123!",
});

// =============================================================================
// WSTG-ATHN-01: Test Credentials Transported over Encrypted Channel
// =============================================================================
describe("WSTG-ATHN-01: Input Validation Contract — POST /auth/register", () => {
  it("TC-R01 [PASS] Valid registration payload returns 201 with user data (no password)", async () => {
    const payload = validRegisterPayload();
    const res = await request(app).post(`${BASE}/register`).send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.email).toBe(payload.email);
    // CRITICAL: password must NEVER be returned in response
    expect(res.body.data.password).toBeUndefined();
  });

  it("TC-R02 [FAIL] Empty body returns 422 Unprocessable Entity", async () => {
    const res = await request(app).post(`${BASE}/register`).send({});
    expect(res.status).toBe(422);
  });

  it("TC-R03 [FAIL] Invalid email format returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ name: "User", email: "not-an-email", password: "Pass123!" });
    expect(res.status).toBe(422);
  });

  it("TC-R04 [FAIL] Password too short (< 6 chars) returns 422 (Boundary Value)", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ name: "User", email: "valid@test.com", password: "12345" });
    expect(res.status).toBe(422);
  });

  it("TC-R05 [FAIL] Name too short (< 3 chars) returns 422 (Boundary Value)", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ name: "AB", email: "valid@test.com", password: "Pass123!" });
    expect(res.status).toBe(422);
  });

  it("TC-R06 [FAIL] Missing required field 'name' returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "valid@test.com", password: "Pass123!" });
    expect(res.status).toBe(422);
  });

  it("TC-R07 [FAIL] Missing required field 'password' returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ name: "Test User", email: "valid@test.com" });
    expect(res.status).toBe(422);
  });

  it("TC-R08 [FAIL] Duplicate email registration returns 400", async () => {
    const payload = validRegisterPayload();
    await request(app).post(`${BASE}/register`).send(payload);
    const res = await request(app).post(`${BASE}/register`).send(payload);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("already registered");
  });

  it("TC-R09 [SECURITY] Password with only whitespace returns 422 (no weak passwords)", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ name: "Test User", email: "valid@test.com", password: "      " });
    expect(res.status).toBe(422);
  });

  it("TC-R10 [SECURITY] XSS payload in name field is not reflected as executable HTML", async () => {
    const xssPayload = "<script>alert(1)</script>";
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ name: xssPayload, email: "xss@test.com", password: "Pass123!" });
    // Should either reject (422) or accept as plain string (201) — must NOT return unescaped HTML
    if (res.status === 201) {
      expect(res.headers["content-type"]).toContain("application/json");
    } else {
      expect(res.status).toBe(422);
    }
  });
});

// =============================================================================
// WSTG-ATHN-06: Brute-Force / Account Enumeration Test
// =============================================================================
describe("WSTG-ATHN-06: Login Testing — POST /auth/login", () => {
  it("TC-L01 [FAIL] Non-existent user returns 401 (generic message, no enumeration)", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "ghost_user_qa@notexist.com", password: "WrongPass999!" });
    expect(res.status).toBe(401);
    // Anti-enumeration: must NOT say 'User not found' — must say 'Invalid email or password'
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("TC-L02 [FAIL] Empty login body returns 422", async () => {
    const res = await request(app).post(`${BASE}/login`).send({});
    expect(res.status).toBe(422);
  });

  it("TC-L03 [FAIL] Missing password field returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "test@test.com" });
    expect(res.status).toBe(422);
  });

  it("TC-L04 [FAIL] Invalid email format on login returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "bad-email-format", password: "Pass123!" });
    expect(res.status).toBe(422);
  });

  it("TC-L05 [SECURITY] SQL-like injection in email does not cause 500 error", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "' OR '1'='1", password: "anything" });
    // Must be 422 (validation blocks it) or 401 — never 500 (server error = exposed DB)
    expect(res.status).not.toBe(500);
    expect([401, 422]).toContain(res.status);
  });

  it("TC-L06 [SECURITY] Extremely long email string does not cause 500 (DoS protection)", async () => {
    const longEmail = "a".repeat(500) + "@test.com";
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: longEmail, password: "Pass123!" });
    expect(res.status).not.toBe(500);
  });
});

// =============================================================================
// WSTG-ATHN-09 & 10: OTP Verification Testing
// =============================================================================
describe("WSTG-ATHN-09: OTP Verification Contract — POST /auth/verify-otp", () => {
  it("TC-O01 [FAIL] Invalid OTP returns 400 Bad Request", async () => {
    const res = await request(app)
      .post(`${BASE}/verify-otp`)
      .send({ email: "nonexistent@qa.local", otp: "000000" });
    expect(res.status).toBe(400);
  });

  it("TC-O02 [FAIL] OTP with wrong length (!= 6 chars) returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/verify-otp`)
      .send({ email: "test@qa.local", otp: "123" });
    expect(res.status).toBe(422);
  });

  it("TC-O03 [FAIL] Empty OTP verify body returns 422", async () => {
    const res = await request(app).post(`${BASE}/verify-otp`).send({});
    expect(res.status).toBe(422);
  });

  it("TC-O04 [FAIL] OTP with special characters returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/verify-otp`)
      .send({ email: "test@qa.local", otp: "!@#$%^" });
    expect(res.status).toBe(422);
  });
});

// =============================================================================
// WSTG-ATHN-10: Weak Password Reset Mechanism Testing
// =============================================================================
describe("WSTG-ATHN-10: Password Reset Flow — POST /auth/forgot-password", () => {
  it("TC-P01 [FAIL] Forgot password for non-existent user returns 404", async () => {
    const res = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: "definitely_not_real@nowhere.com" });
    expect(res.status).toBe(404);
  });

  it("TC-P02 [FAIL] Empty forgot-password body returns 422", async () => {
    const res = await request(app).post(`${BASE}/forgot-password`).send({});
    expect(res.status).toBe(422);
  });

  it("TC-P03 [FAIL] Invalid email format for forgot-password returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: "bad@@format" });
    expect(res.status).toBe(422);
  });

  it("TC-P04 [FAIL] Reset-password with invalid OTP returns 400", async () => {
    const res = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ email: "test@qa.local", otp: "000000", newPassword: "NewPass123!" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Invalid or expired OTP");
  });

  it("TC-P05 [FAIL] Reset-password new password too short returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ email: "test@qa.local", otp: "123456", newPassword: "123" });
    expect(res.status).toBe(422);
  });
});

// =============================================================================
// Request OTP Rate-Abuse Simulation
// =============================================================================
describe("OTP Request Abuse — POST /auth/request-otp", () => {
  it("TC-OTP01 [FAIL] Invalid email for request-otp returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/request-otp`)
      .send({ email: "not-valid" });
    expect(res.status).toBe(422);
  });

  it("TC-OTP02 [FAIL] Empty body for request-otp returns 422", async () => {
    const res = await request(app).post(`${BASE}/request-otp`).send({});
    expect(res.status).toBe(422);
  });
});
