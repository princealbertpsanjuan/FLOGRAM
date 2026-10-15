/*
 * =========================================================
 * SHARED INPUT VALIDATION
 * =========================================================
 *
 * Contact numbers: Philippine mobile numbers only,
 * 11 digits starting with 09 (e.g. 09171234567).
 * "+63 917 123 4567" / "639171234567" are accepted and
 * normalized to 09XXXXXXXXX.
 *
 * Driver's license: LTO format, 1 letter + 10 digits,
 * written A01-23-456789 (dashes optional when typing).
 * =========================================================
 */

export const PHONE_ERROR =
  'Enter a valid mobile number: 11 digits starting with 09 (e.g. 09171234567).';

export const LICENSE_ERROR =
  "Enter a valid LTO driver's license number: 1 letter and 10 digits (e.g. A01-23-456789).";

/*
 * Keep only digits and turn +63 / 63 prefixes into 0.
 */
export const normalizePhone = (value?: string | null) => {
  let digits = String(value ?? '').replace(/\D/g, '');

  if (digits.startsWith('63') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }

  if (digits.length === 10 && digits.startsWith('9')) {
    digits = `0${digits}`;
  }

  return digits;
};

export const isValidPhone = (value?: string | null) => /^09\d{9}$/.test(normalizePhone(value));

/*
 * Use as TextInput onChangeText filter: digits only, max 11.
 * A pasted / prefilled +63 or 63 number becomes 09… first,
 * so '+639171234567' is not cut to '63917123456'.
 */
export const sanitizePhoneInput = (value: string) => {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('63') && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }

  return digits.slice(0, 11);
};

export const normalizeLicense = (value?: string | null) => {
  const compact = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (!/^[A-Z]\d{10}$/.test(compact)) {
    return compact;
  }

  return `${compact.slice(0, 3)}-${compact.slice(3, 5)}-${compact.slice(5)}`;
};

export const isValidLicense = (value?: string | null) =>
  /^[A-Z]\d{2}-\d{2}-\d{6}$/.test(normalizeLicense(value));

/*
 * Use as TextInput onChangeText: uppercase, auto-dashes,
 * max 13 characters (A01-23-456789).
 */
export const formatLicenseInput = (value: string) => {
  const compact = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 11);

  if (compact.length <= 3) {
    return compact;
  }

  if (compact.length <= 5) {
    return `${compact.slice(0, 3)}-${compact.slice(3)}`;
  }

  return `${compact.slice(0, 3)}-${compact.slice(3, 5)}-${compact.slice(5)}`;
};
