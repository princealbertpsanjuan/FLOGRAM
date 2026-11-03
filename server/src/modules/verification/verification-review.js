import {
  RIDER_REQUIREMENTS,
  SELLER_REQUIREMENTS,
} from "./requirement-checks.js";

/*
 * =========================================================
 * ADMIN DOCUMENT REVIEW
 * =========================================================
 *
 * Approve: Admin must mark EVERY uploaded document as
 * "accepted". A high-risk submission (reused document,
 * several warnings) also needs riskAcknowledged = true.
 *
 * Reject: Admin may mark which documents need to be
 * resubmitted; the applicant sees them highlighted.
 *
 * Both decisions are written to the audit trail.
 * =========================================================
 */

const reviewError = (message) => {
  const error = new Error(message);
  error.statusCode = 422;
  return error;
};

const cleanReviews = (reviews, requirements) => {
  const keys = new Set(requirements.map((item) => item.key));

  return (Array.isArray(reviews) ? reviews : [])
    .filter((review) => keys.has(review?.documentKey))
    .map((review) => ({
      documentKey: review.documentKey,
      decision: review.decision === "accepted" ? "accepted" : "needs_resubmission",
      note: String(review.note || "").trim().slice(0, 300),
    }));
};

export const applyReviewDecision = (
  verification,
  { decision, reviews, adminId, remarks = "", riskAcknowledged = false }
) => {
  const requirements = verification.role === "seller" ? SELLER_REQUIREMENTS : RIDER_REQUIREMENTS;
  const cleaned = cleanReviews(reviews, requirements);
  const byKey = new Map(cleaned.map((review) => [review.documentKey, review]));

  if (decision === "approved") {
    const notAccepted = requirements.filter(
      ({ key }) => byKey.get(key)?.decision !== "accepted"
    );

    if (notAccepted.length) {
      throw reviewError(
        `Check every document before approving. Not yet accepted: ${notAccepted
          .map((item) => item.label)
          .join(", ")}.`
      );
    }

    if (verification.riskLevel === "high" && !riskAcknowledged) {
      throw reviewError(
        "This application is HIGH RISK. Review the automated warnings and confirm before approving."
      );
    }
  }

  verification.documentReviews = cleaned;
  verification.history.push({
    action: decision,
    by: adminId,
    at: new Date(),
    remarks: String(remarks || "").slice(0, 500),
    riskLevel: verification.riskLevel || "",
  });
};

/*
 * Labels of documents the Admin asked to resubmit.
 */
export const flaggedDocumentLabels = (verification) => {
  const requirements = verification.role === "seller" ? SELLER_REQUIREMENTS : RIDER_REQUIREMENTS;
  const flagged = new Set(
    (verification.documentReviews || [])
      .filter((review) => review.decision === "needs_resubmission")
      .map((review) => review.documentKey)
  );

  return requirements.filter(({ key }) => flagged.has(key)).map(({ label }) => label);
};
