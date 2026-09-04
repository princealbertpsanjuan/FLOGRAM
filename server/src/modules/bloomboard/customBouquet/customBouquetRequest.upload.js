import multer from "multer";
import path from "path";
import fs from "fs";

/*
 * =========================================================
 * CUSTOM BOUQUET INSPIRATION IMAGE UPLOAD
 * =========================================================
 *
 * Files are saved to:
 *
 * uploads/
 *   bloomboard/
 *     custom-bouquet-requests/
 *
 * Supported formats:
 *
 * JPG
 * JPEG
 * PNG
 * WEBP
 *
 * Maximum size:
 *
 * 5 MB
 * =========================================================
 */

const uploadDirectory =
  path.join(
    process.cwd(),
    "uploads",
    "bloomboard",
    "custom-bouquet-requests"
  );

/*
 * Make sure the directory exists
 * before Multer tries to save a file.
 */

fs.mkdirSync(
  uploadDirectory,
  {
    recursive:
      true,
  }
);

/*
 * =========================================================
 * STORAGE
 * =========================================================
 */

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback
    ) => {
      callback(
        null,
        uploadDirectory
      );
    },

    filename: (
      req,
      file,
      callback
    ) => {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      const originalBaseName =
        path.basename(
          file.originalname,
          extension
        );

      /*
       * Remove unsafe filename
       * characters.
       */

      const safeBaseName =
        originalBaseName
          .replace(
            /[^a-zA-Z0-9_-]/g,
            "-"
          )
          .replace(
            /-+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          );

      const finalBaseName =
        safeBaseName ||
        "bouquet-inspiration";

      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() *
            1e9
        )}-${finalBaseName}${extension}`;

      callback(
        null,
        uniqueName
      );
    },
  });

/*
 * =========================================================
 * FILE TYPE VALIDATION
 * =========================================================
 */

const fileFilter = (
  req,
  file,
  callback
) => {
  const allowedMimeTypes =
    [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

  if (
    !allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    const error =
      new Error(
        "Only JPG, JPEG, PNG, and WEBP images are allowed."
      );

    error.statusCode =
      400;

    callback(
      error,
      false
    );

    return;
  }

  callback(
    null,
    true
  );
};

/*
 * =========================================================
 * MULTER INSTANCE
 * =========================================================
 *
 * The route should use:
 *
 * customBouquetRequestUpload.single(
 *   "inspirationImage"
 * )
 * =========================================================
 */

export const customBouquetRequestUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        5 *
        1024 *
        1024,
    },
  });