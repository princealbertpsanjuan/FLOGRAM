import {
  createPasswordResetCode,
  getUserById,
  loginUser,
  registerUser,
  resetUserPassword,
  verifyPasswordResetCode,
} from "./auth.service.js";

import {
  isEmailConfigured,
  sendPasswordResetCode,
  withTimeout,
} from "../../services/email.service.js";

/*
 * The whole forgot-password request (database + email)
 * must answer within this time, so the app never waits
 * until its own request timeout.
 */
const FORGOT_PASSWORD_TIMEOUT_MS = 20000;

const FORGOT_PASSWORD_EMAIL_ERROR =
  "We couldn't send the email right now. Please try again in a few minutes.";

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message:
        result.user.verificationStatus === "pending"
          ? "Account created successfully and is awaiting verification."
          : "Account created successfully.",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser({
      email: req.body.email,
      password: req.body.password,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Authenticated user retrieved successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * Generate a password reset code and send it to the user's
 * registered email address.
 *
 * The same public response is returned when the email does not exist
 * so the endpoint does not reveal which email addresses are registered.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    /*
     * Fail fast with a clear message when the server has
     * no email provider configured at all.
     */
    if (!isEmailConfigured()) {
      console.error(
        "Password reset email failed: no email provider configured (set BREVO_API_KEY + EMAIL_FROM, or EMAIL_USER + EMAIL_PASSWORD)."
      );

      const error = new Error(
        "Password reset by email is not available right now. Please contact FLOGRAM support."
      );
      error.statusCode = 503;
      throw error;
    }

    const sendResetEmail = async () => {
      const result = await createPasswordResetCode(req.body.email);

      if (!result.userExists) {
        return;
      }

      try {
        await sendPasswordResetCode({
          email: result.email,
          firstName: result.firstName,
          resetCode: result.resetCode,
        });
      } catch (emailError) {
        /*
         * Log the real cause (bad API key, unverified
         * sender, blocked SMTP...) and give the app a
         * friendly message instead of a raw 500.
         */
        console.error("Password reset email failed:", emailError);

        const error = new Error(FORGOT_PASSWORD_EMAIL_ERROR);
        error.statusCode = 503;
        throw error;
      }
    };

    try {
      await withTimeout(
        sendResetEmail(),
        FORGOT_PASSWORD_TIMEOUT_MS,
        "Forgot password request timed out."
      );
    } catch (error) {
      if (error?.statusCode) {
        throw error;
      }

      console.error("Forgot password failed:", error);

      const friendlyError = new Error(FORGOT_PASSWORD_EMAIL_ERROR);
      friendlyError.statusCode = 503;
      throw friendlyError;
    }

    res.status(200).json({
      success: true,
      message:
        "If an account exists for this email address, a password reset code has been sent.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * Verify the six-digit password reset code.
 */
export const verifyResetCode = async (req, res, next) => {
  try {
    const result = await verifyPasswordResetCode({
      email: req.body.email,
      code: req.body.code,
    });

    res.status(200).json({
      success: true,
      message: "Password reset code verified successfully.",
      data: {
        email: result.email,
        verified: result.verified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * Set a new password after the reset code has been verified.
 */
export const resetPassword = async (req, res, next) => {
  try {
    await resetUserPassword({
      email: req.body.email,
      newPassword: req.body.newPassword,
    });

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now log in using your new password.",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  /*
   * The first implementation uses stateless access tokens.
   * The mobile client logs out by deleting its stored token.
   */
  res.status(200).json({
    success: true,
    message: "Logout successful. Remove the access token from the client.",
  });
};