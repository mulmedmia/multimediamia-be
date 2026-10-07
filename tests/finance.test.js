import test from "node:test";
import assert from "node:assert/strict";
import * as schema from "../src/db/schema.js";
import { isFinance, isAdminOrFinance } from "../src/middleware/jwtAuth.js";

test("Finance Role and Schema Unit Tests", async (t) => {
  await t.test("schema: roleEnum should include FINANCE", () => {
    assert.ok(schema.roleEnum.enumValues.includes("FINANCE"), "roleEnum must include FINANCE");
    assert.ok(schema.roleEnum.enumValues.includes("ADMIN"), "roleEnum must include ADMIN");
    assert.ok(schema.roleEnum.enumValues.includes("USER"), "roleEnum must include USER");
  });

  await t.test("schema: Registration table should include finance fields", () => {
    assert.ok(schema.Registration.is_verified_finance, "Registration must have is_verified_finance");
    assert.ok(schema.Registration.verified_finance_at, "Registration must have verified_finance_at");
    assert.ok(schema.Registration.verified_finance_by, "Registration must have verified_finance_by");
    assert.ok(schema.Registration.finance_notes, "Registration must have finance_notes");
  });

  await t.test("middleware: isFinance should allow FINANCE and reject others", () => {
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    // User role: should fail
    nextCalled = false;
    isFinance({ user: { role: "USER" } }, mockRes, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(mockRes.statusCode, 403);

    // Admin role: should fail isFinance (only FINANCE allowed)
    nextCalled = false;
    isFinance({ user: { role: "ADMIN" } }, mockRes, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(mockRes.statusCode, 403);

    // Finance role: should succeed
    nextCalled = false;
    isFinance({ user: { role: "FINANCE" } }, mockRes, next);
    assert.strictEqual(nextCalled, true);
  });

  await t.test("middleware: isAdminOrFinance should allow ADMIN and FINANCE", () => {
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    const mockRes = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };

    // User role: should fail
    nextCalled = false;
    isAdminOrFinance({ user: { role: "USER" } }, mockRes, next);
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(mockRes.statusCode, 403);

    // Admin role: should pass
    nextCalled = false;
    isAdminOrFinance({ user: { role: "ADMIN" } }, mockRes, next);
    assert.strictEqual(nextCalled, true);

    // Finance role: should pass
    nextCalled = false;
    isAdminOrFinance({ user: { role: "FINANCE" } }, mockRes, next);
    assert.strictEqual(nextCalled, true);
  });
});
