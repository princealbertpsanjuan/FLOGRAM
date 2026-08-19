import Order from "../orders/order.model.js";

import {
  createPayMongoCheckoutSession,
  parsePayMongoWebhook,
  verifyPayMongoWebhookSignature,
} from "./paymongo.service.js";

/*
 * =========================================================
 * CUSTOMER
 * CREATE PAYMONGO CHECKOUT SESSION
 * =========================================================
 */
export const createCheckout = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await Order.findOne({
        _id:
          req.params.orderId,

        customer:
          req.user.userId,
      }).populate(
        "customer",
        "firstName lastName email phoneNumber"
      );

    if (!order) {
      const error = new Error(
        "Order was not found or does not belong to this customer."
      );

      error.statusCode = 404;

      throw error;
    }

    if (
      order.orderStatus ===
      "cancelled"
    ) {
      const error = new Error(
        "Payment cannot be initiated for a cancelled order."
      );

      error.statusCode = 400;

      throw error;
    }

    if (
      order.paymentMethod !==
      "paymongo"
    ) {
      const error = new Error(
        "This order does not use PayMongo as its payment method."
      );

      error.statusCode = 400;

      throw error;
    }

    if (
      order.paymentStatus ===
      "paid"
    ) {
      const error = new Error(
        "This order has already been paid."
      );

      error.statusCode = 409;

      throw error;
    }

    /*
     * Reuse an existing checkout URL
     * instead of creating duplicates.
     */
    if (
      order.paymentStatus ===
        "pending" &&
      order
        .paymongoCheckoutSessionId &&
      order
        .paymentCheckoutUrl
    ) {
      return res
        .status(200)
        .json({
          success: true,

          message:
            "Existing PayMongo checkout session retrieved successfully.",

          data: {
            orderId:
              order._id,

            checkoutSessionId:
              order
                .paymongoCheckoutSessionId,

            checkoutUrl:
              order
                .paymentCheckoutUrl,

            paymentStatus:
              order
                .paymentStatus,
          },
        });
    }

    const result =
      await createPayMongoCheckoutSession({
        order,

        customer:
          order.customer,
      });

    order.paymentProvider =
      "paymongo";

    order.paymentStatus =
      "pending";

    order.paymongoCheckoutSessionId =
      result.checkoutSessionId;

    order.paymentCheckoutUrl =
      result.checkoutUrl;

    order.paymentInitiatedAt =
      new Date();

    order.paymentFailedAt =
      null;

    await order.save();

    return res
      .status(201)
      .json({
        success: true,

        message:
          "PayMongo checkout session created successfully.",

        data: {
          orderId:
            order._id,

          checkoutSessionId:
            result
              .checkoutSessionId,

          checkoutUrl:
            result
              .checkoutUrl,

          paymentStatus:
            order
              .paymentStatus,
        },
      });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER
 * GET PAYMENT STATUS
 * =========================================================
 */
export const getPaymentStatus =
  async (
    req,
    res,
    next
  ) => {
    try {
      const order =
        await Order.findOne({
          _id:
            req.params.orderId,

          customer:
            req.user.userId,
        }).select(
          [
            "_id",
            "productName",
            "totalAmount",
            "paymentMethod",
            "paymentProvider",
            "paymentChannel",
            "paymentStatus",
            "paymongoCheckoutSessionId",
            "paymongoPaymentIntentId",
            "paymongoPaymentId",
            "paymentCheckoutUrl",
            "paymentInitiatedAt",
            "paidAt",
            "paymentFailedAt",
            "refundedAt",
            "lastPaymentEventId",
          ].join(" ")
        );

      if (!order) {
        const error =
          new Error(
            "Order was not found or does not belong to this customer."
          );

        error.statusCode =
          404;

        throw error;
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Order payment status retrieved successfully.",

          data: {
            order,
          },
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
 * IMPORTANT:
 *
 * app.js preserves the ORIGINAL raw
 * JSON bytes in req.rawBody.
 *
 * PayMongo webhook authenticity is
 * verified before processing anything.
 * =========================================================
 */
export const payMongoWebhook =
  async (
    req,
    res
  ) => {
    try {
      const rawBody =
        Buffer.isBuffer(
          req.body
        )
          ? req.body
          : req.rawBody;

      const signature =
        req.headers[
          "paymongo-signature"
        ];

      /*
       * Verify webhook authenticity.
       */
      if (
        !rawBody ||
        !verifyPayMongoWebhookSignature(
          rawBody,
          signature
        )
      ) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Invalid PayMongo webhook signature.",
          });
      }

      const payload =
        parsePayMongoWebhook(
          rawBody
        );

      /*
       * =====================================================
       * PAYMONGO EVENT STRUCTURE
       * =====================================================
       *
       * data.type
       *   = "event"
       *
       * data.attributes.type
       *   = actual webhook event
       *
       * Example:
       *
       * checkout_session.payment.paid
       *
       * data.attributes.data
       *   = actual checkout session
       */
      const eventId =
        payload?.data?.id ||
        null;

      const eventType =
        payload?.data
          ?.attributes
          ?.type ||
        null;

      const eventData =
        payload?.data
          ?.attributes
          ?.data ||
        null;

      /*
       * Ignore webhook types that
       * FLOGRAM does not process yet.
       */
      if (
        eventType !==
        "checkout_session.payment.paid"
      ) {
        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook acknowledged.",
          });
      }

      /*
       * checkout_session.payment.paid
       * should contain the checkout
       * session as event data.
       */
      const session =
        eventData;

      if (!session) {
        console.error(
          "PayMongo paid webhook has no checkout session."
        );

        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook acknowledged but contained no checkout session.",
          });
      }

      const attributes =
        session.attributes ||
        {};

      const metadata =
        attributes.metadata ||
        {};

      const referenceNumber =
        attributes
          .reference_number ||
        "";

      /*
       * Prefer our metadata orderId.
       *
       * Fallback:
       *
       * FLOGRAM-<ORDER_ID>
       */
      let orderId =
        metadata.orderId ||
        null;

      if (
        !orderId &&
        referenceNumber
          .startsWith(
            "FLOGRAM-"
          )
      ) {
        orderId =
          referenceNumber.replace(
            "FLOGRAM-",
            ""
          );
      }

      /*
       * Find order using:
       *
       * 1. PayMongo checkout session ID
       * 2. FLOGRAM order ID
       */
      const queryOptions =
        [];

      if (session.id) {
        queryOptions.push({
          paymongoCheckoutSessionId:
            session.id,
        });
      }

      if (orderId) {
        queryOptions.push({
          _id:
            orderId,
        });
      }

      if (
        queryOptions.length ===
        0
      ) {
        console.error(
          "Unable to identify order from PayMongo webhook."
        );

        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook acknowledged but no order reference was found.",
          });
      }

      const order =
        await Order.findOne({
          $or:
            queryOptions,
        });

      if (!order) {
        console.error(
          "No FLOGRAM order matches PayMongo checkout:",
          session.id
        );

        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook acknowledged but order was not found.",
          });
      }

      /*
       * Ensure webhook belongs to the
       * checkout session stored on the
       * FLOGRAM order.
       */
      if (
        order
          .paymongoCheckoutSessionId &&
        session.id &&
        order
          .paymongoCheckoutSessionId !==
          session.id
      ) {
        console.error(
          "PayMongo checkout session mismatch for order:",
          order._id
        );

        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook acknowledged but checkout session did not match.",
          });
      }

      /*
       * =====================================================
       * FIND SUCCESSFUL PAYMENT
       * =====================================================
       */
      const payments =
        Array.isArray(
          attributes.payments
        )
          ? attributes.payments
          : [];

      const paidPayment =
        payments.find(
          (payment) =>
            payment
              ?.attributes
              ?.status ===
            "paid"
        );

      if (!paidPayment) {
        console.error(
          "PayMongo paid event did not contain a paid payment."
        );

        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook acknowledged but no paid payment was found.",
          });
      }

      /*
       * =====================================================
       * VERIFY PAYMENT AMOUNT
       * =====================================================
       *
       * FLOGRAM totalAmount:
       * pesos
       *
       * PayMongo payment amount:
       * centavos
       */
      const expectedAmount =
        Math.round(
          Number(
            order.totalAmount
          ) * 100
        );

      const actualAmount =
        Number(
          paidPayment
            ?.attributes
            ?.amount
        );

      if (
        !Number.isFinite(
          actualAmount
        ) ||
        actualAmount !==
          expectedAmount
      ) {
        console.error(
          "PayMongo payment amount mismatch.",
          {
            orderId:
              order._id,

            expectedAmount,

            actualAmount,
          }
        );

        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook acknowledged but payment amount did not match the order.",
          });
      }

      /*
       * =====================================================
       * DUPLICATE EVENT PROTECTION
       * =====================================================
       */
      if (
        eventId &&
        order.lastPaymentEventId ===
          eventId
      ) {
        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo webhook event was already processed.",
          });
      }

      if (
        order.paymentStatus ===
          "paid" &&
        order.paymongoPaymentId ===
          paidPayment.id
      ) {
        /*
         * Keep event ID updated if
         * necessary.
         */
        if (eventId) {
          order.lastPaymentEventId =
            eventId;

          await order.save();
        }

        return res
          .status(200)
          .json({
            success:
              true,

            message:
              "PayMongo payment was already processed.",
          });
      }

      /*
       * =====================================================
       * SAVE SUCCESSFUL PAYMENT
       * =====================================================
       */
      const paymentAttributes =
        paidPayment.attributes ||
        {};

      order.paymentStatus =
        "paid";

      order.paymentProvider =
        "paymongo";

      order.paymongoCheckoutSessionId =
        session.id ||
        order
          .paymongoCheckoutSessionId;

      /*
       * Checkout payload may expose
       * payment intent either as:
       *
       * payment_intent.id
       *
       * or payment_intent_id
       */
      order.paymongoPaymentIntentId =
        attributes
          ?.payment_intent
          ?.id ||
        attributes
          ?.payment_intent_id ||
        paymentAttributes
          ?.payment_intent_id ||
        order
          .paymongoPaymentIntentId;

      order.paymongoPaymentId =
        paidPayment.id ||
        order
          .paymongoPaymentId;

      /*
       * Payment channel.
       *
       * PayMongo payment payloads can
       * expose the source/payment type
       * in slightly different shapes.
       */
      order.paymentChannel =
        paymentAttributes
          ?.source
          ?.type ||
        paymentAttributes
          ?.payment_method
          ?.type ||
        paymentAttributes
          ?.type ||
        order
          .paymentChannel ||
        null;

      /*
       * Prefer PayMongo's paid_at value
       * if available.
       *
       * PayMongo commonly returns Unix
       * timestamps in seconds.
       */
      if (
        Number.isFinite(
          Number(
            paymentAttributes
              ?.paid_at
          )
        )
      ) {
        order.paidAt =
          new Date(
            Number(
              paymentAttributes
                .paid_at
            ) * 1000
          );
      } else {
        order.paidAt =
          new Date();
      }

      order.paymentFailedAt =
        null;

      order.lastPaymentEventId =
        eventId;

      await order.save();

      console.log(
        "PayMongo payment completed:",
        {
          orderId:
            String(
              order._id
            ),

          checkoutSessionId:
            order
              .paymongoCheckoutSessionId,

          paymentId:
            order
              .paymongoPaymentId,

          paymentStatus:
            order
              .paymentStatus,
        }
      );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "PayMongo payment processed successfully.",
        });
    } catch (error) {
      console.error(
        "PayMongo webhook processing error:",
        error
      );

      /*
       * Returning a non-2xx response
       * makes PayMongo retry the webhook.
       */
      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "Unable to process PayMongo webhook.",
        });
    }
  };