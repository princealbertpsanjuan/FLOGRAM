/*
 * =========================================================
 * SCHEDULED (PRE-ORDER) DELIVERY DATE CHECK
 * =========================================================
 *
 * The app sends the chosen day as that day at 12:00 noon
 * (Philippine time). The old check required that instant to
 * be in the future, so a same-day scheduled order worked in
 * the morning and failed every afternoon with
 * "Pre-order delivery date must be in the future."
 *
 * Rule now (Asia/Manila calendar day, the server may run in
 * UTC on Render):
 *  - the chosen day must be today or later
 *  - for today, the delivery window end (if any) must not
 *    have passed yet
 * =========================================================
 */

const MANILA_OFFSET = "+08:00";

// "YYYY-MM-DD" of a moment, in Philippine time
export const toManilaDay = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

/*
 * Returns an error message, or null when the schedule can
 * still be fulfilled.
 */
export const getScheduleProblem = (
  requestedDeliveryDate,
  requestedDeliveryTimeEnd = null,
  now = new Date()
) => {
  const date = requestedDeliveryDate instanceof Date ? requestedDeliveryDate : new Date(requestedDeliveryDate);

  if (Number.isNaN(date.getTime())) {
    return "Requested delivery date is invalid.";
  }

  const day = toManilaDay(date);
  const endOfDay = new Date(`${day}T23:59:59${MANILA_OFFSET}`);

  if (endOfDay <= now) {
    return "Pre-order delivery date must be today or a future date.";
  }

  if (requestedDeliveryTimeEnd && /^\d{2}:\d{2}$/.test(String(requestedDeliveryTimeEnd))) {
    const windowEnd = new Date(`${day}T${requestedDeliveryTimeEnd}:00${MANILA_OFFSET}`);

    if (windowEnd <= now) {
      return "The chosen delivery time has already passed today. Pick a later time or another day.";
    }
  }

  return null;
};
