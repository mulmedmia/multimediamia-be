import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateSubmissionGracePeriod } from "../src/services/submission.service.js";
import upload from "../src/lib/multer.js";

describe("Submission Silent Grace Period & Size Limits Suite", () => {
  const baseCategory = {
    category_id: "cat-wia-test",
    slug: "WIA",
    name: "Web In Action",
    is_submission_open: true,
    preliminary_deadline: new Date("2026-11-01T23:59:59+07:00"),
    final_deadline: new Date("2026-11-10T23:59:59+07:00"),
    allow_revision: false,
  };

  test("1. Submission within official deadline should be allowed with isGracePeriod = false", () => {
    // 10 minutes before preliminary deadline
    const testNow = new Date("2026-11-01T23:49:59+07:00");
    const result = evaluateSubmissionGracePeriod(baseCategory, testNow);

    assert.equal(result.allowed, true);
    assert.equal(result.isGracePeriod, false);
    assert.equal(result.graceDelaySeconds, 0);
  });

  test("2. Submission within 90-minute grace window should be allowed with isGracePeriod = true", () => {
    // 35 minutes after preliminary deadline (within 90 min tolerance)
    const testNow = new Date("2026-11-02T00:34:59+07:00");
    const result = evaluateSubmissionGracePeriod(baseCategory, testNow);

    assert.equal(result.allowed, true);
    assert.equal(result.isGracePeriod, true);
    assert.equal(result.graceDelaySeconds, 35 * 60);
  });

  test("3. Submission at exact 90-minute limit should still be allowed in grace period", () => {
    // Exactly 90 minutes after preliminary deadline
    const testNow = new Date("2026-11-02T01:29:59+07:00");
    const result = evaluateSubmissionGracePeriod(baseCategory, testNow);

    assert.equal(result.allowed, true);
    assert.equal(result.isGracePeriod, true);
    assert.equal(result.graceDelaySeconds, 90 * 60);
  });

  test("4. Submission past 90-minute grace window should be rejected with hard deadline message", () => {
    // 91 minutes after preliminary deadline
    const testNow = new Date("2026-11-02T01:31:00+07:00");
    const result = evaluateSubmissionGracePeriod(baseCategory, testNow);

    assert.equal(result.allowed, false);
    assert.equal(result.isGracePeriod, true);
    assert.ok(result.message.includes("Batas akhir pengumpulan karya telah resmi ditutup"));
  });

  test("5. Category manually closed by admin should be rejected immediately", () => {
    const closedCategory = {
      ...baseCategory,
      is_submission_open: false,
    };
    const testNow = new Date("2026-11-01T12:00:00+07:00");
    const result = evaluateSubmissionGracePeriod(closedCategory, testNow);

    assert.equal(result.allowed, false);
    assert.ok(result.message.includes("ditutup oleh admin"));
  });

  test("6. Multer configuration should enforce 2MB max file size", () => {
    const expectedMaxBytes = 2 * 1024 * 1024;
    assert.equal(upload.limits.fileSize, expectedMaxBytes);
  });
});
