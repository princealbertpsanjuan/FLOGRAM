import crypto from "crypto";
import fs from "fs/promises";

/*
 * =========================================================
 * AUTOMATED REQUIREMENT CHECKS (Seller / Rider verification)
 * =========================================================
 *
 * Run on every upload BEFORE the submission reaches the
 * Admin queue. Each check returns one of:
 *
 *   pass     the requirement looks correct
 *   warning  Admin should look closely (shown in yellow)
 *   fail     the submission is refused (shown in red)
 *
 * Checks:
 *  1. File signature   the bytes really are a JPG / PNG /
 *                      WEBP / HEIC photo or a PDF (a renamed
 *                      .exe or .txt is refused)
 *  2. Readability      image width/height; tiny images are
 *                      refused, small ones get a warning
 *  3. Same file twice  one photo used for two requirements
 *  4. Reused document  identical file (SHA-256) already
 *                      submitted by ANOTHER account
 *  5. Details          DTI / TIN / ID / license formats and
 *                      expiry or issue dates
 *
 * The result is stored on the Verification record together
 * with a risk level (low / medium / high) for the Admin.
 * =========================================================
 */

export const MIN_IMAGE_SIDE_FAIL = 200;
export const MIN_IMAGE_SIDE_WARN = 600;
export const MIN_FILE_BYTES_WARN = 15 * 1024;

export const SELLER_REQUIREMENTS = [
  { key: "validId", label: "Valid government ID" },
  { key: "dtiRegistration", label: "DTI business registration" },
  { key: "birDocument", label: "BIR registration" },
  { key: "bankProof", label: "Bank account proof" },
  { key: "shopLogo", label: "Shop logo" },
];

export const RIDER_REQUIREMENTS = [
  { key: "driverLicense", label: "Driver's license" },
  { key: "orcr", label: "Vehicle OR/CR" },
  { key: "policeClearance", label: "Police clearance" },
];

export const VALID_ID_TYPES = [
  "PhilSys National ID",
  "Passport",
  "Driver's License",
  "UMID",
  "SSS ID",
  "PRC ID",
  "Postal ID",
  "Voter's ID",
];

/*
 * ---------------------------------------------------------
 * FILE SIGNATURE + IMAGE SIZE
 * ---------------------------------------------------------
 */

const startsWith = (buffer, bytes, offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

export const detectFileType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buffer.toString("ascii", 0, 5) === "%PDF-") return "pdf";

  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"].includes(brand)) {
      return "heic";
    }
  }

  return null;
};

const pngSize = (buffer) =>
  buffer.length >= 24
    ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    : null;

const jpegSize = (buffer) => {
  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];

    // Standalone markers have no length
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);

    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
};

const webpSize = (buffer) => {
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8 " && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  return null;
};

export const readImageSize = (buffer, type) => {
  try {
    if (type === "png") return pngSize(buffer);
    if (type === "jpeg") return jpegSize(buffer);
    if (type === "webp") return webpSize(buffer);
  } catch {
    return null;
  }

  // HEIC and PDF: size is not read; Admin checks them visually
  return null;
};

/*
 * Read one uploaded Multer file and describe it.
 */
export const inspectFile = async (file) => {
  const buffer = await fs.readFile(file.path);
  const type = detectFileType(buffer);
  const size = type ? readImageSize(buffer, type) : null;

  return {
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    detectedType: type,
    width: size?.width || null,
    height: size?.height || null,
    bytes: buffer.length,
  };
};

/*
 * ---------------------------------------------------------
 * DETAIL FORMATS
 * ---------------------------------------------------------
 */

// DTI Business Name certificate number, e.g. 1234567 or BN-1234567
export const normalizeDti = (value) =>
  String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^BN/, "");
export const isValidDti = (value) => /^\d{6,10}$/.test(normalizeDti(value));

// BIR TIN: 9 digits + optional 3-5 digit branch code, e.g. 123-456-789-000
export const normalizeTin = (value) => String(value || "").replace(/\D/g, "");
export const isValidTin = (value) => /^\d{9}(\d{3,5})?$/.test(normalizeTin(value));
export const formatTin = (value) =>
  normalizeTin(value).replace(/^(\d{3})(\d{3})(\d{3})(\d*)$/, (all, a, b, c, d) =>
    [a, b, c, d].filter(Boolean).join("-")
  );

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const DAY = 24 * 60 * 60 * 1000;

/*
 * ---------------------------------------------------------
 * RUN ALL CHECKS
 * ---------------------------------------------------------
 *
 * files       { key: MulterFile }
 * fingerprints{ key: inspectFile() result }
 * details     submitted text details
 * others      fingerprints already stored for OTHER users:
 *             [{ sha256, user, role }]
 */
export const evaluateRequirements = ({
  role,
  fingerprints,
  details,
  others = [],
}) => {
  const requirements = role === "seller" ? SELLER_REQUIREMENTS : RIDER_REQUIREMENTS;
  const checks = [];
  const add = (documentKey, label, status, message) =>
    checks.push({ documentKey, label, status, message });

  // 1 + 2: signature and readability
  requirements.forEach(({ key, label }) => {
    const info = fingerprints[key];

    if (!info) {
      add(key, label, "fail", "File is missing.");
      return;
    }

    if (!info.detectedType) {
      add(key, label, "fail", "This is not a real photo or PDF. Upload a JPG, PNG, WEBP, HEIC or PDF file.");
      return;
    }

    if (key === "shopLogo" && info.detectedType === "pdf") {
      add(key, label, "fail", "The shop logo must be a photo, not a PDF.");
      return;
    }

    if (info.width && info.height) {
      const shortest = Math.min(info.width, info.height);

      if (shortest < MIN_IMAGE_SIDE_FAIL) {
        add(key, label, "fail", `Image is too small to read (${info.width}×${info.height}px). Retake the photo.`);
        return;
      }

      if (key !== "shopLogo" && shortest < MIN_IMAGE_SIDE_WARN) {
        add(key, label, "warning", `Low resolution (${info.width}×${info.height}px). Check that text is readable.`);
        return;
      }
    }

    if (key !== "shopLogo" && info.bytes < MIN_FILE_BYTES_WARN) {
      add(key, label, "warning", "Very small file. It may be a thumbnail or screenshot; check that it is readable.");
      return;
    }

    add(key, label, "pass", `Valid ${info.detectedType.toUpperCase()} file${info.width ? ` (${info.width}×${info.height}px)` : ""}.`);
  });

  // 3: same file used for two requirements
  const seen = new Map();
  requirements.forEach(({ key, label }) => {
    const hash = fingerprints[key]?.sha256;
    if (!hash) return;

    if (seen.has(hash)) {
      const first = seen.get(hash);
      add(key, label, "fail", `Same file as "${first.label}". Each requirement needs its own document.`);
    } else {
      seen.set(hash, { key, label });
    }
  });

  // 4: identical document from another account
  requirements.forEach(({ key, label }) => {
    const hash = fingerprints[key]?.sha256;
    if (!hash || key === "shopLogo") return;

    const match = others.find((other) => other.sha256 === hash);
    if (match) {
      add(
        key,
        label,
        "warning",
        `Identical file was already submitted by another ${match.role} account. Possible reused or borrowed document.`
      );
    }
  });

  // 5: details
  const today = startOfToday();

  if (role === "seller") {
    if (!isValidDti(details.dtiNumber)) {
      add("dtiRegistration", "DTI certificate number", "fail", "Enter the 6–10 digit DTI Business Name certificate number.");
    } else {
      add("dtiRegistration", "DTI certificate number", "pass", `DTI No. ${normalizeDti(details.dtiNumber)}`);
    }

    if (!isValidTin(details.tinNumber)) {
      add("birDocument", "BIR TIN", "fail", "Enter a valid TIN: 9 digits plus optional branch code (123-456-789-000).");
    } else {
      add("birDocument", "BIR TIN", "pass", `TIN ${formatTin(details.tinNumber)}`);
    }

    if (!VALID_ID_TYPES.includes(details.validIdType)) {
      add("validId", "ID type", "fail", "Choose which government ID you uploaded.");
    }

    const expiry = parseDate(details.validIdExpiry);
    if (details.validIdType !== "PhilSys National ID") {
      if (!expiry) {
        add("validId", "ID expiry date", "fail", "Enter the expiry date printed on your ID.");
      } else if (expiry < today) {
        add("validId", "ID expiry date", "fail", "Your ID is already expired. Upload a valid ID.");
      } else if (expiry - today < 30 * DAY) {
        add("validId", "ID expiry date", "warning", "ID expires within 30 days.");
      } else {
        add("validId", "ID expiry date", "pass", `Valid until ${expiry.toISOString().slice(0, 10)}`);
      }
    }
  } else {
    const licenseExpiry = parseDate(details.licenseExpiry);
    if (!licenseExpiry) {
      add("driverLicense", "License expiry date", "fail", "Enter the expiry date printed on your license.");
    } else if (licenseExpiry < today) {
      add("driverLicense", "License expiry date", "fail", "Your driver's license is expired.");
    } else if (licenseExpiry - today < 30 * DAY) {
      add("driverLicense", "License expiry date", "warning", "License expires within 30 days.");
    } else {
      add("driverLicense", "License expiry date", "pass", `Valid until ${licenseExpiry.toISOString().slice(0, 10)}`);
    }

    const issued = parseDate(details.policeClearanceIssuedAt);
    if (!issued) {
      add("policeClearance", "Police clearance issue date", "fail", "Enter the date your police clearance was issued.");
    } else if (issued > new Date()) {
      add("policeClearance", "Police clearance issue date", "fail", "Issue date cannot be in the future.");
    } else if (today - issued > 183 * DAY) {
      add("policeClearance", "Police clearance issue date", "fail", "Police clearance must be issued within the last 6 months.");
    } else {
      add("policeClearance", "Police clearance issue date", "pass", `Issued ${issued.toISOString().slice(0, 10)}`);
    }
  }

  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warning");
  const reused = warnings.some((check) => /another .* account/.test(check.message));

  const riskLevel = failures.length || reused || warnings.length >= 3
    ? "high"
    : warnings.length
      ? "medium"
      : "low";

  return { checks, failures, warnings, riskLevel };
};
