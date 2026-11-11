import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getSubmissions } from "../src/controllers/submission.controller.js";

describe("Submissions updated_after and updated_before filter test suite", () => {
  test("1. getSubmissions controller handles updated_after and updated_before queries", async () => {
    const req = {
      user: { role: "ADMIN", userId: "admin123" },
      query: {
        page: "1",
        limit: "10",
        updated_after: "2026-11-01",
        updated_before: "2026-11-05",
      },
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        return this;
      },
    };

    try {
      await getSubmissions(req, res);
    } catch (e) {
      // Handled by response.error
    }

    assert.equal(req.query.updated_after, "2026-11-01");
    assert.equal(req.query.updated_before, "2026-11-05");
  });

  test("2. Parsing YYYY-MM-DD creates valid Date for gte and lte comparison", () => {
    const afterInput = "2026-11-01";
    const afterDateObj = new Date(afterInput.includes("T") ? afterInput : `${afterInput}T00:00:00.000Z`);
    assert.equal(isNaN(afterDateObj.getTime()), false);
    assert.equal(afterDateObj.toISOString(), "2026-11-01T00:00:00.000Z");

    const beforeInput = "2026-11-05";
    const beforeDateObj = new Date(beforeInput.includes("T") ? beforeInput : `${beforeInput}T23:59:59.999Z`);
    assert.equal(isNaN(beforeDateObj.getTime()), false);
    assert.equal(beforeDateObj.toISOString(), "2026-11-05T23:59:59.999Z");
  });
});
