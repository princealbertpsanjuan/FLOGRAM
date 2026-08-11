import Florist from "./florist.model.js";
import User from "../auth/auth.model.js";
import Verification from "../verification/verification.model.js";
import Flower from "../flowers/flower.model.js";

/*
 * SELLER
 * Create florist profile
 */
export const createFloristProfile = async (
  userId,
  profileData
) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error(
      "User account was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "seller") {
    const error = new Error(
      "Only seller accounts can create florist profiles."
    );
    error.statusCode = 403;
    throw error;
  }

  const existingProfile = await Florist.findOne({
    owner: userId,
  });

  if (existingProfile) {
    const error = new Error(
      "A florist profile already exists for this account."
    );
    error.statusCode = 409;
    throw error;
  }

  const florist = await Florist.create({
    owner: userId,
    shopName: profileData.shopName,
    description: profileData.description,
    address: profileData.address,
    contactNumber: profileData.contactNumber,
    businessEmail: profileData.businessEmail,
    verificationStatus: "pending",
  });

  user.verificationStatus = "pending";
  await user.save();

  return florist;
};

/*
 * SELLER
 * Get own florist profile
 */
export const getMyFloristProfile = async (
  userId
) => {
  const florist = await Florist.findOne({
    owner: userId,
  }).populate(
    "owner",
    "firstName lastName email phoneNumber role verificationStatus"
  );

  if (!florist) {
    const error = new Error(
      "Florist profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return florist;
};

/*
 * SELLER
 * Update own florist profile
 */
export const updateFloristProfile = async (
  userId,
  profileData
) => {
  const florist = await Florist.findOne({
    owner: userId,
  });

  if (!florist) {
    const error = new Error(
      "Florist profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "shopName",
    "description",
    "contactNumber",
    "businessEmail",
  ];

  allowedFields.forEach((field) => {
    if (profileData[field] !== undefined) {
      florist[field] = profileData[field];
    }
  });

  if (profileData.address) {
    florist.address = {
      ...florist.address.toObject(),
      ...profileData.address,
    };
  }

  await florist.save();

  return florist;
};

/*
 * ADMIN
 * Get pending florists
 */
export const getPendingFlorists = async () => {
  return Florist.find({
    verificationStatus: "pending",
  })
    .populate(
      "owner",
      "firstName lastName email phoneNumber role verificationStatus"
    )
    .sort({
      createdAt: 1,
    });
};

/*
 * ADMIN
 * Get florist by ID
 */
export const getFloristById = async (
  floristId
) => {
  const florist = await Florist.findById(
    floristId
  )
    .populate(
      "owner",
      "firstName lastName email phoneNumber role verificationStatus"
    )
    .populate(
      "verifiedBy",
      "firstName lastName email"
    );

  if (!florist) {
    const error = new Error(
      "Florist profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return florist;
};

/*
 * ADMIN
 * Approve florist
 */
export const approveFlorist = async (
  floristId,
  adminId
) => {
  const florist = await Florist.findById(
    floristId
  );

  if (!florist) {
    const error = new Error(
      "Florist profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const verification =
    await Verification.findOne({
      user: florist.owner,
      role: "seller",
    });

  if (!verification) {
    const error = new Error(
      "Seller verification documents were not found."
    );
    error.statusCode = 400;
    throw error;
  }

  if (verification.status !== "pending") {
    const error = new Error(
      `This seller verification is already ${verification.status}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const reviewedAt = new Date();

  florist.verificationStatus = "approved";
  florist.verificationRemarks = "";
  florist.verifiedAt = reviewedAt;
  florist.verifiedBy = adminId;

  await florist.save();

  await User.findByIdAndUpdate(
    florist.owner,
    {
      verificationStatus: "approved",
    },
    {
      runValidators: true,
    }
  );

  verification.status = "approved";
  verification.remarks = "";
  verification.reviewedBy = adminId;
  verification.reviewedAt = reviewedAt;

  await verification.save();

  return florist;
};

/*
 * ADMIN
 * Reject florist
 */
export const rejectFlorist = async (
  floristId,
  adminId,
  remarks
) => {
  const florist = await Florist.findById(
    floristId
  );

  if (!florist) {
    const error = new Error(
      "Florist profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const verification =
    await Verification.findOne({
      user: florist.owner,
      role: "seller",
    });

  if (!verification) {
    const error = new Error(
      "Seller verification documents were not found."
    );
    error.statusCode = 400;
    throw error;
  }

  if (verification.status !== "pending") {
    const error = new Error(
      `This seller verification is already ${verification.status}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const reviewedAt = new Date();

  florist.verificationStatus = "rejected";
  florist.verificationRemarks = remarks;
  florist.verifiedAt = reviewedAt;
  florist.verifiedBy = adminId;
  florist.isActive = false;

  await florist.save();

  await User.findByIdAndUpdate(
    florist.owner,
    {
      verificationStatus: "rejected",
    },
    {
      runValidators: true,
    }
  );

  verification.status = "rejected";
  verification.remarks = remarks;
  verification.reviewedBy = adminId;
  verification.reviewedAt = reviewedAt;

  await verification.save();

  return florist;
};

/*
 * PUBLIC
 * Get all approved and active florist shops
 */
export const getPublicFlorists = async () => {
  return Florist.find({
    verificationStatus: "approved",
    isActive: true,
  })
    .populate(
      "owner",
      "firstName lastName"
    )
    .sort({
      createdAt: -1,
    });
};

/*
 * PUBLIC
 * Get one approved and active florist shop
 */
export const getPublicFloristById = async (
  floristId
) => {
  const florist = await Florist.findOne({
    _id: floristId,
    verificationStatus: "approved",
    isActive: true,
  }).populate(
    "owner",
    "firstName lastName"
  );

  if (!florist) {
    const error = new Error(
      "Florist shop was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return florist;
};

/*
 * PUBLIC
 * Get available bouquets from a florist shop
 */
export const getPublicFloristFlowers = async (
  floristId
) => {
  const florist = await Florist.findOne({
    _id: floristId,
    verificationStatus: "approved",
    isActive: true,
  });

  if (!florist) {
    const error = new Error(
      "Florist shop was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return Flower.find({
    florist: floristId,
    isActive: true,
    isAvailable: true,
  }).sort({
    createdAt: -1,
  });
};