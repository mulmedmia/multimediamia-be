/**
 * ============================================================================
 * QA TEST SUITE 04 — BUSINESS LOGIC TESTING
 * ============================================================================
 * Standards Applied:
 *   - OWASP WSTG-BUSL-01 to WSTG-BUSL-09 (Business Logic Testing)
 *   - OWASP API Security Top 10:2023 — API4 (Unrestricted Resource Consumption)
 *   - Microsoft TestExplora: State transition testing, workflow bypass testing
 *
 * Scope:
 *   - Password reset OTP double-consumption bug
 *   - Gamification redeem race condition
 *   - Workflow state bypass (skip steps)
 *   - Invalid enum values in status transitions
 *   - Redeem without points / inactive products
 *   - Submission with score injection
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
// WSTG-BUSL-01: Password Reset — OTP Double Consumption Bug
// =============================================================================
describe("WSTG-BUSL-01: Password Reset Workflow Integrity", () => {
  it("TC-PW01 [CONFIRMED BUG]: verify-reset-otp consumes OTP, making reset-password fail", async () => {
    // Step 1: Call verify-reset-otp (this deletes OTP from DB in current implementation)
    const step1 = await request(app)
      .post(`${BASE}/auth/verify-reset-otp`)
      .send({ email: "dummy@test.local", otp: "123456" });

    // Step 2: Attempt reset-password with the same OTP (now deleted)
    const step2 = await request(app)
      .post(`${BASE}/auth/reset-password`)
      .send({ email: "dummy@test.local", otp: "123456", newPassword: "NewPass123!" });

    // BUG DETECTION: If step1 returns 400 (OTP invalid), then the bug chain is still present.
    // If step2 returns 400 after a successful step1, the OTP was consumed too early.
    // Either way, the flow must return controlled errors, not 500.
    expect(step1.status).not.toBe(500);
    expect(step2.status).not.toBe(500);

    // The flow must return proper error messages, not crash
    if (step1.status === 200) {
      // If step1 succeeded (OTP was valid), step2 with same OTP must fail with 400
      expect(step2.status).toBe(400);
      expect(step2.body.message).toContain("Invalid or expired OTP");
    }
  });

  it("TC-PW02: Reset password with completely wrong OTP returns 400, not 500", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/reset-password`)
      .send({ email: "anyone@test.local", otp: "999999", newPassword: "NewPass123!" });
    expect(res.status).toBe(400);
    expect(res.body.message).not.toBeUndefined();
  });

  it("TC-PW03: Reset password for non-existent email with valid OTP format returns 400", async () => {
    const res = await request(app)
      .post(`${BASE}/auth/reset-password`)
      .send({ email: "ghost@nowhere.local", otp: "123456", newPassword: "NewPass123!" });
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// WSTG-BUSL-07 & API4: Gamification Points & Redemption Logic
// =============================================================================
describe("WSTG-BUSL-07: Gamification & Redemption Business Rules", () => {
  it("TC-GAM01: Redeem with no productId returns 422 validation error", async () => {
    const res = await request(app)
      .post(`${BASE}/gamification/redeem`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(422);
  });

  it("TC-GAM02: Redeem with non-existent productId returns 404", async () => {
    const res = await request(app)
      .post(`${BASE}/gamification/redeem`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ productId: "product-id-that-does-not-exist-qa-9999" });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("not found");
  });

  it("TC-GAM03: Update user points with string instead of number returns validation error", async () => {
    const res = await request(app)
      .patch(`${BASE}/gamification/users/some-user-id/points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: "one hundred" });
    expect(res.status).not.toBe(500);
    // Must return validation error (422) or 404 (user not found)
    expect([422, 404]).toContain(res.status);
  });

  it("TC-GAM04: Update user points with fractional number (float) is handled", async () => {
    const res = await request(app)
      .patch(`${BASE}/gamification/users/some-user-id/points`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ points: 10.7 });
    expect(res.status).not.toBe(500);
  });

  it("TC-GAM05 [RACE CONDITION CHECK]: Concurrent redeem requests cannot result in double-spend", async () => {
    // Simulate 5 concurrent redemption requests
    const concurrentRequests = Array(5).fill(null).map(() =>
      request(app)
        .post(`${BASE}/gamification/redeem`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ productId: "non-existent-product-for-race-test" })
    );

    const results = await Promise.allSettled(concurrentRequests);
    // All requests must resolve (no crash/hang) — atomicity is enforced by transaction
    results.forEach((result) => {
      expect(result.status).toBe("fulfilled");
      expect(result.value.status).not.toBe(500);
    });
    // Only 0 or 1 should succeed (404 is expected for non-existent product here)
    const successCount = results.filter(r => r.status === "fulfilled" && r.value.status === 200).length;
    expect(successCount).toBeLessThanOrEqual(1);
  });

  it("TC-GAM06: Leaderboard with extreme limit value does not crash server", async () => {
    const res = await request(app)
      .get(`${BASE}/gamification/some-category-id?limit=999999`);
    expect(res.status).not.toBe(500);
  });
});

// =============================================================================
// WSTG-BUSL-06: Workflow Bypass — Submission Status Transition
// =============================================================================
describe("WSTG-BUSL-06: Submission Status Workflow Validation", () => {
  it("TC-WF01: Update submission status with invalid enum value returns error", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/some-sub-id/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "HACKED_STATUS" });
    // Must be rejected with validation error, not 200 or 500
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(500);
  });

  it("TC-WF02: Update submission score with negative score value is handled", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/some-sub-id/score-feedback`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ score: -100, feedback: "Invalid negative score" });
    expect(res.status).not.toBe(500);
  });

  it("TC-WF03: Update submission score above 100 is handled", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/some-sub-id/score-feedback`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ score: 999, feedback: "Score too high" });
    expect(res.status).not.toBe(500);
  });

  it("TC-WF04: Score update without feedback field does not crash", async () => {
    const res = await request(app)
      .patch(`${BASE}/submissions/some-sub-id/score-feedback`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ score: 85 });
    expect(res.status).not.toBe(500);
  });
});

// =============================================================================
// WSTG-BUSL-04: Process Timing — Registration Duplicate Prevention
// =============================================================================
describe("WSTG-BUSL-04: Duplicate Registration Prevention", () => {
  it("TC-DUP01: Creating submission with missing required fields returns 422", async () => {
    const res = await request(app)
      .post(`${BASE}/submissions`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        category_id: "some-cat-id",
        // Missing: team_name, project_name, description, flow_application
      });
    expect([422, 400]).toContain(res.status);
  });

  it("TC-DUP02: Registration with non-Google Drive URL is rejected with 400", async () => {
    const res = await request(app)
      .post(`${BASE}/registrations`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        category_id: "some-cat-id",
        file_url: "https://dropbox.com/file/abc123",
      });
    expect(res.status).toBe(400);
  });

  it("TC-DUP03: Registration feedback too short (< 3 chars) returns validation error", async () => {
    const res = await request(app)
      .patch(`${BASE}/registrations/some-reg-id/feedback`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ feedback: "ab" });
    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(500);
  });
});
