import fs from "fs";
import path from "path";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  "http://localhost:8000";

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

  const response = await fetch(
    `${AI_SERVICE_URL}/embed-image`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    const error = new Error(
      result.detail ||
        "AI service failed to generate image embedding."
    );

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
  const absolutePath = path.join(
    process.cwd(),
    relativeImagePath
  );

  if (!fs.existsSync(absolutePath)) {
    const error = new Error(
      "Bouquet image file was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const fileBuffer =
    fs.readFileSync(absolutePath);

  return sendImageToEmbeddingService(
    fileBuffer,
    path.basename(absolutePath),
    getMimeType(absolutePath)
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