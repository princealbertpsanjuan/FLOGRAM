import multer from "multer";
import path from "path";
import fs from "fs";

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
        path.extname(file.originalname);

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
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only JPG, PNG, and PDF files are allowed."
      ),
      false
    );
  }

  cb(null, true);
};

/*
 * =========================================================
 * IMAGE-ONLY FILE FILTER
 * =========================================================
 *
 * Proof of Delivery must be an actual
 * image captured/selected by the rider.
 *
 * PDF files are intentionally rejected.
 * =========================================================
 */
const imageOnlyFileFilter = (
  req,
  file,
  cb
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];

  if (
    !allowedTypes.includes(
      file.mimetype
    )
  ) {
    return cb(
      new Error(
        "Proof of delivery must be a JPG or PNG image."
      ),
      false
    );
  }

  cb(null, true);
};

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
        5 * 1024 * 1024,
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
        5 * 1024 * 1024,
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

    fileFilter,

    limits: {
      fileSize:
        5 * 1024 * 1024,
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

    fileFilter,

    limits: {
      fileSize:
        5 * 1024 * 1024,
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
        5 * 1024 * 1024,
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
        5 * 1024 * 1024,
    },
  });