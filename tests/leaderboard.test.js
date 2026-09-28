import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { generateCuid } from "../src/db/cuid.js";
import { getLeaderboardByCategory } from "../src/controllers/gamification.controller.js";

describe("Leaderboard Controller Ranking with Search", () => {
  let categoryId;
  let createdCategory = false;
  let userIds = [];
  let regIds = [];

  before(async () => {
    const [existingCat] = await db.select().from(schema.Category).limit(1);
    if (existingCat) {
      categoryId = existingCat.category_id;
    } else {
      const adminUId = generateCuid();
      userIds.push(adminUId);
      await db.insert(schema.User).values({
        users_id: adminUId,
        email: `admin_${adminUId}@mia.test`,
        name: "Admin Cat",
        password: "hashpassword123",
        role: "ADMIN",
        is_verified: true,
      });

      categoryId = generateCuid();
      createdCategory = true;
      await db.insert(schema.Category).values({
        category_id: categoryId,
        user_id: adminUId,
        name: "Leaderboard Test Cat",
        organizer: "Panitia MIA",
        description: "Test Description",
        image: "https://example.com/img.jpg",
        status: "VERIFIED",
        slug: `lb-test-${Date.now()}`,
      });
    }

    // Create 3 teams with distinct XP:
    // Team 1: 500 XP
    // Team 2: 300 XP
    // Team 3: 100 XP ("TargetSearchTeam")
    const teamsData = [
      { name: "Alpha Leader Test", xp: 500, diamond: 50 },
      { name: "Beta Runner Test", xp: 300, diamond: 30 },
      { name: "TargetSearchTeam Test", xp: 100, diamond: 10 },
    ];

    for (const t of teamsData) {
      const uId = generateCuid();
      const rId = generateCuid();
      userIds.push(uId);
      regIds.push(rId);

      await db.insert(schema.User).values({
        users_id: uId,
        email: `lb_${uId}@mia.test`,
        name: `User ${t.name}`,
        password: "hashpassword123",
        role: "USER",
        is_verified: true,
      });

      await db.insert(schema.Registration).values({
        registration_id: rId,
        user_id: uId,
        category_id: categoryId,
        file_url: "https://drive.google.com/test",
        team_name: t.name,
        is_verified: true,
        xp: t.xp,
        diamond: t.diamond,
      });
    }
  });

  after(async () => {
    if (regIds.length > 0) {
      await db.delete(schema.Registration).where(inArray(schema.Registration.registration_id, regIds));
    }
    if (userIds.length > 0) {
      await db.delete(schema.User).where(inArray(schema.User.users_id, userIds));
    }
    if (createdCategory && categoryId) {
      await db.delete(schema.Category).where(eq(schema.Category.category_id, categoryId));
    }
  });

  test("Leaderboard without search returns ranks in correct ascending order", async () => {
    let capturedRes = null;
    const req = {
      params: { category_id: categoryId },
      query: { page: 1, limit: 10 },
    };
    const res = {
      status(code) {
        return this;
      },
      json(payload) {
        capturedRes = payload;
        return this;
      },
    };

    await getLeaderboardByCategory(req, res);

    assert.ok(capturedRes);
    assert.equal(capturedRes.status, true);
    const { leaderboard, meta } = capturedRes.data;

    assert.ok(leaderboard.length >= 3);
    for (let i = 0; i < leaderboard.length; i++) {
      assert.equal(leaderboard[i].rank, i + 1);
    }
  });

  test("Leaderboard WITH search preserves actual category rank (NOT #1)", async () => {
    let capturedRes = null;
    const req = {
      params: { category_id: categoryId },
      query: { page: 1, limit: 10, search: "TargetSearchTeam Test" },
    };
    const res = {
      status(code) {
        return this;
      },
      json(payload) {
        capturedRes = payload;
        return this;
      },
    };

    await getLeaderboardByCategory(req, res);

    assert.ok(capturedRes);
    assert.equal(capturedRes.status, true);
    const { leaderboard, meta } = capturedRes.data;

    assert.equal(leaderboard.length, 1);
    assert.equal(leaderboard[0].team_name, "TargetSearchTeam Test");
    // Crucial assertion: rank must NOT be #1 because Alpha Leader Test (500 XP) and Beta Runner Test (300 XP) are above it (100 XP)
    assert.ok(leaderboard[0].rank > 1, `Searched team rank was ${leaderboard[0].rank}, expected > 1`);
    assert.equal(meta.total, 1);
  });
});
