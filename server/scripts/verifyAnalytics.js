/*
 * =========================================================
 * ANALYTICS — SELF TEST (FP-Growth + AFINN sentiment)
 * =========================================================
 *
 * npm run verify:analytics
 *
 * 1. FP-Growth is compared against a brute-force count of
 *    every itemset, so the frequent itemsets must be exactly
 *    the same.
 * 2. Association rules: support, confidence and lift are
 *    checked by hand-computed values.
 * 3. AFINN-165 + Filipino extension: positive, negative,
 *    neutral, negation ("not good", "hindi maganda").
 *
 * No database is needed.
 * =========================================================
 */

import assert from "assert/strict";

import { associationRules, fpGrowth } from "../src/modules/analytics/fpgrowth.js";
import { analyzeSentiment, summarizeSentiment } from "../src/modules/analytics/sentiment.service.js";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

// Orders as sets of purchased items
const transactions = [
  ["Red Roses", "Chocolates", "Greeting Card"],
  ["Red Roses", "Chocolates"],
  ["Red Roses", "Teddy Bear"],
  ["Sunflowers", "Greeting Card"],
  ["Red Roses", "Chocolates", "Teddy Bear"],
  ["Tulips"],
  ["Red Roses", "Chocolates", "Greeting Card"],
  ["Sunflowers", "Chocolates"],
];

const bruteForce = (rows, minCount) => {
  const items = [...new Set(rows.flat())].sort();
  const result = new Map();

  for (let mask = 1; mask < 1 << items.length; mask += 1) {
    const candidate = items.filter((_, index) => mask & (1 << index));
    const count = rows.filter((row) => candidate.every((item) => row.includes(item))).length;
    if (count >= minCount) result.set(candidate.join("|"), count);
  }

  return result;
};

test("FP-Growth finds exactly the same itemsets as brute force", () => {
  for (const minCount of [1, 2, 3, 4]) {
    const { itemsets } = fpGrowth(transactions, { minCount });
    const expected = bruteForce(transactions, minCount);
    const actual = new Map(itemsets.map((itemset) => [itemset.items.join("|"), itemset.count]));
    assert.deepEqual(actual, expected, `minCount ${minCount}`);
  }
});

test("support is count / transactions", () => {
  const { itemsets, transactionCount } = fpGrowth(transactions, { minCount: 2 });
  const pair = itemsets.find((itemset) => itemset.items.join("|") === "Chocolates|Red Roses");
  assert.equal(transactionCount, 8);
  assert.equal(pair.count, 4);
  assert.equal(pair.support, 0.5);
});

test("association rule Red Roses → Chocolates has the right confidence and lift", () => {
  const result = fpGrowth(transactions, { minCount: 2 });
  const rules = associationRules(result, { minConfidence: 0 });
  const rule = rules.find(
    (item) => item.antecedent.join() === "Red Roses" && item.consequent.join() === "Chocolates"
  );

  // Red Roses in 5 orders, together with Chocolates in 4 → 0.8
  assert.equal(rule.confidence, 0.8);
  // Chocolates support = 5/8 → lift = 0.8 / 0.625 = 1.28
  assert.equal(rule.lift, 1.28);
});

test("minConfidence filters weak rules", () => {
  const rules = associationRules(fpGrowth(transactions, { minCount: 2 }), { minConfidence: 0.9 });
  assert.ok(rules.every((rule) => rule.confidence >= 0.9));
});

test("empty and duplicate items are ignored", () => {
  const { transactionCount, itemsets } = fpGrowth([[], ["A", "A", null], ["A"]], { minCount: 2 });
  assert.equal(transactionCount, 2);
  assert.deepEqual(itemsets, [{ items: ["A"], count: 2, support: 1 }]);
});

test("AFINN: positive, negative and neutral reviews", () => {
  assert.equal(analyzeSentiment("The bouquet was beautiful and the delivery was fast, thank you!").label, "positive");
  assert.equal(analyzeSentiment("Terrible service, the flowers were dead and late").label, "negative");
  assert.equal(analyzeSentiment("The order arrived on Tuesday").label, "neutral");
});

test("AFINN: negation flips the score", () => {
  assert.ok(analyzeSentiment("good").score > 0);
  assert.ok(analyzeSentiment("not good").score < 0);
});

test("Filipino / Taglish words are scored", () => {
  assert.equal(analyzeSentiment("Ang ganda ng bouquet!").label, "positive");
  assert.ok(analyzeSentiment("hindi maganda").score < 0);
});

test("summary counts labels", () => {
  const summary = summarizeSentiment(["great flowers", "awful", "okay lang", ""]);
  const counts = summary.counts || summary;
  assert.ok(counts.positive >= 1);
  assert.ok(counts.negative >= 1);
});

console.log(`\nAnalytics checks: ${passed} passed.`);
