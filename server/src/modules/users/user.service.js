import User from "../auth/auth.model.js";

/*
 * =========================================================
 * MY PROFILE
 * =========================================================
 */

export const getProfileById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateProfileById = async (
  userId,
  profileData
) => {
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

  const passwordMatches =
    await user.comparePassword(currentPassword);

  if (!passwordMatches) {
    const error = new Error(
      "Current password is incorrect."
    );
    error.statusCode = 400;
    throw error;
  }

  const samePassword =
    await user.comparePassword(newPassword);

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

/*
 * =========================================================
 * ADMIN - GET USERS
 * =========================================================
 */

export const getUsersForAdmin = async ({
  role,
  accountStatus,
  verificationStatus,
  search,
} = {}) => {
  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (accountStatus) {
    filter.accountStatus = accountStatus;
  }

  if (verificationStatus) {
    filter.verificationStatus =
      verificationStatus;
  }

  if (search && search.trim()) {
    const cleanSearch = search.trim();

    filter.$or = [
      {
        firstName: {
          $regex: cleanSearch,
          $options: "i",
        },
      },
      {
        lastName: {
          $regex: cleanSearch,
          $options: "i",
        },
      },
      {
        email: {
          $regex: cleanSearch,
          $options: "i",
        },
      },
      {
        phoneNumber: {
          $regex: cleanSearch,
          $options: "i",
        },
      },
    ];
  }

  const users = await User.find(filter)
    .select(
      "firstName lastName email phoneNumber role accountStatus verificationStatus profileImage lastLoginAt createdAt updatedAt"
    )
    .sort({
      createdAt: -1,
    });

  return users;
};

/*
 * =========================================================
 * ADMIN - GET USER DETAILS
 * =========================================================
 */

export const getUserForAdminById = async (
  userId
) => {
  const user = await User.findById(userId).select(
    "firstName lastName email phoneNumber role accountStatus verificationStatus profileImage lastLoginAt createdAt updatedAt"
  );

  if (!user) {
    const error = new Error(
      "User account was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/*
 * =========================================================
 * ADMIN - UPDATE ACCOUNT STATUS
 * =========================================================
 */

export const updateUserAccountStatusByAdmin =
  async (
    userId,
    accountStatus,
    adminId
  ) => {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error(
        "User account was not found."
      );
      error.statusCode = 404;
      throw error;
    }

    /*
     * Prevent an Admin from accidentally
     * suspending or deactivating their own account.
     */
    if (
      user._id.toString() ===
      adminId.toString()
    ) {
      const error = new Error(
        "You cannot change the status of your own Admin account."
      );
      error.statusCode = 400;
      throw error;
    }

    /*
     * Protect Admin accounts from this general
     * user-management action.
     */
    if (user.role === "admin") {
      const error = new Error(
        "Admin account status cannot be changed from User Management."
      );
      error.statusCode = 403;
      throw error;
    }

    user.accountStatus =
      accountStatus;

    await user.save();

    return user;
  };