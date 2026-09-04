import mongoose from "mongoose";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const normalizeOptionalString = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized ||
    null;
};

const normalizeStringArray = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  /*
   * Multipart/form-data may send
   * arrays as JSON strings.
   *
   * Example:
   *
   * '["Rose","Tulip"]'
   */

  if (
    typeof value ===
    "string"
  ) {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(
          trimmed
        );

      if (
        Array.isArray(
          parsed
        )
      ) {
        value =
          parsed;
      } else {
        value =
          [trimmed];
      }
    } catch {
      /*
       * Also allow comma-separated
       * values from multipart forms.
       */

      value =
        trimmed
          .split(",")
          .map(
            (item) =>
              item.trim()
          )
          .filter(Boolean);
    }
  }

  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return [
    ...new Set(
      value
        .map(
          (item) =>
            String(
              item || ""
            ).trim()
        )
        .filter(Boolean)
    ),
  ];
};

const parseOptionalNumber = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    Number.isNaN(
      number
    )
  ) {
    return NaN;
  }

  return number;
};

/*
 * =========================================================
 * CREATE CUSTOM BOUQUET REQUEST VALIDATION
 * =========================================================
 *
 * IMPORTANT:
 *
 * floristId is intentionally NOT required.
 *
 * The new custom bouquet workflow broadcasts
 * the request to all approved / active sellers.
 * =========================================================
 */

export const validateCreateCustomBouquetRequest =
  (
    req,
    res,
    next
  ) => {
    try {
      const body =
        req.body || {};

      /*
       * ===================================================
       * AI CONVERSATION ID
       * ===================================================
       */

      if (
        body.aiConversationId &&
        !isValidObjectId(
          body.aiConversationId
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid AI conversation ID.",
          });
      }

      /*
       * ===================================================
       * AI SOURCE MESSAGE ID
       * ===================================================
       */

      if (
        body.sourceMessageId &&
        !isValidObjectId(
          body.sourceMessageId
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid AI source message ID.",
          });
      }

      /*
       * ===================================================
       * BUDGET
       * ===================================================
       */

      const budget =
        parseOptionalNumber(
          body.budget
        );

      if (
        Number.isNaN(
          budget
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Budget must be a valid number.",
          });
      }

      if (
        budget !== null &&
        budget < 0
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Budget cannot be negative.",
          });
      }

      /*
       * ===================================================
       * QUANTITY
       * ===================================================
       */

      const quantity =
        body.quantity ===
          undefined ||
        body.quantity ===
          null ||
        body.quantity ===
          ""
          ? 1
          : Number(
              body.quantity
            );

      if (
        Number.isNaN(
          quantity
        ) ||
        !Number.isInteger(
          quantity
        ) ||
        quantity < 1
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Quantity must be a whole number of at least 1.",
          });
      }

      /*
       * ===================================================
       * REQUESTED DATE
       * ===================================================
       */

      if (
        body.requestedDate
      ) {
        const requestedDate =
          new Date(
            body.requestedDate
          );

        if (
          Number.isNaN(
            requestedDate
              .getTime()
          )
        ) {
          return res
            .status(400)
            .json({
              success:
                false,

              message:
                "Requested date is invalid.",
            });
        }
      }

      /*
       * ===================================================
       * OCCASION
       * ===================================================
       */

      const occasion =
        normalizeOptionalString(
          body.occasion
        );

      if (
        occasion &&
        occasion.length >
          150
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Occasion must not exceed 150 characters.",
          });
      }

      /*
       * ===================================================
       * THEME
       * ===================================================
       */

      const theme =
        normalizeOptionalString(
          body.theme
        );

      if (
        theme &&
        theme.length >
          200
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Theme must not exceed 200 characters.",
          });
      }

      /*
       * ===================================================
       * BOUQUET SIZE
       * ===================================================
       */

      const bouquetSize =
        normalizeOptionalString(
          body.bouquetSize
        );

      if (
        bouquetSize &&
        bouquetSize.length >
          100
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Bouquet size must not exceed 100 characters.",
          });
      }

      /*
       * ===================================================
       * WRAPPING
       * ===================================================
       */

      const wrapping =
        normalizeOptionalString(
          body.wrapping
        );

      if (
        wrapping &&
        wrapping.length >
          200
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Wrapping preference must not exceed 200 characters.",
          });
      }

      /*
       * ===================================================
       * CUSTOMER MESSAGE
       * ===================================================
       */

      const customerMessage =
        normalizeOptionalString(
          body.customerMessage
        );

      if (
        customerMessage &&
        customerMessage.length >
          2000
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Customer message must not exceed 2000 characters.",
          });
      }

      /*
       * ===================================================
       * NORMALIZE BODY
       * ===================================================
       *
       * This is useful because multipart/form-data
       * sends most values as strings.
       * ===================================================
       */

      req.body = {
        ...body,

        aiConversationId:
          normalizeOptionalString(
            body.aiConversationId
          ),

        sourceMessageId:
          normalizeOptionalString(
            body.sourceMessageId
          ),

        occasion,

        budget,

        quantity,

        requestedDate:
          normalizeOptionalString(
            body.requestedDate
          ),

        flowerTypes:
          normalizeStringArray(
            body.flowerTypes
          ),

        colors:
          normalizeStringArray(
            body.colors
          ),

        styles:
          normalizeStringArray(
            body.styles
          ),

        theme,

        bouquetSize,

        wrapping,

        specialInstructions:
          normalizeStringArray(
            body.specialInstructions
          ),

        customerMessage,
      };

      next();
    } catch (
      error
    ) {
      next(error);
    }
  };

/*
 * =========================================================
 * REQUEST ID VALIDATION
 * =========================================================
 */

export const validateCustomBouquetRequestId =
  (
    req,
    res,
    next
  ) => {
    if (
      !isValidObjectId(
        req.params
          .requestId
      )
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Invalid custom bouquet request ID.",
        });
    }

    next();
  };

/*
 * =========================================================
 * CUSTOMER DECISION MESSAGE
 * =========================================================
 *
 * Kept temporarily for compatibility
 * with any older controller imports.
 *
 * The new proposal-selection endpoint
 * will later have its own validation.
 * =========================================================
 */

export const validateCustomerDecision =
  (
    req,
    res,
    next
  ) => {
    const customerDecisionMessage =
      normalizeOptionalString(
        req.body
          ?.customerDecisionMessage
      );

    if (
      customerDecisionMessage &&
      customerDecisionMessage
        .length >
        2000
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Customer decision message must not exceed 2000 characters.",
        });
    }

    req.body = {
      ...req.body,

      customerDecisionMessage,
    };

    next();
  };

/*
 * =========================================================
 * LEGACY SELLER RESPONSE VALIDATION
 * =========================================================
 *
 * Retained temporarily so existing routes
 * do not break while we replace the old
 * accept/reject/quote workflow.
 * =========================================================
 */

export const validateSellerResponse =
  (
    req,
    res,
    next
  ) => {
    const sellerResponse =
      normalizeOptionalString(
        req.body
          ?.sellerResponse
      );

    if (
      sellerResponse &&
      sellerResponse.length >
        2000
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Seller response must not exceed 2000 characters.",
        });
    }

    req.body = {
      ...req.body,

      sellerResponse,
    };

    next();
  };

/*
 * =========================================================
 * LEGACY QUOTE VALIDATION
 * =========================================================
 *
 * Retained temporarily for old route imports.
 *
 * New proposals will later use:
 *
 * validateCreateCustomBouquetProposal
 * =========================================================
 */

export const validateCustomBouquetQuote =
  (
    req,
    res,
    next
  ) => {
    const quotedPrice =
      parseOptionalNumber(
        req.body
          ?.quotedPrice
      );

    if (
      quotedPrice ===
        null ||
      Number.isNaN(
        quotedPrice
      ) ||
      quotedPrice < 0
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "A valid quoted price is required.",
        });
    }

    const sellerResponse =
      normalizeOptionalString(
        req.body
          ?.sellerResponse
      );

    if (
      sellerResponse &&
      sellerResponse.length >
        2000
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Seller response must not exceed 2000 characters.",
        });
    }

    req.body = {
      ...req.body,

      quotedPrice,

      sellerResponse,
    };

    next();
  };