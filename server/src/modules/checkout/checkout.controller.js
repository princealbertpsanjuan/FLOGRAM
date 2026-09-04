import {
  createCheckoutPayMongoSession,
  createCustomerCheckout,
  getCustomerCheckout,
  getCustomerCheckouts,
  processCheckoutPayMongoWebhook,
  quoteCustomerCheckout,
} from "./checkout.service.js";

/*
 * =========================================================
 * CUSTOMER
 * GET CHECKOUT QUOTE
 * =========================================================
 */

export const quoteCheckout =
  async (
    req,
    res,
    next
  ) => {
    try {
      const quote =
        await quoteCustomerCheckout(
          req.user.userId,
          req.body
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Checkout quote calculated successfully.",

          data: {
            quote,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * CREATE CHECKOUT + CHILD ORDERS
 * =========================================================
 */

export const createCheckout =
  async (
    req,
    res,
    next
  ) => {
    try {
      const checkout =
        await createCustomerCheckout(
          req.user.userId,
          req.body
        );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            checkout.paymentMethod ===
            "paymongo"
              ? "Checkout created successfully. Online payment can now be initiated."
              : "Checkout and orders created successfully.",

          data: {
            checkout,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * GET OWN CHECKOUTS
 * =========================================================
 */

export const getMine =
  async (
    req,
    res,
    next
  ) => {
    try {
      const checkouts =
        await getCustomerCheckouts(
          req.user.userId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Customer checkouts retrieved successfully.",

          data: {
            count:
              checkouts.length,

            checkouts,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * GET ONE CHECKOUT
 * =========================================================
 */

export const getOne =
  async (
    req,
    res,
    next
  ) => {
    try {
      const checkout =
        await getCustomerCheckout(
          req.params
            .checkoutId,

          req.user.userId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Checkout retrieved successfully.",

          data: {
            checkout,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * CREATE ONE PAYMONGO SESSION
 * =========================================================
 */

export const createPayMongoSession =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await createCheckoutPayMongoSession(
          req.params
            .checkoutId,

          req.user.userId
        );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "PayMongo checkout session created successfully.",

          data:
            result,
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * PAYMONGO WEBHOOK
 * =========================================================
 *
 * No JWT authentication.
 *
 * PayMongo authenticity is checked through its signature.
 *
 * app.js already needs to preserve req.rawBody exactly as
 * your existing payment webhook does.
 * =========================================================
 */

export const payMongoWebhook = async (
  req,
  res,
  next
) => {
  try {
    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body
        : req.rawBody;

    const signature =
      req.headers[
        "paymongo-signature"
      ];

    const result =
      await processCheckoutPayMongoWebhook({
        rawBody,
        signatureHeader:
          signature,
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          result?.message ||
          "PayMongo webhook processed successfully.",
        data: result,
      });
  } catch (error) {
    next(error);
  }
};