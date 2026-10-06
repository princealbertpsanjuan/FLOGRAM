import User from "../auth/auth.model.js";
import { createNotification } from "./notification.service.js";

/*
 * =========================================================
 * NOTIFICATION HELPERS
 * =========================================================
 *
 * Notifications must never block the action that caused
 * them, so failures are logged and swallowed.
 * =========================================================
 */

export const notifySafely = async (payload) => {
  try {
    if (!payload?.recipient) return null;
    return await createNotification({
      ...payload,
      title: String(payload.title || "").slice(0, 120),
      message: String(payload.message || "").slice(0, 500),
    });
  } catch (error) {
    console.error(`Notification (${payload?.type}) failed:`, error.message);
    return null;
  }
};

/*
 * Every active Admin account.
 */
export const notifyAdmins = async ({ type, title, message, order = null, delivery = null, remittance = null, metadata = {} }) => {
  try {
    const admins = await User.find({ role: "admin", accountStatus: "active" }).select("_id").lean();

    await Promise.all(
      admins.map((admin) =>
        notifySafely({ recipient: admin._id, role: "admin", type, title, message, order, delivery, remittance, metadata })
      )
    );
  } catch (error) {
    console.error("Admin notification failed:", error.message);
  }
};

/*
 * Every approved, active Rider (e.g. a new shift posted).
 */
export const notifyAllRiders = async ({ type, title, message, metadata = {} }) => {
  try {
    const riders = await User.find({ role: "rider", accountStatus: "active", verificationStatus: "approved" })
      .select("_id")
      .lean();

    await Promise.all(
      riders.map((rider) => notifySafely({ recipient: rider._id, role: "rider", type, title, message, metadata }))
    );
  } catch (error) {
    console.error("Rider broadcast notification failed:", error.message);
  }
};
