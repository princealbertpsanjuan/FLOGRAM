import {
  body,
  query,
  validationResult,
} from "express-validator";

import {
  PHONE_ERROR,
  isValidPhone,
  normalizePhone,
} from "../../utils/contactFormats.js";

/*
 * =========================================================
 * PROFILE
 * =========================================================
 */

export const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "First name cannot be empty."
    )
    .isLength({
      max: 50,
    })
    .withMessage(
      "First name cannot exceed 50 characters."
    ),

  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Last name cannot be empty."
    )
    .isLength({
      max: 50,
    })
    .withMessage(
      "Last name cannot exceed 50 characters."
    ),

  body("phoneNumber")
    .optional()
    .trim()
    .custom((value) =>
      isValidPhone(value)
    )
    .withMessage(PHONE_ERROR)
    .customSanitizer(
      normalizePhone
    ),
];

/*
 * =========================================================
 * SAVED ADDRESSES
 * =========================================================
 *
 * The contact number on a saved address is optional;
 * when given it must be a valid PH mobile number
 * (stored as 09XXXXXXXXX).
 * =========================================================
 */

export const updateAddressesValidation = [
  body("addresses")
    .isArray()
    .withMessage(
      "Addresses must be a list."
    ),

  body("addresses.*.recipientPhoneNumber")
    .optional({
      values: "falsy",
    })
    .trim()
    .custom((value) =>
      isValidPhone(value)
    )
    /*
     * The whole list is sent on every save, so name the
     * address whose number is wrong (it may be an older
     * saved address, not the one being edited).
     */
    .withMessage((_, { req, path }) => {
      const index = Number(
        /\[(\d+)\]/.exec(String(path))?.[1]
      );

      const label = Number.isInteger(index)
        ? String(req.body?.addresses?.[index]?.label || "").trim() ||
          `Address ${index + 1}`
        : "Saved address";

      return `${label}: ${PHONE_ERROR}`;
    })
    .customSanitizer(
      normalizePhone
    ),
];

/*
 * =========================================================
 * CHANGE PASSWORD
 * =========================================================
 */

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage(
      "Current password is required."
    ),

  body("newPassword")
    .notEmpty()
    .withMessage(
      "New password is required."
    )
    .isLength({
      min: 8,
    })
    .withMessage(
      "New password must contain at least 8 characters."
    )
    .matches(/[a-z]/)
    .withMessage(
      "New password must contain a lowercase letter."
    )
    .matches(/[A-Z]/)
    .withMessage(
      "New password must contain an uppercase letter."
    )
    .matches(/[0-9]/)
    .withMessage(
      "New password must contain a number."
    ),

  body("confirmNewPassword")
    .notEmpty()
    .withMessage(
      "Password confirmation is required."
    )
    .custom(
      (
        value,
        { req }
      ) => {
        if (
          value !==
          req.body.newPassword
        ) {
          throw new Error(
            "Password confirmation does not match."
          );
        }

        return true;
      }
    ),
];

/*
 * =========================================================
 * ADMIN USER FILTERS
 * =========================================================
 */

export const adminUserListValidation = [
  query("role")
    .optional()
    .isIn([
      "customer",
      "seller",
      "rider",
      "admin",
    ])
    .withMessage(
      "Role must be customer, seller, rider, or admin."
    ),

  query("accountStatus")
    .optional()
    .isIn([
      "active",
      "inactive",
      "suspended",
      "banned",
    ])
    .withMessage(
      "Account status must be active, inactive, or suspended."
    ),

  query("verificationStatus")
    .optional()
    .isIn([
      "not_required",
      "pending",
      "approved",
      "rejected",
    ])
    .withMessage(
      "Verification status is invalid."
    ),

  query("search")
    .optional()
    .trim()
    .isLength({
      max: 120,
    })
    .withMessage(
      "Search cannot exceed 120 characters."
    ),
];

/*
 * =========================================================
 * ADMIN ACCOUNT STATUS
 * =========================================================
 */

export const adminUpdateUserStatusValidation =
  [
    body("accountStatus")
      .notEmpty()
      .withMessage(
        "Account status is required."
      )
      .isIn([
        "active",
        "inactive",
        "suspended",
      ])
      .withMessage(
        "Account status must be active, inactive, or suspended."
      ),
  ];

/*
 * =========================================================
 * VALIDATION RESULT
 * =========================================================
 */

export const validateUserRequest = (
  req,
  res,
  next
) => {
  const errors =
    validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res
    .status(422)
    .json({
      success: false,
      message:
        "Validation failed.",
      errors: errors
        .array()
        .map((error) => ({
          field: error.path,
          message: error.msg,
        })),
    });
};