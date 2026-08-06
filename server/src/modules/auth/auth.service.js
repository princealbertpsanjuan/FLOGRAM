import jwt from "jsonwebtoken";
import User from "./auth.model.js";

const allowedRegistrationRoles = ["customer", "seller", "rider"];

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