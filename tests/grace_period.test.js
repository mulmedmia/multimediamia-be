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

  test("7. Exact official deadline remains on time", () => {
    const result = evaluateSubmissionGracePeriod(
      baseCategory,
      new Date("2026-11-01T23:59:59+07:00"),
    );

    assert.deepEqual(
      { allowed: result.allowed, isGracePeriod: result.isGracePeriod, delay: result.graceDelaySeconds },
      { allowed: true, isGracePeriod: false, delay: 0 },
    );
  });

  test("8. One millisecond after the official deadline enters grace", () => {
    const result = evaluateSubmissionGracePeriod(
      baseCategory,
      new Date(new Date("2026-11-01T23:59:59+07:00").getTime() + 1),
    );

    assert.equal(result.allowed, true);
    assert.equal(result.isGracePeriod, true);
    assert.equal(result.graceDelaySeconds, 0);
  });

  test("9. Revision phase uses the final deadline", () => {
    const result = evaluateSubmissionGracePeriod(
      { ...baseCategory, allow_revision: true },
      new Date("2026-11-10T23:59:59+07:00"),
    );

    assert.equal(result.allowed, true);
    assert.equal(result.isGracePeriod, false);
  });

  test("10. Explicit official-deadline override takes precedence", () => {
    const previous = process.env.SUBMISSION_OFFICIAL_DEADLINE;
    process.env.SUBMISSION_OFFICIAL_DEADLINE = "2026-11-02T00:00:00+07:00";

    try {
      const result = evaluateSubmissionGracePeriod(
        baseCategory,
        new Date("2026-11-02T00:00:00+07:00"),
      );
      assert.equal(result.allowed, true);
      assert.equal(result.isGracePeriod, false);
    } finally {
      if (previous === undefined) delete process.env.SUBMISSION_OFFICIAL_DEADLINE;
      else process.env.SUBMISSION_OFFICIAL_DEADLINE = previous;
    }
  });

  test("11. Invalid official-deadline override fails closed", () => {
    const previous = process.env.SUBMISSION_OFFICIAL_DEADLINE;
    process.env.SUBMISSION_OFFICIAL_DEADLINE = "not-a-date";

    try {
      const result = evaluateSubmissionGracePeriod(
        baseCategory,
        new Date("2027-01-01T00:00:00Z"),
      );
      assert.equal(result.allowed, false);
      assert.equal(result.isGracePeriod, false);
      assert.match(result.message, /belum dikonfigurasi dengan valid/);
    } finally {
      if (previous === undefined) delete process.env.SUBMISSION_OFFICIAL_DEADLINE;
      else process.env.SUBMISSION_OFFICIAL_DEADLINE = previous;
    }
  });

  test("12. Category without any configured deadline fails closed", () => {
    const result = evaluateSubmissionGracePeriod(
      { ...baseCategory, preliminary_deadline: null, final_deadline: null },
      new Date("2027-01-01T00:00:00Z"),
    );

    assert.equal(result.allowed, false);
    assert.match(result.message, /belum dikonfigurasi dengan valid/);
  });

  test("13. Invalid tolerance configuration fails closed", () => {
    const previous = process.env.SUBMISSION_TOLERANCE_MINUTES;
    process.env.SUBMISSION_TOLERANCE_MINUTES = "-1";

    try {
      const result = evaluateSubmissionGracePeriod(baseCategory);
      assert.equal(result.allowed, false);
      assert.match(result.message, /Konfigurasi batas toleransi/);
    } finally {
      if (previous === undefined) delete process.env.SUBMISSION_TOLERANCE_MINUTES;
      else process.env.SUBMISSION_TOLERANCE_MINUTES = previous;
    }
  });
});
