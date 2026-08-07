import multer from "multer";
import path from "path";
import fs from "fs";

const createStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(
        process.cwd(),
        "uploads",
        "verification",
        folder
      );

      fs.mkdirSync(uploadPath, { recursive: true });

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
      new Error("Only JPG, PNG, and PDF files are allowed."),
      false
    );
  }

  cb(null, true);
};

export const sellerVerificationUpload = multer({
  storage: createStorage("sellers"),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const riderVerificationUpload = multer({
  storage: createStorage("riders"),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});