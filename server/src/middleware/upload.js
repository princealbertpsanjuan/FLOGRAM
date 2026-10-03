import multer from "multer";
import path from "path";
import fs from "fs";

import {
  getSafeExtension,
  imageFileFilter,
  imageOrPdfFileFilter,
} from "../utils/uploadFileTypes.js";

const createStorage = (folders) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(
        process.cwd(),
        "uploads",
        ...folders
      );

      fs.mkdirSync(uploadPath, {
        recursive: true,
      });

      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const uniqueName =
        Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        getSafeExtension(file);

      cb(null, uniqueName);
    },
  });

/*
 * =========================================================
 * GENERAL FILE FILTER
 * =========================================================
 *
 * Used for:
 *
 * - seller verification
 * - rider verification
 * - flower images
 * - BloomBoard images
 *
 * Verification modules may require PDF,
 * which is why PDF remains allowed here.
 * =========================================================
 */

const fileFilter = imageOrPdfFileFilter;

/*
 * =========================================================
 * IMAGE-ONLY FILE FILTER
 * =========================================================
 *
 * Used for image-only uploads such as:
 *
 * - Proof of Delivery
 * - Rider COD remittance proof
 * - Rider payout payment proof
 * - Custom bouquet inspiration images
 *
 * PDF files are intentionally rejected.
 * =========================================================
 */

const imageOnlyFileFilter = imageFileFilter;

/*
 * =========================================================
 * SELLER VERIFICATION DOCUMENTS
 * uploads/verification/sellers/
 * =========================================================
 */

export const sellerVerificationUpload =
  multer({
    storage: createStorage([
      "verification",
      "sellers",
    ]),

    fileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

/*
 * =========================================================
 * RIDER VERIFICATION DOCUMENTS
 * uploads/verification/riders/
 * =========================================================
 */

export const riderVerificationUpload =
  multer({
    storage: createStorage([
      "verification",
      "riders",
    ]),

    fileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

/*
 * =========================================================
 * FLOWER / BOUQUET IMAGES
 * uploads/flowers/
 * =========================================================
 */

export const flowerUpload =
  multer({
    storage: createStorage([
      "flowers",
    ]),

    fileFilter: imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

/*
 * =========================================================
 * BLOOMBOARD POST IMAGES
 * uploads/bloomboard/
 * =========================================================
 */

export const bloomboardUpload =
  multer({
    storage: createStorage([
      "bloomboard",
    ]),

    fileFilter: imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

/*
 * =========================================================
 * PROOF OF DELIVERY IMAGES
 * uploads/deliveries/proofs/
 * =========================================================
 *
 * Field name used by the route:
 *
 * proofImage
 *
 * Maximum:
 * 5 MB
 *
 * Accepted:
 * JPG / JPEG / PNG
 * =========================================================
 */

export const deliveryProofUpload =
  multer({
    storage: createStorage([
      "deliveries",
      "proofs",
    ]),

    fileFilter:
      imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

/*
 * =========================================================
 * RIDER REMITTANCE PROOF IMAGES
 * uploads/riders/remittances/
 * =========================================================
 *
 * Used when a Rider submits proof that
 * collected COD money has been remitted.
 *
 * Field name used by the route:
 *
 * proofImage
 *
 * Maximum:
 * 5 MB
 *
 * Accepted:
 * JPG / JPEG / PNG
 * =========================================================
 */

export const riderRemittanceProofUpload =
  multer({
    storage: createStorage([
      "riders",
      "remittances",
    ]),

    fileFilter:
      imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

/*
 * =========================================================
 * RIDER PAYOUT PAYMENT PROOF IMAGES
 * uploads/riders/payouts/
 * =========================================================
 *
 * Used when an Admin records an external
 * payment of the Rider's accumulated
 * delivery-fee earnings.
 *
 * FLOGRAM does not perform the bank
 * transfer itself.
 *
 * It stores the payment record and proof.
 *
 * Field name used by the route:
 *
 * proofImage
 *
 * Maximum:
 * 5 MB
 *
 * Accepted:
 * JPG / JPEG / PNG
 * =========================================================
 */

export const riderPayoutProofUpload =
  multer({
    storage: createStorage([
      "riders",
      "payouts",
    ]),

    fileFilter:
      imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });

/*
 * =========================================================
 * CUSTOM BOUQUET REQUEST INSPIRATION IMAGE
 * uploads/bloomboard/custom-requests/
 * =========================================================
 *
 * Used when a customer manually uploads
 * a reference/inspiration image for a
 * custom bouquet request.
 *
 * Field name used by the route:
 *
 * inspirationImage
 *
 * Maximum:
 * 5 MB
 *
 * Accepted:
 * JPG / JPEG / PNG
 * =========================================================
 */

export const customBouquetRequestUpload =
  multer({
    storage: createStorage([
      "bloomboard",
      "custom-requests",
    ]),

    fileFilter:
      imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });
/*
 * =========================================================
 * DISPUTE EVIDENCE PHOTOS
 * uploads/disputes/
 * =========================================================
 *
 * Field name: images (up to 3 photos)
 * =========================================================
 */

export const disputeEvidenceUpload =
  multer({
    storage: createStorage([
      "disputes",
    ]),

    fileFilter:
      imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,

      files: 3,
    },
  });

/*
 * =========================================================
 * SELLER PAYOUT PROOF
 * uploads/sellers/payouts/
 * =========================================================
 *
 * Field name: proofImage
 * =========================================================
 */

export const sellerPayoutProofUpload =
  multer({
    storage: createStorage([
      "sellers",
      "payouts",
    ]),

    fileFilter:
      imageOnlyFileFilter,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },
  });
