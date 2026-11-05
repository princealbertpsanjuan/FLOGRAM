/*
 * =========================================================
 * SECURITY RULES — SELF TEST
 * =========================================================
 *
 * npm run verify:security
 *
 * 1. Rate limiter: blocks after the limit, separate counters
 *    per email (people sharing one Wi-Fi are not blocked).
 * 2. Admin document review: approval needs every document
 *    accepted, high risk needs confirmation, decisions are
 *    added to the audit trail.
 *
 * No database is needed.
 * =========================================================
 */

import assert from "assert/strict";

import { rateLimit, resetRateLimits } from "../src/middleware/rateLimit.js";
import { applyReviewDecision, flaggedDocumentLabels } from "../src/modules/verification/verification-review.js";
import { isValidGmail } from "../src/utils/emailRules.js";

let passed = 0;
const test = (name, fn) => {
  resetRateLimits();
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const fakeResponse = () => {
  const res = { statusCode: 200, headers: {}, body: null };
  res.setHeader = (key, value) => {
    res.headers[key] = value;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const hit = (limiter, email, ip = "10.0.0.1") => {
  const res = fakeResponse();
  let allowed = false;
  limiter({ ip, baseUrl: "/api/v1/auth", path: "/login", body: { email } }, res, () => {
    allowed = true;
  });
  return { allowed, res };
};

test("rate limiter blocks after the limit with 429", () => {
  const limiter = rateLimit({ max: 3, keyBy: (req) => req.body.email });
  assert.ok(hit(limiter, "a@x.com").allowed);
  assert.ok(hit(limiter, "a@x.com").allowed);
  assert.ok(hit(limiter, "a@x.com").allowed);
  const blocked = hit(limiter, "a@x.com");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.ok(Number(blocked.res.headers["Retry-After"]) > 0);
});

test("other accounts on the same Wi-Fi are not blocked", () => {
  const limiter = rateLimit({ max: 1, keyBy: (req) => req.body.email });
  assert.ok(hit(limiter, "a@x.com").allowed);
  assert.equal(hit(limiter, "a@x.com").allowed, false);
  assert.ok(hit(limiter, "b@x.com").allowed);
});

test("email key is case-insensitive", () => {
  const limiter = rateLimit({ max: 1, keyBy: (req) => req.body.email });
  assert.ok(hit(limiter, "A@X.com").allowed);
  assert.equal(hit(limiter, "a@x.COM").allowed, false);
});

const sellerVerification = (riskLevel = "low") => ({
  role: "seller",
  riskLevel,
  documentReviews: [],
  history: [],
});

const allAccepted = ["validId", "dtiRegistration", "birDocument", "bankProof", "shopLogo"].map((documentKey) => ({
  documentKey,
  decision: "accepted",
}));

test("approval is refused until every document is accepted", () => {
  const verification = sellerVerification();
  assert.throws(
    () => applyReviewDecision(verification, { decision: "approved", reviews: allAccepted.slice(0, 4), adminId: "admin" }),
    /Shop logo/
  );
  assert.equal(verification.history.length, 0);
});

test("approval works when all are accepted and is logged", () => {
  const verification = sellerVerification();
  applyReviewDecision(verification, { decision: "approved", reviews: allAccepted, adminId: "admin" });
  assert.equal(verification.history.length, 1);
  assert.equal(verification.history[0].action, "approved");
});

test("high-risk approval needs explicit confirmation", () => {
  const verification = sellerVerification("high");
  assert.throws(
    () => applyReviewDecision(verification, { decision: "approved", reviews: allAccepted, adminId: "admin" }),
    /HIGH RISK/
  );
  applyReviewDecision(verification, { decision: "approved", reviews: allAccepted, adminId: "admin", riskAcknowledged: true });
  assert.equal(verification.history.length, 1);
});

test("rejection records which documents to resubmit", () => {
  const verification = sellerVerification();
  applyReviewDecision(verification, {
    decision: "rejected",
    reviews: [{ documentKey: "bankProof", decision: "needs_resubmission", note: "Name not visible" }, { documentKey: "fake", decision: "accepted" }],
    adminId: "admin",
    remarks: "Please fix",
  });
  assert.deepEqual(flaggedDocumentLabels(verification), ["Bank account proof"]);
  assert.equal(verification.documentReviews.length, 1, "unknown document keys are dropped");
});

test("only valid Gmail addresses can register", () => {
  for (const email of ["pasanjuan@gmail.com", "p.a.sanjuan@gmail.com", "PASanJuan@Gmail.com", "pasanjuan@googlemail.com"]) {
    assert.ok(isValidGmail(email), email);
  }
  for (const email of [
    "pasanjuan@adnu.edu.ph",
    "pasanjuan@gbox.adnu.edu.ph",
    "ab@gmail.com",
    "pa..sanjuan@gmail.com",
    ".pasanjuan@gmail.com",
    "pasanjuan+shop@gmail.com",
    "pa_sanjuan@gmail.com",
    "pasanjuan@gmail.co",
  ]) {
    assert.equal(isValidGmail(email), false, email);
  }
});

console.log(`\nSecurity checks: ${passed} passed.`);
