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
 * SELLER VERIFICATION DOCUMENTS
 * uploads/verification/sellers/
 */
export const sellerVerificationUpload = multer({
  storage: createStorage([
    "verification",
    "sellers",
  ]),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/*
 * RIDER VERIFICATION DOCUMENTS
 * uploads/verification/riders/
 */
export const riderVerificationUpload = multer({
  storage: createStorage([
    "verification",
    "riders",
  ]),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/*
 * FLOWER / BOUQUET IMAGES
 * uploads/flowers/
 */
export const flowerUpload = multer({
  storage: createStorage([
    "flowers",
  ]),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});