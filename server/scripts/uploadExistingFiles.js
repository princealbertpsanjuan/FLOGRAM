import "dotenv/config";
import fs from "fs/promises";
import path from "path";

import {
  isCloudStorageEnabled,
  mirrorToCloud,
} from "../src/services/cloudStorage.service.js";

/*
 * One-time copy of everything already inside server/uploads
 * (photos you uploaded while testing locally) to Cloudinary,
 * so the deployed server can still show them.
 *
 * Usage (from the server folder, with CLOUDINARY_* in .env):
 *   npm run upload-to-cloud
 */

const walk = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile() && !entry.name.startsWith(".")) {
      files.push(fullPath);
    }
  }

  return files;
};

const run = async () => {
  if (!isCloudStorageEnabled()) {
    console.error("Cloudinary is not configured. Add CLOUDINARY_URL (or the three CLOUDINARY_* values) to server/.env first.");
    process.exit(1);
  }

  const root = path.join(process.cwd(), "uploads");
  const files = await walk(root).catch(() => []);

  if (files.length === 0) {
    console.log("No files found in server/uploads.");
    return;
  }

  let uploaded = 0;

  for (const file of files) {
    const url = await mirrorToCloud(file);
    const label = path.relative(root, file);

    if (url) {
      uploaded += 1;
      console.log(`✔ ${label}`);
    } else {
      console.log(`✘ ${label}`);
    }
  }

  console.log(`\nDone: ${uploaded}/${files.length} file(s) uploaded to Cloudinary.`);
};

run();
