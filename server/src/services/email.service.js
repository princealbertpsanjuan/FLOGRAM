import nodemailer from "nodemailer";

const getEmailTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASSWORD must be configured in the environment variables."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

export const sendPasswordResetCode = async ({
  email,
  firstName,
  resetCode,
}) => {
  const transporter = getEmailTransporter();

  await transporter.sendMail({
    from: `"FLOGRAM" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "FLOGRAM Password Reset Code",
    text: [
      `Hello ${firstName || "FLOGRAM User"},`,
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

        <p>Hello ${firstName || "FLOGRAM User"},</p>

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
          ${resetCode}
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
  });
};