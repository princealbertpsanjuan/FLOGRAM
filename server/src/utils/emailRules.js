/*
 * =========================================================
 * EMAIL RULES (panel recommendation)
 * =========================================================
 *
 * New accounts and shop business emails must be a real
 * Gmail address:
 *  - domain gmail.com (googlemail.com is the same mailbox)
 *  - username 6-30 characters: letters, numbers, periods
 *  - no period at the start or end, no two in a row
 *  - no "+tag" (it is the same mailbox as without it)
 *
 * One mailbox = one account: express-validator's
 * normalizeEmail() then stores Gmail without dots/+tags and
 * as @gmail.com, so p.a.sanjuan@gmail.com and
 * pasanjuan@gmail.com cannot become two accounts, and
 * institution aliases such as @gbox.adnu.edu.ph vs
 * @adnu.edu.ph can no longer be used at all.
 *
 * Existing accounts with other email domains can still log
 * in; the rule applies to sign-up and business emails.
 * =========================================================
 */

export const GMAIL_ERROR =
  "Use a valid Gmail address (example: yourname@gmail.com).";

const GMAIL_PATTERN = /^[a-z0-9](?:[a-z0-9]|\.(?!\.)){4,28}[a-z0-9]@(gmail\.com|googlemail\.com)$/i;

export const isValidGmail = (value) => {
  const email = String(value || "").trim();

  if (!email || email.includes("+")) {
    return false;
  }

  return GMAIL_PATTERN.test(email);
};
