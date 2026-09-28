import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { generateCuid } from "../src/db/cuid.js";
import {
  generateReferralCodeForRegistration,
  validateReferralCode,
  recordReferralOnRegistration,
  approveReferralLog,
  rejectReferralLog,
  getAllReferralLogs,
} from "../src/services/referral.service.js";

describe("Referral System Integration Tests", () => {
  let userAId, userBId, adminId;
  let categoryId;
  let regAId, regBId;
  let testReferralCode;
  let testReferralLogId;

  before(async () => {
    // 1. Create test users
    userAId = generateCuid();
    userBId = generateCuid();
    adminId = generateCuid();

    await db.insert(schema.User).values([
      {
        users_id: userAId,
        email: `test_ref_a_${Date.now()}@mia.test`,
        name: "Test User A",
        password: "hashpassword123",
        role: "USER",
        is_verified: true,
      },
      {
        users_id: userBId,
        email: `test_ref_b_${Date.now()}@mia.test`,
        name: "Test User B",
        password: "hashpassword123",
        role: "USER",
        is_verified: true,
      },
      {
        users_id: adminId,
        email: `test_admin_${Date.now()}@mia.test`,
        name: "Test Admin",
        password: "hashpassword123",
        role: "ADMIN",
        is_verified: true,
      },
    ]);

    // 2. Fetch or create a test Category
    const [existingCat] = await db.select().from(schema.Category).limit(1);
    if (existingCat) {
      categoryId = existingCat.category_id;
    } else {
      categoryId = generateCuid();
      await db.insert(schema.Category).values({
        category_id: categoryId,
        name: "UI/UX Design",
        category_name: "UI/UX Design",
        slug: "ui-ux",
      });
    }

    // 3. Create registrations: Reg A (initially unverified) and Reg B (referee)
    regAId = generateCuid();
    regBId = generateCuid();

    await db.insert(schema.Registration).values([
      {
        registration_id: regAId,
        user_id: userAId,
        category_id: categoryId,
        file_url: "https://drive.google.com/test-a",
        team_name: `Team Alpha ${Date.now()}`,
        is_verified: false, // unverified initially
        diamond: 0,
        xp: 0,
      },
      {
        registration_id: regBId,
        user_id: userBId,
        category_id: categoryId,
        file_url: "https://drive.google.com/test-b",
        team_name: `Team Beta ${Date.now()}`,
        is_verified: true,
        diamond: 0,
        xp: 0,
      },
    ]);
  });

  after(async () => {
    // Cleanup test data
    if (testReferralLogId) {
      await db.delete(schema.ReferralLog).where(eq(schema.ReferralLog.referral_log_id, testReferralLogId));
    }
    if (regAId) {
      await db.delete(schema.Registration).where(eq(schema.Registration.registration_id, regAId));
    }
    if (regBId) {
      await db.delete(schema.Registration).where(eq(schema.Registration.registration_id, regBId));
    }
    await db.delete(schema.User).where(eq(schema.User.users_id, userAId));
    await db.delete(schema.User).where(eq(schema.User.users_id, userBId));
    await db.delete(schema.User).where(eq(schema.User.users_id, adminId));
  });

  test("1. Unverified registration cannot generate referral code", async () => {
    await assert.rejects(
      async () => {
        await generateReferralCodeForRegistration(regAId, userAId, "USER");
      },
      (err) => {
        assert.match(err.message, /terverifikasi/i);
        return true;
      }
    );
  });

  test("2. Non-owner user cannot generate referral code", async () => {
    // Even if verified, userB cannot generate for regA
    await assert.rejects(
      async () => {
        await generateReferralCodeForRegistration(regAId, userBId, "USER");
      },
      (err) => {
        assert.match(err.message, /izin/i);
        return true;
      }
    );
  });

  test("3. Verified registration can generate referral code successfully", async () => {
    // Verify regA first
    await db
      .update(schema.Registration)
      .set({ is_verified: true })
      .where(eq(schema.Registration.registration_id, regAId));

    const result = await generateReferralCodeForRegistration(regAId, userAId, "USER");
    assert.ok(result.referral_code);
    assert.match(result.referral_code, /^MIA-[2-9A-HJ-NP-Z]{6}$/);
    assert.equal(result.already_exists, false);

    testReferralCode = result.referral_code;

    // Verify it is saved in DB
    const [saved] = await db
      .select({ referral_code: schema.Registration.referral_code })
      .from(schema.Registration)
      .where(eq(schema.Registration.registration_id, regAId));

    assert.equal(saved.referral_code, testReferralCode);
  });

  test("4. Repeated generate call returns the existing code (idempotent)", async () => {
    const result = await generateReferralCodeForRegistration(regAId, userAId, "USER");
    assert.equal(result.referral_code, testReferralCode);
    assert.equal(result.already_exists, true);
  });

  test("5. Referral validation rejects invalid, empty, or self codes", async () => {
    // Empty
    const r1 = await validateReferralCode("");
    assert.equal(r1.valid, false);

    // Non-existent
    const r2 = await validateReferralCode("MIA-ZZZZZZ");
    assert.equal(r2.valid, false);

    // Self-referral (userA using userA's code)
    const r3 = await validateReferralCode(testReferralCode, userAId);
    assert.equal(r3.valid, false);
    assert.match(r3.message, /sendiri/i);

    // Valid code from another user
    const r4 = await validateReferralCode(testReferralCode, userBId);
    assert.equal(r4.valid, true);
    assert.equal(r4.referral_code, testReferralCode);
    assert.equal(r4.referrer_registration_id, regAId);
  });

  test("6. Record referral on registration creates a PENDING referral log", async () => {
    const log = await recordReferralOnRegistration(regBId, testReferralCode, userBId);
    assert.ok(log);
    assert.ok(log.referral_log_id);
    testReferralLogId = log.referral_log_id;

    const [savedLog] = await db
      .select()
      .from(schema.ReferralLog)
      .where(eq(schema.ReferralLog.referral_log_id, testReferralLogId));

    assert.equal(savedLog.referral_code, testReferralCode);
    assert.equal(savedLog.referrer_registration_id, regAId);
    assert.equal(savedLog.referee_registration_id, regBId);
    assert.equal(savedLog.status, "PENDING");
    assert.equal(savedLog.referrer_xp, 250);
    assert.equal(savedLog.referee_xp, 100);
  });

  test("7. Repeated record referral for same referee returns existing log", async () => {
    const repeatLog = await recordReferralOnRegistration(regBId, testReferralCode, userBId);
    assert.equal(repeatLog.referral_log_id, testReferralLogId);
  });

  test("8. Admin review: approveReferralLog awards XP atomically", async () => {
    const result = await approveReferralLog(testReferralLogId, adminId, "Catatan validasi OK");
    assert.equal(result.status, "APPROVED");

    // Check log status in DB
    const [log] = await db
      .select()
      .from(schema.ReferralLog)
      .where(eq(schema.ReferralLog.referral_log_id, testReferralLogId));

    assert.equal(log.status, "APPROVED");
    assert.ok(log.verified_at);
    assert.equal(log.verified_by, adminId);
    assert.equal(log.admin_notes, "Catatan validasi OK");

    // Check XP on referrer (Reg A: +250 XP) and referee (Reg B: +100 XP)
    const [regA] = await db.select().from(schema.Registration).where(eq(schema.Registration.registration_id, regAId));
    const [regB] = await db.select().from(schema.Registration).where(eq(schema.Registration.registration_id, regBId));

    assert.equal(regA.xp, 250);
    assert.equal(regB.xp, 100);
  });

  test("9. Admin review: rejectReferralLog on approved log deducts XP atomically", async () => {
    const result = await rejectReferralLog(testReferralLogId, adminId, "Dibatalkan oleh panitia");
    assert.equal(result.status, "REJECTED");

    // Check log status
    const [log] = await db
      .select()
      .from(schema.ReferralLog)
      .where(eq(schema.ReferralLog.referral_log_id, testReferralLogId));

    assert.equal(log.status, "REJECTED");
    assert.equal(log.admin_notes, "Dibatalkan oleh panitia");

    // Check XP deducted back to 0
    const [regA] = await db.select().from(schema.Registration).where(eq(schema.Registration.registration_id, regAId));
    const [regB] = await db.select().from(schema.Registration).where(eq(schema.Registration.registration_id, regBId));

    assert.equal(regA.xp, 0);
    assert.equal(regB.xp, 0);
  });

  test("10. Admin query: getAllReferralLogs returns stats and list", async () => {
    const res = await getAllReferralLogs({ page: 1, limit: 10 });
    assert.ok(res.referrals);
    assert.ok(res.pagination);
    assert.ok(res.stats);
    assert.ok(res.stats.total >= 1);
  });
});
