import path from "path";

/*
 * =========================================================
 * ACCEPTED UPLOAD FILE TYPES
 * =========================================================
 *
 * Phones do not always label photos as image/jpeg:
 *
 * - iPhone photos can be HEIC/HEIF
 * - some Android galleries return WEBP
 * - Expo's File upload may send a blank or
 *   application/octet-stream type
 *
 * A file is accepted when its MIME type is a known image
 * type, OR when the type is missing/generic and the file
 * extension is a known image extension.
 * =========================================================
 */

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
];

const GENERIC_MIME_TYPES = [
  "",
  "application/octet-stream",
  "binary/octet-stream",
];

const MIME_TO_EXTENSION = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "application/pdf": ".pdf",
};

const getExtension = (file) =>
  path.extname(String(file?.originalname || "")).toLowerCase();

const getMime = (file) =>
  String(file?.mimetype || "").toLowerCase();

export const isAcceptedImage = (file) => {
  const mime = getMime(file);
  const extension = getExtension(file);

  if (IMAGE_MIME_TYPES.includes(mime)) {
    return true;
  }

  if (
    (GENERIC_MIME_TYPES.includes(mime) || mime.startsWith("image/")) &&
    IMAGE_EXTENSIONS.includes(extension)
  ) {
    return true;
  }

  return false;
};

export const isAcceptedImageOrPdf = (file) =>
  isAcceptedImage(file) ||
  getMime(file) === "application/pdf" ||
  (GENERIC_MIME_TYPES.includes(getMime(file)) && getExtension(file) === ".pdf");

/*
 * Extension used for the stored file name. Falls back to
 * the MIME type, then .jpg, so a file without an
 * extension is still served with a sensible type.
 */
export const getSafeExtension = (file) => {
  const extension = getExtension(file);

  if ([...IMAGE_EXTENSIONS, ".pdf"].includes(extension)) {
    return extension;
  }

  return MIME_TO_EXTENSION[getMime(file)] || ".jpg";
};

export const imageFileFilter = (req, file, cb) => {
  if (!isAcceptedImage(file)) {
    const error = new Error(
      "Unsupported image. Please upload a JPG, PNG, WEBP or HEIC photo."
    );
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

export const imageOrPdfFileFilter = (req, file, cb) => {
  if (!isAcceptedImageOrPdf(file)) {
    const error = new Error(
      "Unsupported file. Please upload a JPG, PNG, WEBP or HEIC photo, or a PDF."
    );
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};
