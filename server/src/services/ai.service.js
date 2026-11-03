import fs from "fs";
import path from "path";

import { readStoredUpload } from "./cloudStorage.service.js";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  "http://localhost:8000";

/*
 * The Hugging Face Space sleeps when idle and can take a
 * minute to wake; never wait longer than this.
 */
const AI_SERVICE_TIMEOUT_MS =
  Number(process.env.AI_SERVICE_TIMEOUT_MS) || 60000;

const getMimeType = (filePath) => {
  const extension = path
    .extname(filePath)
    .toLowerCase();

  if (
    extension === ".jpg" ||
    extension === ".jpeg"
  ) {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "application/octet-stream";
};

const sendImageToEmbeddingService = async (
  fileBuffer,
  filename,
  mimeType
) => {
  const formData = new FormData();

  const blob = new Blob(
    [fileBuffer],
    {
      type: mimeType,
    }
  );

  formData.append(
    "image",
    blob,
    filename
  );

  let response;

  try {
    response = await fetch(
    `${AI_SERVICE_URL}/embed-image`,
    {
      signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
      method: "POST",
      body: formData,
    }
  );
  } catch (cause) {
    const error = new Error(
      cause?.name === "TimeoutError"
        ? "The image search service is waking up. Please try again in a minute."
        : "The image search service could not be reached."
    );
    error.statusCode = 503;
    throw error;
  }

  let result;

  try {
    result = await response.json();
  } catch {
    const error = new Error("The image search service returned an invalid response.");
    error.statusCode = 502;
    throw error;
  }


  if (!response.ok) {
    const error = new Error(
      result?.detail ||
        "AI service failed to generate image embedding."
    );

    error.statusCode = 502;
    throw error;
  }

  if (!Array.isArray(result?.data?.embedding)) {
    const error = new Error("The image search service returned no embedding.");
    error.statusCode = 502;
    throw error;
  }

  return {
    embedding: result.data.embedding,
    model: result.data.model,
  };
};

/*
 * Generate embedding from an image
 * already saved on the server.
 *
 * Used when seller creates a bouquet.
 */
export const generateImageEmbedding = async (
  relativeImagePath
) => {
  /*
   * Local disk first, Cloudinary copy second
   * (the server disk is temporary on Render).
   */
  const fileBuffer =
    await readStoredUpload(
      relativeImagePath
    );

  if (!fileBuffer) {
    const error = new Error(
      "Bouquet image file was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return sendImageToEmbeddingService(
    fileBuffer,
    path.basename(String(relativeImagePath)),
    getMimeType(String(relativeImagePath))
  );
};

/*
 * Generate embedding directly from
 * an uploaded Multer file.
 *
 * Used for customer image search.
 */
export const generateUploadedImageEmbedding = async (
  file
) => {
  if (!file) {
    const error = new Error(
      "Search image is required."
    );
    error.statusCode = 400;
    throw error;
  }

  let fileBuffer;

  if (file.buffer) {
    fileBuffer = file.buffer;
  } else if (file.path) {
    if (!fs.existsSync(file.path)) {
      const error = new Error(
        "Uploaded search image could not be found."
      );
      error.statusCode = 404;
      throw error;
    }

    fileBuffer = fs.readFileSync(
      file.path
    );
  } else {
    const error = new Error(
      "Uploaded image data is invalid."
    );
    error.statusCode = 400;
    throw error;
  }

  return sendImageToEmbeddingService(
    fileBuffer,
    file.originalname || "search-image",
    file.mimetype || "application/octet-stream"
  );
};