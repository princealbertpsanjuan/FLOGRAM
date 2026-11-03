/*
 * =========================================================
 * ROUTING / DELIVERY FEE — SELF TEST
 * =========================================================
 *
 * npm run verify:routing
 *
 * Replaces fetch with a fake OpenRouteService so no API key
 * or internet is needed. Checks the fee rules, the route
 * cache, the timeout/quota fallback that keeps checkout
 * working, and the 25 km service-area limit.
 * =========================================================
 */

import assert from "assert/strict";

process.env.OPENROUTESERVICE_API_KEY = "test-key";
process.env.ROUTING_TIMEOUT_MS = "1000";

const {
  calculateDeliveryFee,
  calculateDeliveryRoute,
  clearRouteCache,
  haversineMeters,
} = await import("../src/services/routing.service.js");

// Naga City: Plaza Rizal -> Ateneo de Naga (about 1.5 km)
const PLAZA = { pickupLatitude: 13.6236, pickupLongitude: 123.1862 };
const ATENEO = { deliveryLatitude: 13.6301, deliveryLongitude: 123.1946 };

let calls = 0;
let mode = "ok";

globalThis.fetch = async (url, options) => {
  calls += 1;

  if (mode === "quota") {
    return { ok: false, status: 429, json: async () => ({ error: "Rate Limit Exceeded" }) };
  }

  if (mode === "down") {
    throw new TypeError("fetch failed");
  }

  if (mode === "slow") {
    // A real socket keeps Node running while it waits
    const keepAlive = setInterval(() => {}, 100);
    await new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "TimeoutError" }))
      );
    }).finally(() => clearInterval(keepAlive));
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({
      features: [{ properties: { summary: { distance: 4200, duration: 600 } }, geometry: { type: "LineString", coordinates: [] } }],
    }),
  };
};

let passed = 0;
const test = async (name, fn) => {
  clearRouteCache();
  calls = 0;
  mode = "ok";
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

await test("fee: ₱50 up to 3 km, +₱12 per started km after", async () => {
  assert.equal(calculateDeliveryFee(0), 50);
  assert.equal(calculateDeliveryFee(3000), 50);
  assert.equal(calculateDeliveryFee(3200), 62);
  assert.equal(calculateDeliveryFee(4100), 74);
  assert.throws(() => calculateDeliveryFee(26000), /outside the 25 km/);
  assert.throws(() => calculateDeliveryFee(-1), /invalid/);
});

await test("uses OpenRouteService when it answers", async () => {
  const route = await calculateDeliveryRoute({ ...PLAZA, ...ATENEO });
  assert.equal(route.distanceMeters, 4200);
  assert.equal(route.deliveryFee, 74);
  assert.equal(route.estimated, false);
});

await test("same route is cached (no second API call)", async () => {
  await calculateDeliveryRoute({ ...PLAZA, ...ATENEO });
  await calculateDeliveryRoute({ ...PLAZA, ...ATENEO });
  assert.equal(calls, 1);
});

await test("quota exceeded (429) falls back to an estimate", async () => {
  mode = "quota";
  const route = await calculateDeliveryRoute({ ...PLAZA, ...ATENEO });
  assert.equal(route.estimated, true);
  assert.ok(route.deliveryFee >= 50);
});

await test("network down falls back to an estimate", async () => {
  mode = "down";
  const route = await calculateDeliveryRoute({ ...PLAZA, ...ATENEO });
  assert.equal(route.estimated, true);
});

await test("slow API times out and falls back", async () => {
  mode = "slow";
  const started = Date.now();
  const route = await calculateDeliveryRoute({ ...PLAZA, ...ATENEO });
  assert.equal(route.estimated, true);
  assert.ok(Date.now() - started < 3000);
});

await test("estimate still enforces the 25 km service area", async () => {
  mode = "down";
  await assert.rejects(
    calculateDeliveryRoute({ ...PLAZA, deliveryLatitude: 14.5995, deliveryLongitude: 120.9842 }),
    /outside the 25 km/
  );
});

await test("invalid coordinates are rejected", async () => {
  await assert.rejects(
    calculateDeliveryRoute({ ...PLAZA, deliveryLatitude: 95, deliveryLongitude: 0 }),
    /latitude/
  );
});

await test("haversine distance is about right", async () => {
  const meters = haversineMeters({ latitude: 13.6236, longitude: 123.1862 }, { latitude: 13.6301, longitude: 123.1946 });
  assert.ok(meters > 1000 && meters < 1500, String(meters));
});

console.log(`\nRouting checks: ${passed} passed.`);
