import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/db/index.js";
import { sql } from "drizzle-orm";

describe("Database Health & Integrity Suite", () => {
  after(async () => {
    if (db.$client && typeof db.$client.end === "function") {
      await db.$client.end();
    }
  });

  test("PostgreSQL connection pool should execute query ping successfully", async () => {
    const result = await db.execute(sql`SELECT 1 AS connected;`);
    assert.ok(result);
    const rows = result.rows || result;
    assert.equal(Number(rows[0].connected), 1);
  });

  test("Database timezone should be set to UTC", async () => {
    const result = await db.execute(sql`SHOW timezone;`);
    const rows = result.rows || result;
    const tz = rows[0]?.TimeZone || rows[0]?.timezone;
    assert.equal(tz?.toUpperCase(), "UTC");
  });
});
