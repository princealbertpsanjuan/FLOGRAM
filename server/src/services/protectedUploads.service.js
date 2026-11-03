import crypto from "crypto";

import Florist from "../modules/florists/florist.model.js";

/*
 * =========================================================
 * PROTECTED VERIFICATION FILES
 * =========================================================
 *
 * Seller and Rider requirement documents (IDs, DTI, BIR,
 * bank proof, license, OR/CR, police clearance) are under
 * /uploads/verification/. They are NOT public:
 *
 *  - The API gives Admin (and the owner) a signed link:
 *      /uploads/verification/...?exp=<unix>&sig=<hmac>
 *  - The link stops working after 15 minutes.
 *  - Any other request to /uploads/verification/ gets 403,
 *    including guessed file names.
 *
 * Exception: an approved shop's logo is public (customers
 * see it), so a path stored as a Florist.shopLogo is
 * allowed without a signature.
 * =========================================================
 */

const LINK_LIFETIME_SECONDS = 15 * 60;
const PROTECTED_PREFIX = "/verification/";

// JWT_SECRET is required at startup (server.js), so a signing secret always exists
const secret = () => process.env.UPLOAD_SIGNING_SECRET || process.env.JWT_SECRET;

const toUploadsPath = (value) =>
  `/${String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "")}`;

const sign = (relativePath, exp) =>
  crypto
    .createHmac("sha256", secret())
    .update(`${relativePath}:${exp}`)
    .digest("hex");

/*
 * "uploads/verification/sellers/a.png" ->
 * "/uploads/verification/sellers/a.png?exp=...&sig=..."
 */
export const signUploadPath = (storedPath) => {
  if (!storedPath) return storedPath;

  const relative = toUploadsPath(storedPath);

  if (!relative.startsWith(PROTECTED_PREFIX)) {
    return `/uploads${relative}`;
  }

  const exp = Math.floor(Date.now() / 1000) + LINK_LIFETIME_SECONDS;
  return `/uploads${relative}?exp=${exp}&sig=${sign(relative, exp)}`;
};

export const isValidSignature = (relativePath, exp, sig) => {
  const expiry = Number(exp);

  if (!Number.isFinite(expiry) || expiry < Math.floor(Date.now() / 1000) || !sig) {
    return false;
  }

  const expected = Buffer.from(sign(relativePath, expiry), "hex");
  const given = Buffer.from(String(sig), "hex");

  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

/*
 * Mounted on "/uploads" BEFORE express.static and the
 * Cloudinary fallback.
 */
export const protectVerificationUploads = async (req, res, next) => {
  let relative;

  try {
    relative = decodeURIComponent(req.path);
  } catch {
    return res.status(400).end();
  }

  // Block "..", encoded slashes, etc.
  relative = toUploadsPath(relative).replace(/\/{2,}/g, "/");

  if (relative.includes("..")) {
    return res.status(400).end();
  }

  if (!relative.startsWith(PROTECTED_PREFIX)) {
    return next();
  }

  if (isValidSignature(relative, req.query.exp, req.query.sig)) {
    res.setHeader("Cache-Control", "private, no-store");
    return next();
  }

  try {
    const isPublicLogo = await Florist.exists({
      shopLogo: { $in: [`/uploads${relative}`, `uploads${relative}`, relative] },
    });

    if (isPublicLogo) {
      return next();
    }
  } catch {
    // fall through to 403
  }

  return res.status(403).json({
    success: false,
    message: "This verification document is private.",
  });
};
