import Verification from "./verification.model.js";
import User from "../auth/auth.model.js";
import Florist from "../florists/florist.model.js";
import Rider from "../riders/rider.model.js";
import fs from "fs/promises";
import { notifyAdmins } from "../notifications/notify-helpers.js";
import {
  RIDER_REQUIREMENTS,
  SELLER_REQUIREMENTS,
  evaluateRequirements,
  formatTin,
  inspectFile,
  normalizeDti,
} from "./requirement-checks.js";

/*
 * Convert absolute Windows/Linux upload paths into paths
 * relative to the server project.
 *
 * Example:
 * C:\Projects\FLOGRAM\server\uploads\verification\riders\file.png
 *
 * becomes:
 * uploads/verification/riders/file.png
 */
const normalizePath = (filePath) => {
  return filePath
    .replace(process.cwd(), "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
};

/*
 * =========================================================
 * SHARED SUBMISSION FLOW (Seller + Rider)
 * =========================================================
 *
 * 1. Every required file must be present.
 * 2. Automated checks run (requirement-checks.js).
 *    Any "fail" -> files are deleted and the user is told
 *    exactly what to fix (HTTP 422, nothing is saved).
 * 3. Otherwise the submission is saved with its checks,
 *    fingerprints and risk level, an audit-trail entry is
 *    added and Admin is notified.
 * =========================================================
 */

const removeUploadedFiles = async (files) => {
  const list = Object.values(files || {}).flat();
  await Promise.all(list.map((file) => fs.unlink(file.path).catch(() => {})));
};

const requirementError = (message, checks = []) => {
  const error = new Error(message);
  error.statusCode = 422;
  error.errors = checks.map((check) => ({
    field: check.documentKey,
    message: `${check.label}: ${check.message}`,
  }));
  return error;
};

const runSubmission = async ({ userId, files, body, role }) => {
  const requirements = role === "seller" ? SELLER_REQUIREMENTS : RIDER_REQUIREMENTS;

  try {
    const missing = requirements.filter(({ key }) => !files?.[key]?.[0]?.path);
    if (missing.length) {
      throw requirementError(
        `Missing requirements: ${missing.map((item) => item.label).join(", ")}.`
      );
    }

    const fingerprints = {};
    for (const { key } of requirements) {
      fingerprints[key] = await inspectFile(files[key][0]);
    }

    const hashes = Object.values(fingerprints).map((info) => info.sha256);
    const otherRecords = await Verification.find({
      user: { $ne: userId },
      "fingerprints.sha256": { $in: hashes },
    })
      .select("role fingerprints")
      .lean();

    const others = otherRecords.flatMap((record) =>
      (record.fingerprints || []).map((print) => ({ sha256: print.sha256, role: record.role }))
    );

    const details = role === "seller"
      ? {
          dtiNumber: body?.dtiNumber,
          tinNumber: body?.tinNumber,
          validIdType: body?.validIdType,
          validIdExpiry: body?.validIdExpiry,
        }
      : {
          licenseExpiry: body?.licenseExpiry,
          policeClearanceIssuedAt: body?.policeClearanceIssuedAt,
        };

    const result = evaluateRequirements({ role, fingerprints, details, others });

    if (result.failures.length) {
      throw requirementError(
        `Please fix ${result.failures.length} requirement issue${result.failures.length > 1 ? "s" : ""} before submitting.`,
        result.failures
      );
    }

    const paths = Object.fromEntries(
      requirements.map(({ key }) => [key, normalizePath(files[key][0].path)])
    );

    return { paths, fingerprints, details, result };
  } catch (error) {
    await removeUploadedFiles(files);
    throw error;
  }
};

const saveSubmission = async ({ user, role, paths, fingerprints, details, result }) => {
  const existing = await Verification.findOne({ user: user._id });

  const verification = existing || new Verification({ user: user._id, role });

  verification.role = role;

  if (role === "seller") {
    verification.sellerDocuments = paths;
    verification.sellerDetails = {
      dtiNumber: normalizeDti(details.dtiNumber),
      tinNumber: formatTin(details.tinNumber),
      validIdType: details.validIdType,
      validIdExpiry: details.validIdExpiry || null,
    };
  } else {
    verification.riderDocuments = paths;
    verification.riderDetails = {
      licenseExpiry: details.licenseExpiry,
      policeClearanceIssuedAt: details.policeClearanceIssuedAt,
    };
  }

  verification.fingerprints = Object.entries(fingerprints).map(([documentKey, info]) => ({
    documentKey,
    ...info,
  }));
  verification.automatedChecks = result.checks;
  verification.riskLevel = result.riskLevel;
  verification.documentReviews = [];
  verification.status = "pending";
  verification.remarks = "";
  verification.reviewedBy = null;
  verification.reviewedAt = null;
  verification.history.push({
    action: existing ? "resubmitted" : "submitted",
    by: user._id,
    riskLevel: result.riskLevel,
  });

  await verification.save();
  return verification;
};

const riskSuffix = (riskLevel, warnings) =>
  riskLevel === "low"
    ? " All automated checks passed."
    : ` Risk: ${riskLevel.toUpperCase()} (${warnings.length} warning${warnings.length === 1 ? "" : "s"}).`;

/*
 * RIDER VERIFICATION
 */
export const saveRiderVerification = async (
  userId,
  files,
  body = {}
) => {
  const user = await User.findById(userId);

  if (!user) {
    await removeUploadedFiles(files);
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "rider") {
    await removeUploadedFiles(files);
    const error = new Error("Only rider accounts can submit rider verification documents.");
    error.statusCode = 403;
    throw error;
  }

  const riderProfile = await Rider.findOne({ owner: userId });

  if (!riderProfile) {
    await removeUploadedFiles(files);
    const error = new Error("Complete your rider details before uploading documents.");
    error.statusCode = 400;
    throw error;
  }

  if (riderProfile.verificationStatus === "approved") {
    await removeUploadedFiles(files);
    const error = new Error("Your account is already approved.");
    error.statusCode = 409;
    throw error;
  }

  const prepared = await runSubmission({ userId, files, body, role: "rider" });
  const verification = await saveSubmission({ user, role: "rider", ...prepared });

  user.verificationStatus = "pending";
  await user.save();

  /*
   * A resubmission after rejection goes back to the
   * Admin queue.
   */
  riderProfile.verificationStatus = "pending";
  riderProfile.verificationRemarks = "";
  await riderProfile.save();

  await notifyAdmins({
    type: "verification_submitted",
    title: "Rider application submitted",
    message: `${user.firstName} ${user.lastName} uploaded rider requirements for review.${riskSuffix(prepared.result.riskLevel, prepared.result.warnings)}`,
    metadata: { screen: "rider-verification", userId: String(user._id), riskLevel: prepared.result.riskLevel },
  });

  return verification;
};

/*
 * SELLER VERIFICATION
 */
export const saveSellerVerification = async (
  userId,
  files,
  body = {}
) => {
  const user = await User.findById(userId);

  if (!user) {
    await removeUploadedFiles(files);
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "seller") {
    await removeUploadedFiles(files);
    const error = new Error("Only seller accounts can submit seller verification documents.");
    error.statusCode = 403;
    throw error;
  }

  const floristProfile = await Florist.findOne({ owner: userId });

  if (!floristProfile) {
    await removeUploadedFiles(files);
    const error = new Error("Complete your shop details before uploading documents.");
    error.statusCode = 400;
    throw error;
  }

  if (floristProfile.verificationStatus === "approved") {
    await removeUploadedFiles(files);
    const error = new Error("Your account is already approved.");
    error.statusCode = 409;
    throw error;
  }

  const prepared = await runSubmission({ userId, files, body, role: "seller" });
  const verification = await saveSubmission({ user, role: "seller", ...prepared });

  user.verificationStatus = "pending";
  await user.save();

  floristProfile.verificationStatus = "pending";
  floristProfile.verificationRemarks = "";
  floristProfile.isActive = true;
  floristProfile.shopLogo = floristProfile.shopLogo || `/${prepared.paths.shopLogo}`;
  await floristProfile.save();

  await notifyAdmins({
    type: "verification_submitted",
    title: "Seller application submitted",
    message: `${user.firstName} ${user.lastName} (${floristProfile.shopName}) uploaded seller requirements for review.${riskSuffix(prepared.result.riskLevel, prepared.result.warnings)}`,
    metadata: { screen: "seller-verification", userId: String(user._id), riskLevel: prepared.result.riskLevel },
  });

  return verification;
};

/*
 * GET CURRENT USER'S VERIFICATION
 */
export const getMyVerification = async (
  userId
) => {
  const verification =
    await Verification.findOne({
      user: userId,
    }).populate(
      "reviewedBy",
      "firstName lastName email"
    );

  if (!verification) {
    const error = new Error(
      "Verification submission was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  /*
   * Fingerprints stay server-side; the applicant gets the
   * automated results and which documents Admin flagged.
   */
  const plain = verification.toObject();
  delete plain.fingerprints;

  return {
    ...plain,
    flaggedDocuments: (plain.documentReviews || [])
      .filter((review) => review.decision === "needs_resubmission")
      .map((review) => review.documentKey),
  };
};

/*
 * ADMIN: GET PENDING VERIFICATIONS
 *
 * role can optionally be:
 * seller
 * rider
 */
export const getPendingVerifications = async (
  role
) => {
  const filter = {
    status: "pending",
  };

  if (role) {
    filter.role = role;
  }

  return Verification.find(filter)
    .populate(
      "user",
      "firstName lastName email phoneNumber role verificationStatus"
    )
    .sort({
      createdAt: 1,
    });
};