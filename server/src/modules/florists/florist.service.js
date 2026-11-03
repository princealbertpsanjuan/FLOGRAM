import { applyReviewDecision, flaggedDocumentLabels } from "../verification/verification-review.js";
import { signUploadPath } from "../../services/protectedUploads.service.js";
import Florist from "./florist.model.js";
import { notifySafely } from "../notifications/notify-helpers.js";
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
  const user =
    await User.findById(userId);

  if (!user) {
    const error =
      new Error(
        "User account was not found."
      );

    error.statusCode = 404;

    throw error;
  }

  if (
    user.role !==
    "seller"
  ) {
    const error =
      new Error(
        "Only seller accounts can create florist profiles."
      );

    error.statusCode = 403;

    throw error;
  }

  const existingProfile =
    await Florist.findOne({
      owner:
        userId,
    });

  if (
    existingProfile
  ) {
    const error =
      new Error(
        "A florist profile already exists for this account."
      );

    error.statusCode = 409;

    throw error;
  }

  const florist =
    await Florist.create({
      owner:
        userId,

      shopName:
        profileData.shopName,

      description:
        profileData.description,

      address:
        profileData.address,

      /*
       * Optional map coordinates.
       */
      location: {
        latitude:
          profileData
            ?.location
            ?.latitude ??
          null,

        longitude:
          profileData
            ?.location
            ?.longitude ??
          null,
      },

      contactNumber:
        profileData.contactNumber,

      businessEmail:
        profileData.businessEmail,

      verificationStatus:
        "pending",
    });

  user.verificationStatus =
    "pending";

  await user.save();

  return florist;
};

/*
 * SELLER
 * Get own florist profile
 */
export const getMyFloristProfile =
  async (
    userId
  ) => {
    const florist =
      await Florist.findOne({
        owner:
          userId,
      }).populate(
        "owner",
        "firstName lastName email phoneNumber role verificationStatus"
      );

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    return florist;
  };

/*
 * SELLER
 * Update own florist profile
 */
export const updateFloristProfile =
  async (
    userId,
    profileData
  ) => {
    const florist =
      await Florist.findOne({
        owner:
          userId,
      });

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    const allowedFields = [
      "shopName",
      "description",
      "contactNumber",
      "businessEmail",
    ];

    allowedFields.forEach(
      (field) => {
        if (
          profileData[field] !==
          undefined
        ) {
          florist[field] =
            profileData[field];
        }
      }
    );

    /*
     * Update address without removing
     * fields that were not submitted.
     */
    if (
      profileData.address
    ) {
      florist.address = {
        ...florist.address.toObject(),

        ...profileData.address,
      };
    }

    /*
     * =====================================================
     * SHOP MAP LOCATION
     * =====================================================
     *
     * latitude and longitude must be
     * provided together.
     */
    if (
      profileData.location
    ) {
      const latitude =
        profileData
          .location
          .latitude;

      const longitude =
        profileData
          .location
          .longitude;

      const hasLatitude =
        latitude !==
          undefined &&
        latitude !==
          null;

      const hasLongitude =
        longitude !==
          undefined &&
        longitude !==
          null;

      if (
        hasLatitude !==
        hasLongitude
      ) {
        const error =
          new Error(
            "Shop latitude and longitude must be provided together."
          );

        error.statusCode =
          400;

        throw error;
      }

      if (
        hasLatitude &&
        hasLongitude
      ) {
        florist.location = {
          latitude:
            Number(
              latitude
            ),

          longitude:
            Number(
              longitude
            ),
        };
      }
    }

    await florist.save();

    return florist;
  };

/*
 * ADMIN
 * Get pending florists
 */
export const getPendingFlorists =
  async () => {
    /*
     * Only applicants who already uploaded their
     * requirements are ready for review.
     */
    const submitted =
      await Verification.find({
        role: "seller",
        status: "pending",
      }).distinct("user");

    return Florist.find({
      verificationStatus:
        "pending",
      owner: {
        $in: submitted,
      },
    })
      .populate(
        "owner",
        "firstName lastName email phoneNumber role verificationStatus"
      )
      .sort({
        createdAt:
          1,
      });
  };

/*
 * ADMIN
 * Get florist by ID
 */
export const getFloristById =
  async (
    floristId
  ) => {
    const florist =
      await Florist.findById(
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
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    /*
     * Attach the uploaded requirement photos for Admin
     * review.
     */
    const verification =
      await Verification.findOne({
        user: florist.owner?._id || florist.owner,
        role: "seller",
      })
        .select("sellerDocuments sellerDetails automatedChecks riskLevel documentReviews history status remarks createdAt updatedAt")
        .populate("history.by", "firstName lastName role")
        .lean();

    const docs = verification?.sellerDocuments || {};

    return {
      ...florist.toObject(),
      documents: verification
        ? {
            status: verification.status,
            submittedAt: verification.updatedAt || verification.createdAt,
            files: [
              { key: "validId", label: "Valid government ID", path: docs.validId || null },
              { key: "dtiRegistration", label: "DTI business registration", path: docs.dtiRegistration || null },
              { key: "birDocument", label: "BIR registration", path: docs.birDocument || null },
              { key: "bankProof", label: "Bank account proof", path: docs.bankProof || null },
              { key: "shopLogo", label: "Shop logo", path: docs.shopLogo || null },
            ]
              .filter((file) => file.path)
              .map((file) => ({ ...file, path: signUploadPath(file.path) })),
            details: [
              { label: "ID type", value: verification.sellerDetails?.validIdType || "" },
              { label: "ID expiry", value: verification.sellerDetails?.validIdExpiry ? new Date(verification.sellerDetails.validIdExpiry).toISOString().slice(0, 10) : "" },
              { label: "DTI certificate no.", value: verification.sellerDetails?.dtiNumber || "" },
              { label: "BIR TIN", value: verification.sellerDetails?.tinNumber || "" },
            ].filter((item) => item.value),
            automatedChecks: verification.automatedChecks || [],
            // Older submissions have no automated checks
            riskLevel: verification.automatedChecks?.length ? verification.riskLevel : null,
            documentReviews: verification.documentReviews || [],
            history: verification.history || [],
          }
        : null,
    };
  };

/*
 * ADMIN
 * Approve florist
 */
export const approveFlorist =
  async (
    floristId,
    adminId,
    review = {}
  ) => {
    const florist =
      await Florist.findById(
        floristId
      );

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    const verification =
      await Verification.findOne({
        user:
          florist.owner,

        role:
          "seller",
      });

    if (!verification) {
      const error =
        new Error(
          "Seller verification documents were not found."
        );

      error.statusCode =
        400;

      throw error;
    }

    if (
      verification.status !==
      "pending"
    ) {
      const error =
        new Error(
          `This seller verification is already ${verification.status}.`
        );

      error.statusCode =
        400;

      throw error;
    }

    applyReviewDecision(verification, {
      decision: "approved",
      reviews: review.documentReviews,
      riskAcknowledged: review.riskAcknowledged === true,
      adminId,
    });

    const reviewedAt =
      new Date();

    florist.verificationStatus =
      "approved";

    florist.verificationRemarks =
      "";

    florist.verifiedAt =
      reviewedAt;

    florist.verifiedBy =
      adminId;

    await florist.save();

    await User.findByIdAndUpdate(
      florist.owner,

      {
        verificationStatus:
          "approved",
      },

      {
        runValidators:
          true,
      }
    );

    verification.status =
      "approved";

    verification.remarks =
      "";

    verification.reviewedBy =
      adminId;

    verification.reviewedAt =
      reviewedAt;

    await verification.save();

    await notifySafely({
      recipient: florist.owner,
      role: "seller",
      type: "verification_approved",
      title: "Your shop is approved",
      message: `${florist.shopName} is now live on FLOGRAM. You can add products and receive orders.`,
    });

    return florist;
  };

/*
 * ADMIN
 * Reject florist
 */
export const rejectFlorist =
  async (
    floristId,
    adminId,
    remarks,
    review = {}
  ) => {
    const florist =
      await Florist.findById(
        floristId
      );

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    const verification =
      await Verification.findOne({
        user:
          florist.owner,

        role:
          "seller",
      });

    if (!verification) {
      const error =
        new Error(
          "Seller verification documents were not found."
        );

      error.statusCode =
        400;

      throw error;
    }

    if (
      verification.status !==
      "pending"
    ) {
      const error =
        new Error(
          `This seller verification is already ${verification.status}.`
        );

      error.statusCode =
        400;

      throw error;
    }

    applyReviewDecision(verification, {
      decision: "rejected",
      reviews: review.documentReviews,
      riskAcknowledged: review.riskAcknowledged === true,
      adminId,
      remarks,
    });

    const reviewedAt =
      new Date();

    florist.verificationStatus =
      "rejected";

    florist.verificationRemarks =
      remarks;

    florist.verifiedAt =
      reviewedAt;

    florist.verifiedBy =
      adminId;

    florist.isActive =
      false;

    await florist.save();

    await User.findByIdAndUpdate(
      florist.owner,

      {
        verificationStatus:
          "rejected",
      },

      {
        runValidators:
          true,
      }
    );

    verification.status =
      "rejected";

    verification.remarks =
      remarks;

    verification.reviewedBy =
      adminId;

    verification.reviewedAt =
      reviewedAt;

    await verification.save();

    await notifySafely({
      recipient: florist.owner,
      role: "seller",
      type: "verification_rejected",
      title: "Shop application needs changes",
      message: `${remarks ? `Admin's remarks: ${String(remarks).slice(0, 300)}. ` : ""}${flaggedDocumentLabels(verification).length ? `Resubmit: ${flaggedDocumentLabels(verification).join(", ")}. ` : ""}Please update and resubmit your requirements.`,
    });

    return florist;
  };

/*
 * PUBLIC
 * Get all approved and active florist shops
 */
export const getPublicFlorists =
  async () => {
    return Florist.find({
      verificationStatus:
        "approved",

      isActive:
        true,
    })
      .populate(
        "owner",
        "firstName lastName"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * PUBLIC
 * Get one approved and active florist shop
 */
export const getPublicFloristById =
  async (
    floristId
  ) => {
    const florist =
      await Florist.findOne({
        _id:
          floristId,

        verificationStatus:
          "approved",

        isActive:
          true,
      }).populate(
        "owner",
        "firstName lastName"
      );

    if (!florist) {
      const error =
        new Error(
          "Florist shop was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    return florist;
  };

/*
 * PUBLIC
 * Get available bouquets from a florist shop
 */
export const getPublicFloristFlowers =
  async (
    floristId
  ) => {
    const florist =
      await Florist.findOne({
        _id:
          floristId,

        verificationStatus:
          "approved",

        isActive:
          true,
      });

    if (!florist) {
      const error =
        new Error(
          "Florist shop was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    return Flower.find({
      florist:
        floristId,

      isActive:
        true,

      isAvailable:
        true,
    }).sort({
      createdAt:
        -1,
    });
  };