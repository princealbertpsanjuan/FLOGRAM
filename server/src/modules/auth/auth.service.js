import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "./auth.model.js";

const allowedRegistrationRoles = ["customer", "seller", "rider"];

const RESET_CODE_EXPIRATION_MINUTES = 10;

const generateAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing from the environment variables.");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const generateResetCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashResetCode = (code) => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

export const registerUser = async (userData) => {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const requestedRole = userData.role || "customer";

  if (!allowedRegistrationRoles.includes(requestedRole)) {
    const error = new Error(
      "Only customer, seller, and rider accounts may be registered."
    );
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const requiresVerification = ["seller", "rider"].includes(requestedRole);

  const user = await User.create({
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: normalizedEmail,
    phoneNumber: userData.phoneNumber,
    password: userData.password,
    role: requestedRole,
    verificationStatus: requiresVerification
      ? "pending"
      : "not_required",
  });

  const accessToken = generateAccessToken(user);

  return {
    user,
    accessToken,
  };
};

export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  /*
   * Password has select: false in the schema, so it must be explicitly
   * included when authenticating.
   */
  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    const error = new Error("Invalid email address or password.");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    const error = new Error("Invalid email address or password.");
    error.statusCode = 401;
    throw error;
  }

  if (user.accountStatus !== "active") {
    const error = new Error(
      `This account is currently ${user.accountStatus}.`
    );
    error.statusCode = 403;
    throw error;
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = generateAccessToken(user);

  /*
   * Password was manually selected, so convert to a safe object before
   * returning it.
   */
  const safeUser = user.toObject();
  delete safeUser.password;

  return {
    user: safeUser,
    accessToken,
  };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/*
 * Create a temporary six-digit password reset code.
 *
 * The plain code is returned only so the controller/email service can send
 * it to the user's registered email address. Only a SHA-256 hash of the
 * code is stored in MongoDB.
 */
export const createPasswordResetCode = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select(
    "+passwordResetCode +passwordResetCodeExpiresAt +passwordResetVerified"
  );

  if (!user) {
    /*
     * Do not reveal whether an email address is registered.
     */
    return {
      userExists: false,
      resetCode: null,
      email: normalizedEmail,
    };
  }

  const resetCode = generateResetCode();

  user.passwordResetCode = hashResetCode(resetCode);
  user.passwordResetCodeExpiresAt = new Date(
    Date.now() + RESET_CODE_EXPIRATION_MINUTES * 60 * 1000
  );
  user.passwordResetVerified = false;

  await user.save();

  return {
    userExists: true,
    resetCode,
    email: user.email,
    firstName: user.firstName,
  };
};

/*
 * Verify the six-digit code that was sent to the user's email address.
 */
export const verifyPasswordResetCode = async ({ email, code }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select(
    "+passwordResetCode +passwordResetCodeExpiresAt +passwordResetVerified"
  );

  if (!user || !user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
    const error = new Error("Invalid or expired password reset code.");
    error.statusCode = 400;
    throw error;
  }

  if (user.passwordResetCodeExpiresAt.getTime() < Date.now()) {
    user.passwordResetCode = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetVerified = false;

    await user.save();

    const error = new Error("Password reset code has expired.");
    error.statusCode = 400;
    throw error;
  }

  const submittedCodeHash = hashResetCode(normalizedCode);

  if (submittedCodeHash !== user.passwordResetCode) {
    const error = new Error("Invalid password reset code.");
    error.statusCode = 400;
    throw error;
  }

  user.passwordResetVerified = true;
  await user.save();

  return {
    email: user.email,
    verified: true,
  };
};

/*
 * Replace the password after the reset code has been successfully verified.
 */
export const resetUserPassword = async ({ email, newPassword }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select(
    "+password +passwordResetCode +passwordResetCodeExpiresAt +passwordResetVerified"
  );

  if (!user) {
    const error = new Error("Password reset request is invalid or expired.");
    error.statusCode = 400;
    throw error;
  }

  if (
    !user.passwordResetVerified ||
    !user.passwordResetCode ||
    !user.passwordResetCodeExpiresAt
  ) {
    const error = new Error(
      "Verify your password reset code before changing your password."
    );
    error.statusCode = 403;
    throw error;
  }

  if (user.passwordResetCodeExpiresAt.getTime() < Date.now()) {
    user.passwordResetCode = null;
    user.passwordResetCodeExpiresAt = null;
    user.passwordResetVerified = false;

    await user.save();

    const error = new Error(
      "Password reset request has expired. Request a new code."
    );
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;

  user.passwordResetCode = null;
  user.passwordResetCodeExpiresAt = null;
  user.passwordResetVerified = false;

  await user.save();

  return {
    email: user.email,
  };
};