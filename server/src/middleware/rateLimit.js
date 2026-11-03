/*
 * =========================================================
 * SIMPLE IN-MEMORY RATE LIMITER
 * =========================================================
 *
 * Slows down password guessing and reset-code guessing on
 * the public auth endpoints. One counter per IP + route,
 * reset every `windowMs`. Good enough for one server
 * instance (Render free plan); use a shared store such as
 * Redis if the API ever runs on several instances.
 *
 * Render sits behind a proxy, so app.js sets
 * "trust proxy" and req.ip is the real client address.
 * =========================================================
 */

const buckets = new Map();

// Drop old counters so memory never grows without limit
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60 * 1000);
sweep.unref?.();

export const rateLimit = ({
  windowMs = 15 * 60 * 1000,
  max = 20,
  message = "Too many attempts. Please wait a few minutes and try again.",
  keyPrefix = "",
  // Extra key part, e.g. the email, so people sharing one
  // school Wi-Fi (same IP) do not block each other
  keyBy = null,
} = {}) =>
  (req, res, next) => {
    if (process.env.RATE_LIMIT === "off") return next();

    const now = Date.now();
    const extra = keyBy ? String(keyBy(req) || "").toLowerCase().slice(0, 200) : "";
    const key = `${keyPrefix || req.baseUrl + req.path}|${req.ip}|${extra}`;
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(max - bucket.count, 0)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }

    return next();
  };

export const resetRateLimits = () => buckets.clear();
