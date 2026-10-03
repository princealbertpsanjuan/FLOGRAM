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

    /*
     * Manual reactivation clears any penalty dates.
     */
    if (accountStatus === "active") {
      user.suspendedUntil = null;
      user.suspensionReason = "";
    }

    await user.save();

    return user;
  };

/*
 * =========================================================
 * CUSTOMER ADDRESS BOOK
 * =========================================================
 *
 * GET  /users/me/addresses
 * PUT  /users/me/addresses   (replaces the whole list)
 * =========================================================
 */

const MAX_SAVED_ADDRESSES = 5;

const cleanText = (value, max) =>
  String(value ?? "").trim().slice(0, max);

export const getSavedAddresses = async (userId) => {
  const user = await User.findById(userId).select("savedAddresses");

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  return user.savedAddresses || [];
};

export const replaceSavedAddresses = async (userId, addresses) => {
  if (!Array.isArray(addresses)) {
    const error = new Error("Addresses must be a list.");
    error.statusCode = 400;
    throw error;
  }

  if (addresses.length > MAX_SAVED_ADDRESSES) {
    const error = new Error(`You can save up to ${MAX_SAVED_ADDRESSES} addresses.`);
    error.statusCode = 400;
    throw error;
  }

  const cleaned = addresses.map((address, index) => {
    const item = {
      label: cleanText(address?.label, 40) || `Address ${index + 1}`,
      recipientName: cleanText(address?.recipientName, 120),
      recipientPhoneNumber: cleanText(address?.recipientPhoneNumber, 30),
      street: cleanText(address?.street, 200),
      barangay: cleanText(address?.barangay, 120),
      city: cleanText(address?.city, 120),
      province: cleanText(address?.province, 120),
      postalCode: cleanText(address?.postalCode, 12),
      landmark: cleanText(address?.landmark, 200),
      isDefault: address?.isDefault === true,
    };

    if (!item.street || !item.barangay || !item.city || !item.province) {
      const error = new Error(
        "Each address needs a street, barangay, city and province."
      );
      error.statusCode = 400;
      throw error;
    }

    return item;
  });

  // Exactly one default when the list is not empty.
  const defaultIndex = cleaned.findIndex((item) => item.isDefault);
  cleaned.forEach((item, index) => {
    item.isDefault = cleaned.length > 0 && index === (defaultIndex === -1 ? 0 : defaultIndex);
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { savedAddresses: cleaned } },
    { returnDocument: "after", runValidators: true }
  ).select("savedAddresses");

  if (!user) {
    const error = new Error("User account was not found.");
    error.statusCode = 404;
    throw error;
  }

  return user.savedAddresses;
};
