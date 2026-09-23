import { test, describe } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

describe("Auth & Token Suite", () => {
  const TEST_SECRET = process.env.JWT_SECRET || "mia2026_test_secret_for_suite";

  test("bcrypt should securely hash password and verify match", async () => {
    const rawPassword = "superSecretPassword2026!";
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    assert.notEqual(rawPassword, hash);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.equal(isMatch, true);

    const isWrongMatch = await bcrypt.compare("wrongPassword", hash);
    assert.equal(isWrongMatch, false);
  });

  test("jwt should sign and correctly verify authentic token", () => {
    const payload = {
      userId: "usr_abc123",
      email: "peserta@mia2026.com",
      role: "USER",
    };

    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
    const decoded = jwt.verify(token, TEST_SECRET);

    assert.equal(decoded.userId, payload.userId);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, "USER");
  });

  test("jwt should reject tampered token signatures", () => {
    const payload = {
      userId: "usr_attacker",
      role: "ADMIN",
    };

    const forgedToken = jwt.sign(payload, "wrong_secret_key");

    assert.throws(
      () => {
        jwt.verify(forgedToken, TEST_SECRET);
      },
      (err) => {
        return err.name === "JsonWebTokenError";
      }
    );
  });

  test("jwt should reject expired tokens", async () => {
    const payload = { userId: "usr_expired" };
    // Sign token expired 1 second ago
    const expiredToken = jwt.sign(payload, TEST_SECRET, { expiresIn: -1 });

    assert.throws(
      () => {
        jwt.verify(expiredToken, TEST_SECRET);
      },
      (err) => {
        return err.name === "TokenExpiredError";
      }
    );
  });
});
