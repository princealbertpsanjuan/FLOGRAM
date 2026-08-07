import Verification from "./verification.model.js";
import User from "../auth/auth.model.js";

/*
 * Convert absolute Windows/Linux upload paths into paths
 * relative to the server project.
 *
 * Example:
 * C:\Projects\FLOGRAM\server\uploads\verification\riders\file.png
 *
 * becomes:
 * uploads/verification/riders/file.png
 */
const normalizePath = (filePath) => {
  return filePath
    .replace(process.cwd(), "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
};

/*
 * RIDER VERIFICATION
 */
export const saveRiderVerification = async (
  userId,
  files
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
      "Only rider accounts can submit rider verification documents."
    );
    error.statusCode = 403;
    throw error;
  }

  const driverLicense =
    files.driverLicense?.[0]?.path
      ? normalizePath(
          files.driverLicense[0].path
        )
      : null;

  const orcr =
    files.orcr?.[0]?.path
      ? normalizePath(files.orcr[0].path)
      : null;

  const policeClearance =
    files.policeClearance?.[0]?.path
      ? normalizePath(
          files.policeClearance[0].path
        )
      : null;

  if (
    !driverLicense ||
    !orcr ||
    !policeClearance
  ) {
    const error = new Error(
      "Driver's License, OR/CR, and Police Clearance are required."
    );
    error.statusCode = 422;
    throw error;
  }

  const verification =
    await Verification.findOneAndUpdate(
      {
        user: userId,
      },
      {
        user: userId,
        role: "rider",

        riderDocuments: {
          driverLicense,
          orcr,
          policeClearance,
        },

        status: "pending",
        remarks: "",
        reviewedBy: null,
        reviewedAt: null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

  user.verificationStatus = "pending";
  await user.save();

  return verification;
};

/*
 * SELLER VERIFICATION
 */
export const saveSellerVerification = async (
  userId,
  files
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
      "Only seller accounts can submit seller verification documents."
    );
    error.statusCode = 403;
    throw error;
  }

  const validId =
    files.validId?.[0]?.path
      ? normalizePath(files.validId[0].path)
      : null;

  const dtiRegistration =
    files.dtiRegistration?.[0]?.path
      ? normalizePath(
          files.dtiRegistration[0].path
        )
      : null;

  const birDocument =
    files.birDocument?.[0]?.path
      ? normalizePath(
          files.birDocument[0].path
        )
      : null;

  const bankProof =
    files.bankProof?.[0]?.path
      ? normalizePath(
          files.bankProof[0].path
        )
      : null;

  const shopLogo =
    files.shopLogo?.[0]?.path
      ? normalizePath(
          files.shopLogo[0].path
        )
      : null;

  if (
    !validId ||
    !dtiRegistration ||
    !birDocument ||
    !bankProof ||
    !shopLogo
  ) {
    const error = new Error(
      "All seller verification documents are required."
    );
    error.statusCode = 422;
    throw error;
  }

  const verification =
    await Verification.findOneAndUpdate(
      {
        user: userId,
      },
      {
        user: userId,
        role: "seller",

        sellerDocuments: {
          validId,
          dtiRegistration,
          birDocument,
          bankProof,
          shopLogo,
        },

        status: "pending",
        remarks: "",
        reviewedBy: null,
        reviewedAt: null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

  user.verificationStatus = "pending";
  await user.save();

  return verification;
};

/*
 * GET CURRENT USER'S VERIFICATION
 */
export const getMyVerification = async (
  userId
) => {
  const verification =
    await Verification.findOne({
      user: userId,
    }).populate(
      "reviewedBy",
      "firstName lastName email"
    );

  if (!verification) {
    const error = new Error(
      "Verification submission was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return verification;
};

/*
 * ADMIN: GET PENDING VERIFICATIONS
 *
 * role can optionally be:
 * seller
 * rider
 */
export const getPendingVerifications = async (
  role
) => {
  const filter = {
    status: "pending",
  };

  if (role) {
    filter.role = role;
  }

  return Verification.find(filter)
    .populate(
      "user",
      "firstName lastName email phoneNumber role verificationStatus"
    )
    .sort({
      createdAt: 1,
    });
};