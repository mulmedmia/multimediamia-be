import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as schema from "../src/db/schema.js";
import {
  redeemProduct,
  getAllRedeemUser,
  getMyRedeem,
} from "../src/services/gamification.service.js";
import {
  getAllRedeemUserController,
  getMyRedeemController,
  redeemProductController,
} from "../src/controllers/gamification.controller.js";

describe("Redemption Registration Linking Suite", () => {
  test("1. Schema columns verification for Redemption table", () => {
    const redemptionColumns = Object.keys(schema.Redemption);
    assert.equal(
      redemptionColumns.includes("registration_id"),
      true,
      "Redemption must have registration_id"
    );
    assert.equal(
      redemptionColumns.includes("user_id"),
      false,
      "Redemption must not have user_id"
    );
    assert.equal(
      redemptionColumns.includes("redemption_id"),
      true,
      "Redemption must have redemption_id"
    );
    assert.equal(
      redemptionColumns.includes("product_id"),
      true,
      "Redemption must have product_id"
    );
    assert.equal(
      redemptionColumns.includes("points_used"),
      true,
      "Redemption must have points_used"
    );
    assert.equal(
      redemptionColumns.includes("quantity"),
      true,
      "Redemption must have quantity"
    );
  });

  test("2. Service functions should be properly defined and exported", () => {
    assert.equal(typeof redeemProduct, "function");
    assert.equal(typeof getAllRedeemUser, "function");
    assert.equal(typeof getMyRedeem, "function");
  });

  test("3. Controller functions should be properly defined and exported", () => {
    assert.equal(typeof redeemProductController, "function");
    assert.equal(typeof getAllRedeemUserController, "function");
    assert.equal(typeof getMyRedeemController, "function");
  });
});
