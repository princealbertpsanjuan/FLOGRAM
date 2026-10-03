/*
 * =========================================================
 * ACCOUNT STATUS CHECK (login + every request)
 * =========================================================
 *
 * - A temporary suspension whose end date has passed is
 *   lifted automatically.
 * - Suspended / banned users get a clear message with the
 *   reason and end date.
 * =========================================================
 */

const formatDate = (date) =>
  new Date(date).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });

export const ensureAccountIsUsable = async (user) => {
  if (
    user.accountStatus === "suspended" &&
    user.suspendedUntil &&
    new Date(user.suspendedUntil).getTime() <= Date.now()
  ) {
    user.accountStatus = "active";
    user.suspendedUntil = null;
    user.suspensionReason = "";
    await user.save();
  }

  if (user.accountStatus === "active") {
    return;
  }

  const reason = user.suspensionReason ? ` Reason: ${user.suspensionReason}` : "";

  let message = `This account is currently ${user.accountStatus}.`;

  if (user.accountStatus === "suspended" && user.suspendedUntil) {
    message = `This account is suspended until ${formatDate(user.suspendedUntil)}.${reason}`;
  } else if (user.accountStatus === "suspended") {
    message = `This account is suspended.${reason}`;
  } else if (user.accountStatus === "banned") {
    message = `This account has been permanently banned for violating FLOGRAM policies.${reason}`;
  }

  const error = new Error(message);
  error.statusCode = 403;
  throw error;
};
