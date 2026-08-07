import User from "../auth/auth.model.js";

export const getProfileById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateProfileById = async (userId, profileData) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (profileData.firstName !== undefined) {
    user.firstName = profileData.firstName;
  }

  if (profileData.lastName !== undefined) {
    user.lastName = profileData.lastName;
  }

  if (profileData.phoneNumber !== undefined) {
    user.phoneNumber = profileData.phoneNumber;
  }

  await user.save();

  return user;
};

export const changePasswordById = async (
  userId,
  currentPassword,
  newPassword
) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  const passwordMatches = await user.comparePassword(currentPassword);

  if (!passwordMatches) {
    const error = new Error("Current password is incorrect.");
    error.statusCode = 400;
    throw error;
  }

  const samePassword = await user.comparePassword(newPassword);

  if (samePassword) {
    const error = new Error(
      "New password must be different from the current password."
    );
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;

  await user.save();

  return true;
};