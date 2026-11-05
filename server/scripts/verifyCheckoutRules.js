/*
 * =========================================================
 * CHECKOUT RULES — SELF TEST
 * =========================================================
 *
 * npm run verify:checkout
 *
 * Scheduled (pre-order) delivery dates, checked in
 * Philippine time. Before this fix, choosing TODAY failed
 * every afternoon because the app sends "today 12:00 noon"
 * and the server required that moment to be in the future.
 * =========================================================
 */

import assert from "assert/strict";

import { getScheduleProblem, toManilaDay } from "../src/utils/deliverySchedule.js";
import { isOnlinePaymentEnabled } from "../src/utils/paymentSettings.js";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

// 3:00 PM in Manila on 27 Nov 2026 (07:00 UTC)
const afternoon = new Date("2026-11-27T07:00:00Z");
const todayNoon = new Date("2026-11-27T12:00:00+08:00");

test("same-day schedule chosen in the afternoon is accepted", () => {
  assert.equal(getScheduleProblem(todayNoon, null, afternoon), null);
});

test("yesterday is refused", () => {
  assert.match(getScheduleProblem(new Date("2026-11-26T12:00:00+08:00"), null, afternoon), /today or a future/);
});

test("today with a time window that already ended is refused", () => {
  assert.match(getScheduleProblem(todayNoon, "14:00", afternoon), /already passed/);
});

test("today with a later time window is accepted", () => {
  assert.equal(getScheduleProblem(todayNoon, "18:00", afternoon), null);
});

test("tomorrow morning window is accepted", () => {
  assert.equal(getScheduleProblem(new Date("2026-11-28T12:00:00+08:00"), "09:00", afternoon), null);
});

test("Manila day is used even when the server runs in UTC", () => {
  // 11:30 PM Manila is still 27 Nov there, but already 15:30 UTC
  assert.equal(toManilaDay(new Date("2026-11-27T15:30:00Z")), "2026-11-27");
  assert.equal(getScheduleProblem(new Date("2026-11-27T04:00:00Z"), null, new Date("2026-11-27T15:30:00Z")), null);
});

test("invalid date is reported", () => {
  assert.match(getScheduleProblem("not a date"), /invalid/);
});

test("online payment switch: on by default, off only with false", () => {
  const original = process.env.ONLINE_PAYMENTS_ENABLED;
  delete process.env.ONLINE_PAYMENTS_ENABLED;
  assert.equal(isOnlinePaymentEnabled(), true);
  process.env.ONLINE_PAYMENTS_ENABLED = "false";
  assert.equal(isOnlinePaymentEnabled(), false);
  process.env.ONLINE_PAYMENTS_ENABLED = " FALSE ";
  assert.equal(isOnlinePaymentEnabled(), false);
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  assert.equal(isOnlinePaymentEnabled(), true);
  if (original === undefined) delete process.env.ONLINE_PAYMENTS_ENABLED;
  else process.env.ONLINE_PAYMENTS_ENABLED = original;
});

console.log(`\nCheckout rule checks: ${passed} passed.`);
