import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

/*
 * =========================================================
 * LEXICON-BASED SENTIMENT ANALYSIS (AFINN-165)
 * =========================================================
 *
 * Each word (or 2–3 word phrase) found in the AFINN
 * lexicon adds its score (-5 … +5). A negator ("not",
 * "never", "hindi", "di") just before a scored word flips
 * that word's sign.
 *
 *   score       = sum of matched word scores
 *   comparative = score / number of tokens
 *   label       = positive (score > 0), negative (< 0),
 *                 neutral (0 or no scored words)
 *
 * Reference: F. Å. Nielsen (2011), AFINN word list.
 * =========================================================
 */

const dataDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "data"
);

const readJson = (fileName) =>
  JSON.parse(fs.readFileSync(path.join(dataDirectory, fileName), "utf8"));

const LEXICON = {
  ...readJson("afinn-165.json"),
  ...readJson("filipino-extension.json"),
};

const NEGATORS = new Set([
  "not",
  "no",
  "never",
  "dont",
  "don't",
  "didnt",
  "didn't",
  "isnt",
  "isn't",
  "wasnt",
  "wasn't",
  "wont",
  "won't",
  "cant",
  "can't",
  "hindi",
  "di",
  "wala",
  "walang",
]);

const MAX_PHRASE_WORDS = 3;

export const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^[-']+|[-']+$/g, ""))
    .filter(Boolean);

export const analyzeSentiment = (text) => {
  const tokens = tokenize(text);
  const positiveWords = [];
  const negativeWords = [];
  let score = 0;

  for (let index = 0; index < tokens.length; ) {
    let matched = null;

    // Longest phrase first ("not good" is handled by negation).
    for (let size = MAX_PHRASE_WORDS; size >= 1; size -= 1) {
      if (index + size > tokens.length) {
        continue;
      }

      const phrase = tokens.slice(index, index + size).join(" ");

      if (Object.prototype.hasOwnProperty.call(LEXICON, phrase)) {
        matched = { phrase, size, value: LEXICON[phrase] };
        break;
      }
    }

    if (!matched) {
      index += 1;
      continue;
    }

    const previous = tokens[index - 1];
    const negated = previous && NEGATORS.has(previous);
    const value = negated ? -matched.value : matched.value;
    const label = negated ? `${previous} ${matched.phrase}` : matched.phrase;

    score += value;

    if (value > 0) {
      positiveWords.push(label);
    } else if (value < 0) {
      negativeWords.push(label);
    }

    index += matched.size;
  }

  const comparative = tokens.length ? score / tokens.length : 0;

  return {
    score,
    comparative: Number(comparative.toFixed(4)),
    label: score > 0 ? "positive" : score < 0 ? "negative" : "neutral",
    positiveWords,
    negativeWords,
    tokenCount: tokens.length,
  };
};

/*
 * Summary over many texts (e.g. all reviews of a shop).
 */
export const summarizeSentiment = (items, getText = (item) => item) => {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  const positiveTally = new Map();
  const negativeTally = new Map();
  let totalScore = 0;
  let analyzed = 0;

  const results = items.map((item) => {
    const text = getText(item);
    const result = analyzeSentiment(text);

    if (String(text || "").trim()) {
      analyzed += 1;
      totalScore += result.score;
      counts[result.label] += 1;

      result.positiveWords.forEach((word) =>
        positiveTally.set(word, (positiveTally.get(word) || 0) + 1)
      );
      result.negativeWords.forEach((word) =>
        negativeTally.set(word, (negativeTally.get(word) || 0) + 1)
      );
    }

    return { item, sentiment: result };
  });

  const top = (tally) =>
    [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

  return {
    analyzed,
    counts,
    averageScore: analyzed ? Number((totalScore / analyzed).toFixed(2)) : 0,
    positiveShare: analyzed ? Number(((counts.positive / analyzed) * 100).toFixed(1)) : 0,
    negativeShare: analyzed ? Number(((counts.negative / analyzed) * 100).toFixed(1)) : 0,
    topPositiveWords: top(positiveTally),
    topNegativeWords: top(negativeTally),
    results,
  };
};
