/*
 * =========================================================
 * CONTACT / LICENSE / PLATE FORMATS
 * =========================================================
 *
 * Same rules as apps/mobile/utils/validation.ts.
 *
 * Contact numbers: Philippine mobile numbers only,
 * stored as 09XXXXXXXXX. Spaces, dashes and the +63 / 63
 * prefix are accepted and normalized.
 *
 * Driver's license: LTO format, 1 letter + 10 digits,
 * stored as A01-23-456789 (dashes optional on input).
 *
 * Plate number: letters and digits only, 2-8 characters,
 * stored uppercase without spaces/dashes.
 * =========================================================
 */

export const PHONE_ERROR =
  "Enter a valid mobile number: 11 digits starting with 09 (e.g. 09171234567).";

export const LICENSE_ERROR =
  "Enter a valid LTO driver's license number: 1 letter and 10 digits (e.g. A01-23-456789).";

export const PLATE_ERROR =
  "Enter a valid plate number: 2 to 8 letters and numbers (e.g. ABC1234).";

export const normalizePhone = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }

  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `0${digits}`;
  }

  return digits;
};

export const isValidPhone = (value) =>
  /^09\d{9}$/.test(normalizePhone(value));

export const normalizeLicense = (value) => {
  const compact = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!/^[A-Z]\d{10}$/.test(compact)) {
    return compact;
  }

  return `${compact.slice(0, 3)}-${compact.slice(3, 5)}-${compact.slice(5)}`;
};

export const isValidLicense = (value) =>
  /^[A-Z]\d{2}-\d{2}-\d{6}$/.test(normalizeLicense(value));

export const normalizePlate = (value) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export const isValidPlate = (value) =>
  /^[A-Z0-9]{2,8}$/.test(normalizePlate(value));
