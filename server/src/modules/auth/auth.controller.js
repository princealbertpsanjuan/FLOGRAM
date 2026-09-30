import {
  createPasswordResetCode,
  getUserById,
  loginUser,
  registerUser,
  resetUserPassword,
  verifyPasswordResetCode,
} from "./auth.service.js";

import { sendPasswordResetCode } from "../../services/email.service.js";

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
    const result = await createPasswordResetCode(req.body.email);

    if (result.userExists) {
      await sendPasswordResetCode({
        email: result.email,
        firstName: result.firstName,
        resetCode: result.resetCode,
      });
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