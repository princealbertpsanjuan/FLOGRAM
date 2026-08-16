import fs from "fs/promises";
import path from "path";
import {
  randomUUID,
} from "crypto";

const MAX_IMAGE_SIZE =
  15 * 1024 * 1024;

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/*
 * Save an externally generated
 * AI image permanently inside
 * the FLOGRAM uploads directory.
 */
export const saveRemoteAiImage =
  async (
    imageUrl
  ) => {
    if (!imageUrl) {
      const error =
        new Error(
          "Generated image URL is required."
        );

      error.statusCode = 400;

      throw error;
    }

    let parsedUrl;

    try {
      parsedUrl =
        new URL(
          imageUrl
        );
    } catch {
      const error =
        new Error(
          "Generated image URL is invalid."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * Only allow HTTPS.
     */
    if (
      parsedUrl.protocol !==
      "https:"
    ) {
      const error =
        new Error(
          "Generated image must use HTTPS."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * Download image from xAI.
     */
    const response =
      await fetch(
        imageUrl
      );

    if (!response.ok) {
      const error =
        new Error(
          "Unable to download the generated bouquet image."
        );

      error.statusCode = 502;

      throw error;
    }

    const contentType =
      response.headers
        .get(
          "content-type"
        )
        ?.split(";")[0]
        ?.trim()
        ?.toLowerCase();

    const extension =
      MIME_EXTENSIONS[
        contentType
      ];

    if (!extension) {
      const error =
        new Error(
          "Generated file is not a supported image type."
        );

      error.statusCode = 502;

      throw error;
    }

    /*
     * Check Content-Length first
     * when supplied by xAI.
     */
    const contentLength =
      Number(
        response.headers.get(
          "content-length"
        ) || 0
      );

    if (
      contentLength >
      MAX_IMAGE_SIZE
    ) {
      const error =
        new Error(
          "Generated image is too large."
        );

      error.statusCode = 413;

      throw error;
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer
      );

    /*
     * Check actual downloaded size.
     */
    if (
      buffer.length >
      MAX_IMAGE_SIZE
    ) {
      const error =
        new Error(
          "Generated image is too large."
        );

      error.statusCode = 413;

      throw error;
    }

    /*
     * Permanent FLOGRAM folder:
     *
     * uploads/bloomboard/ai/
     */
    const uploadDirectory =
      path.join(
        process.cwd(),
        "uploads",
        "bloomboard",
        "ai"
      );

    await fs.mkdir(
      uploadDirectory,
      {
        recursive: true,
      }
    );

    const filename =
      `${Date.now()}-${randomUUID()}${extension}`;

    const absolutePath =
      path.join(
        uploadDirectory,
        filename
      );

    await fs.writeFile(
      absolutePath,
      buffer
    );

    /*
     * Save only relative path
     * into MongoDB.
     */
    const relativePath =
      path
        .relative(
          process.cwd(),
          absolutePath
        )
        .replaceAll(
          "\\",
          "/"
        );

    return {
      path:
        relativePath,

      filename,

      mimeType:
        contentType,

      size:
        buffer.length,
    };
  };