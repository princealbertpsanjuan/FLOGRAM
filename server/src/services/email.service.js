import nodemailer from "nodemailer";

/*
 * =========================================================
 * EMAIL DELIVERY
 * =========================================================
 *
 * 1. Brevo HTTPS API (used when BREVO_API_KEY is set).
 *    Render's free plan blocks outgoing SMTP ports, so
 *    Gmail SMTP hangs there. Brevo sends over HTTPS (443),
 *    which is never blocked.
 *
 * 2. Gmail SMTP through nodemailer (fallback, e.g. local
 *    development with EMAIL_USER + EMAIL_PASSWORD). Short
 *    timeouts make a blocked connection fail quickly
 *    instead of hanging the request.
 * =========================================================
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_TIMEOUT_MS = 15000;

/*
 * Hard ceiling for one email send, whatever the
 * provider does (DNS hang, SMTP stall...). Keeps the
 * whole forgot-password request well under the app's
 * own request timeout.
 */
export const EMAIL_SEND_TIMEOUT_MS = 18000;

/*
 * Rejects with a clear message when the wrapped promise
 * does not settle in time. The slow promise is left to
 * finish (or fail) in the background and is ignored.
 */
export const withTimeout = (promise, ms, message) => {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(message);
      error.code = "ETIMEOUT";
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

/*
 * True when at least one delivery method is configured:
 * Brevo (BREVO_API_KEY + a sender) or Gmail SMTP
 * (EMAIL_USER + EMAIL_PASSWORD).
 */
export const isEmailConfigured = () => {
  if (process.env.BREVO_API_KEY) {
    return Boolean(getSenderEmail());
  }

  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getSenderEmail = () =>
  process.env.EMAIL_FROM || process.env.EMAIL_USER;

/*
 * =========================================================
 * PASSWORD RESET CONTENT
 * =========================================================
 */
const buildPasswordResetEmail = ({ firstName, resetCode }) => {
  const name = firstName || "FLOGRAM User";
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(resetCode);

  return {
    subject: "FLOGRAM Password Reset Code",
    text: [
      `Hello ${name},`,
      "",
      "We received a request to reset your FLOGRAM password.",
      "",
      `Your password reset code is: ${resetCode}`,
      "",
      "This code will expire in 10 minutes.",
      "",
      "If you did not request a password reset, you can ignore this email.",
      "",
      "FLOGRAM",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
        <h2 style="color: #e91e63;">FLOGRAM</h2>

        <p>Hello ${safeName},</p>

        <p>
          We received a request to reset your FLOGRAM password.
        </p>

        <p>Your password reset code is:</p>

        <div
          style="
            font-size: 30px;
            font-weight: 700;
            letter-spacing: 8px;
            padding: 18px;
            text-align: center;
            background: #fce7f3;
            border-radius: 10px;
            margin: 20px 0;
            color: #be185d;
          "
        >
          ${safeCode}
        </div>

        <p>
          This code will expire in <strong>10 minutes</strong>.
        </p>

        <p>
          If you did not request a password reset, you can safely ignore
          this email.
        </p>

        <p style="margin-top: 30px;">
          FLOGRAM
        </p>
      </div>
    `,
  };
};

/*
 * =========================================================
 * BREVO (HTTPS API)
 * =========================================================
 */
const sendWithBrevo = async ({ to, toName, subject, html, text }) => {
  const senderEmail = getSenderEmail();

  if (!senderEmail) {
    throw new Error(
      "EMAIL_FROM (a sender verified in Brevo) must be configured when BREVO_API_KEY is set."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);

  let response;

  try {
    response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "FLOGRAM", email: senderEmail },
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Brevo did not respond within ${BREVO_TIMEOUT_MS / 1000} seconds.`
      );
    }

    throw new Error(`Could not reach Brevo: ${error?.message || error}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let detail = "";

    try {
      const data = await response.json();
      detail = data?.message || data?.code || "";
    } catch {
      // Body was not JSON; the status code is enough.
    }

    throw new Error(
      `Brevo rejected the email (HTTP ${response.status})${
        detail ? `: ${detail}` : "."
      }`
    );
  }
};

/*
 * =========================================================
 * GMAIL SMTP (FALLBACK)
 * =========================================================
 */
const getEmailTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error(
      "Email is not configured. Set BREVO_API_KEY + EMAIL_FROM, or EMAIL_USER + EMAIL_PASSWORD."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    dnsTimeout: 5000,
  });
};

const sendWithGmail = async ({ to, subject, html, text }) => {
  const transporter = getEmailTransporter();

  await transporter.sendMail({
    from: `"FLOGRAM" <${getSenderEmail()}>`,
    to,
    subject,
    text,
    html,
  });
};

const sendEmail = (message) =>
  withTimeout(
    process.env.BREVO_API_KEY
      ? sendWithBrevo(message)
      : sendWithGmail(message),
    EMAIL_SEND_TIMEOUT_MS,
    `The email provider did not respond within ${
      EMAIL_SEND_TIMEOUT_MS / 1000
    } seconds.`
  );

export const sendPasswordResetCode = async ({
  email,
  firstName,
  resetCode,
}) => {
  const { subject, html, text } = buildPasswordResetEmail({
    firstName,
    resetCode,
  });

  await sendEmail({
    to: email,
    toName: firstName || undefined,
    subject,
    html,
    text,
  });
};
