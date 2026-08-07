import { Router } from "express";

import {
  getMySubmission,
  getPending,
  submitRiderVerification,
  submitSellerVerification,
} from "./verification.controller.js";

import {
  riderVerificationUpload,
  sellerVerificationUpload,
} from "../../middleware/upload.js";

import {
  pendingVerificationQueryValidation,
  validateVerificationRequest,
} from "./verification.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const verificationRouter = Router();

/*
 * SELLER VERIFICATION
 */
verificationRouter.post(
  "/seller",
  authenticate,
  authorize("seller"),
  sellerVerificationUpload.fields([
    {
      name: "validId",
      maxCount: 1,
    },
    {
      name: "dtiRegistration",
      maxCount: 1,
    },
    {
      name: "birDocument",
      maxCount: 1,
    },
    {
      name: "bankProof",
      maxCount: 1,
    },
    {
      name: "shopLogo",
      maxCount: 1,
    },
  ]),
  submitSellerVerification
);

/*
 * RIDER VERIFICATION
 */
verificationRouter.post(
  "/rider",
  authenticate,
  authorize("rider"),
  riderVerificationUpload.fields([
    {
      name: "driverLicense",
      maxCount: 1,
    },
    {
      name: "orcr",
      maxCount: 1,
    },
    {
      name: "policeClearance",
      maxCount: 1,
    },
  ]),
  submitRiderVerification
);

/*
 * SELLER / RIDER
 * View own verification submission
 */
verificationRouter.get(
  "/me",
  authenticate,
  authorize("seller", "rider"),
  getMySubmission
);

/*
 * ADMIN
 * View pending verification submissions
 *
 * Examples:
 * /api/v1/verification/pending
 * /api/v1/verification/pending?role=seller
 * /api/v1/verification/pending?role=rider
 */
verificationRouter.get(
  "/pending",
  authenticate,
  authorize("admin"),
  pendingVerificationQueryValidation,
  validateVerificationRequest,
  getPending
);

export default verificationRouter;