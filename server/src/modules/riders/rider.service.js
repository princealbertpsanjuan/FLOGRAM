import Rider from "./rider.model.js";
import User from "../auth/auth.model.js";
import Verification from "../verification/verification.model.js";

export const createRiderProfile = async (
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

  if (user.role !== "rider") {
    const error = new Error(
      "Only rider accounts can create rider profiles."
    );
    error.statusCode = 403;
    throw error;
  }

  const existingProfile = await Rider.findOne({
    owner: userId,
  });

  if (existingProfile) {
    const error = new Error(
      "A rider profile already exists for this account."
    );
    error.statusCode = 409;
    throw error;
  }

  const rider = await Rider.create({
    owner: userId,
    address: profileData.address,
    vehicleType: profileData.vehicleType,
    vehiclePlateNumber:
      profileData.vehiclePlateNumber || "",
    driverLicenseNumber:
      profileData.driverLicenseNumber,
    emergencyContactName:
      profileData.emergencyContactName,
    emergencyContactNumber:
      profileData.emergencyContactNumber,
    verificationStatus: "pending",
    isAvailable: false,
  });

  user.verificationStatus = "pending";
  await user.save();

  return rider;
};

export const getMyRiderProfile = async (
  userId
) => {
  const rider = await Rider.findOne({
    owner: userId,
  }).populate(
    "owner",
    "firstName lastName email phoneNumber role verificationStatus"
  );

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return rider;
};

export const updateRiderProfile = async (
  userId,
  profileData
) => {
  const rider = await Rider.findOne({
    owner: userId,
  });

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "vehicleType",
    "vehiclePlateNumber",
    "driverLicenseNumber",
    "emergencyContactName",
    "emergencyContactNumber",
  ];

  allowedFields.forEach((field) => {
    if (profileData[field] !== undefined) {
      rider[field] = profileData[field];
    }
  });

  if (profileData.address) {
    rider.address = {
      ...rider.address.toObject(),
      ...profileData.address,
    };
  }

  await rider.save();

  return rider;
};

export const getPendingRiders = async () => {
  return Rider.find({
    verificationStatus: "pending",
  })
    .populate(
      "owner",
      "firstName lastName email phoneNumber role verificationStatus"
    )
    .sort({ createdAt: 1 });
};

export const getRiderById = async (
  riderId
) => {
  const rider = await Rider.findById(riderId)
    .populate(
      "owner",
      "firstName lastName email phoneNumber role verificationStatus"
    )
    .populate(
      "verifiedBy",
      "firstName lastName email"
    );

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return rider;
};

export const approveRider = async (
  riderId,
  adminId
) => {
  const rider = await Rider.findById(riderId);

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const verification =
    await Verification.findOne({
      user: rider.owner,
      role: "rider",
    });

  if (!verification) {
    const error = new Error(
      "Rider verification documents were not found."
    );
    error.statusCode = 400;
    throw error;
  }

  if (verification.status !== "pending") {
    const error = new Error(
      `This rider verification is already ${verification.status}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const reviewedAt = new Date();

  rider.verificationStatus = "approved";
  rider.verificationRemarks = "";
  rider.verifiedAt = reviewedAt;
  rider.verifiedBy = adminId;

  await rider.save();

  await User.findByIdAndUpdate(
    rider.owner,
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

  return rider;
};

export const rejectRider = async (
  riderId,
  adminId,
  remarks
) => {
  const rider = await Rider.findById(riderId);

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  const verification =
    await Verification.findOne({
      user: rider.owner,
      role: "rider",
    });

  if (!verification) {
    const error = new Error(
      "Rider verification documents were not found."
    );
    error.statusCode = 400;
    throw error;
  }

  if (verification.status !== "pending") {
    const error = new Error(
      `This rider verification is already ${verification.status}.`
    );
    error.statusCode = 400;
    throw error;
  }

  const reviewedAt = new Date();

  rider.verificationStatus = "rejected";
  rider.verificationRemarks = remarks;
  rider.verifiedAt = reviewedAt;
  rider.verifiedBy = adminId;
  rider.isAvailable = false;

  await rider.save();

  await User.findByIdAndUpdate(
    rider.owner,
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

  return rider;
};

export const updateRiderAvailability = async (
  userId,
  isAvailable
) => {
  const rider = await Rider.findOne({
    owner: userId,
  });

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  if (
    rider.verificationStatus !== "approved"
  ) {
    const error = new Error(
      "Only approved riders can change availability."
    );
    error.statusCode = 403;
    throw error;
  }

  rider.isAvailable = isAvailable;

  await rider.save();

  return rider;
};