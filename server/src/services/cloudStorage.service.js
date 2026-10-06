import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/*
 * =========================================================
 * CLOUD STORAGE (CLOUDINARY)
 * =========================================================
 *
 * Free hosts such as Render wipe the server disk on every
 * deploy/restart. Multer still saves uploads to
 * ./uploads first (so the existing code keeps working),
 * then each file is copied to Cloudinary using the SAME
 * relative path. When a file is later missing from disk,
 * GET /uploads/... redirects to the Cloudinary copy.
 *
 * Nothing changes in MongoDB: paths stay "/uploads/...".
 *
 * Enable by setting either:
 *   CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>
 * or all of:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *
 * When not configured (local development) this module
 * does nothing.
 * =========================================================
 */

const readConfig = () => {
  const url = process.env.CLOUDINARY_URL;

  if (url) {
    try {
      const parsed = new URL(url);

      return {
        cloudName: parsed.hostname,
        apiKey: decodeURIComponent(parsed.username),
        apiSecret: decodeURIComponent(parsed.password),
      };
    } catch {
      console.warn("CLOUDINARY_URL is invalid; cloud storage disabled.");
      return null;
    }
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  return null;
};

const config = readConfig();

export const isCloudStorageEnabled = () => Boolean(config);

/*
 * "uploads/flowers/123.jpg" (with or without leading slash,
 * with or without "uploads/") -> "flowers/123.jpg"
 */
const toKey = (relativePath) =>
  String(relativePath || "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
    .replace(/^uploads\//, "");

const isRaw = (key) => path.extname(key).toLowerCase() === ".pdf";

/*
 * Images: public_id has no extension, delivered with it.
 * PDFs:   uploaded as "raw" so they download untouched;
 *         raw public_ids keep their extension.
 */
const describe = (key) => {
  const raw = isRaw(key);
  const ext = path.extname(key);

  return {
    resourceType: raw ? "raw" : "image",
    publicId: `flogram/${raw ? key : key.slice(0, key.length - ext.length)}`,
  };
};

export const getCloudUrl = (relativePath) => {
  if (!config) {
    return null;
  }

  const key = toKey(relativePath);

  if (!key || key.includes("..")) {
    return null;
  }

  const { resourceType } = describe(key);

  return `https://res.cloudinary.com/${config.cloudName}/${resourceType}/upload/flogram/${key}`;
};

/*
 * Upload one local file. Never throws: a failed mirror is
 * logged and the request that created the file still
 * succeeds (the file is still on local disk).
 */
export const mirrorToCloud = async (absolutePath) => {
  if (!config || !absolutePath) {
    return null;
  }

  try {
    const uploadsRoot = path.join(process.cwd(), "uploads");
    const relative = path.relative(uploadsRoot, absolutePath).replaceAll("\\", "/");

    if (!relative || relative.startsWith("..")) {
      return null;
    }

    const { resourceType, publicId } = describe(relative);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = crypto
      .createHash("sha1")
      .update(`overwrite=true&public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`)
      .digest("hex");

    const buffer = await fs.readFile(absolutePath);

    const form = new FormData();
    form.append("file", new Blob([buffer]), path.basename(absolutePath));
    form.append("api_key", config.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("public_id", publicId);
    form.append("overwrite", "true");
    form.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
      { method: "POST", body: form }
    );

    if (!response.ok) {
      const text = await response.text();
      console.warn(`Cloudinary upload failed for ${relative}: ${response.status} ${text.slice(0, 200)}`);
      return null;
    }

    const result = await response.json();
    return result.secure_url || null;
  } catch (error) {
    console.warn(`Cloudinary upload failed: ${error.message}`);
    return null;
  }
};

const collectFiles = (req) => {
  const files = [];

  if (req.file?.path) {
    files.push(req.file);
  }

  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === "object") {
    Object.values(req.files).forEach((list) => {
      if (Array.isArray(list)) {
        files.push(...list);
      }
    });
  }

  return files.filter((file) => file?.path);
};

/*
 * App-level middleware. Runs before routers; after the
 * response is sent it copies every Multer disk upload of a
 * successful request to Cloudinary.
 */
export const mirrorUploadsMiddleware = (req, res, next) => {
  if (!config) {
    return next();
  }

  res.on("finish", () => {
    if (res.statusCode >= 400) {
      return;
    }

    const files = collectFiles(req);

    files.forEach((file) => {
      void mirrorToCloud(file.path);
    });
  });

  return next();
};

/*
 * Mounted AFTER express.static("/uploads"): only reached
 * when the file is not on local disk.
 */
export const uploadsFallback = (req, res, next) => {
  const url = getCloudUrl(decodeURIComponent(req.path));

  if (!url) {
    return next();
  }

  return res.redirect(302, url);
};

/*
 * Read a stored upload: local disk first, Cloudinary second.
 * Used by the CLIP embedding step.
 */
export const readStoredUpload = async (relativePath) => {
  const key = toKey(relativePath);
  const absolutePath = path.join(process.cwd(), "uploads", key);

  try {
    return await fs.readFile(absolutePath);
  } catch {
    // fall through to cloud
  }

  const url = getCloudUrl(key);

  if (!url) {
    return null;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return null;
};
