import crypto from "crypto";

const PAYMONGO_API_URL =
  process.env.PAYMONGO_API_URL ||
  "https://api.paymongo.com";

/*
 * =========================================================
 * PAYMONGO CONFIGURATION
 * =========================================================
 */

const getPayMongoSecretKey = () => {
  const secretKey =
    process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    const error = new Error(
      "PAYMONGO_SECRET_KEY is not configured."
    );

    error.statusCode = 500;

    throw error;
  }

  return secretKey.trim();
};

const getPayMongoWebhookSecret = () => {
  const webhookSecret =
    process.env
      .PAYMONGO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    const error = new Error(
      "PAYMONGO_WEBHOOK_SECRET is not configured."
    );

    error.statusCode = 500;

    throw error;
  }

  return webhookSecret.trim();
};

/*
 * Payment methods that appear
 * in PayMongo Hosted Checkout.
 *
 * Example:
 *
 * PAYMONGO_PAYMENT_METHODS=card,gcash,qrph
 */
const getPaymentMethodTypes = () => {
  const configured =
    process.env
      .PAYMONGO_PAYMENT_METHODS;

  if (!configured) {
    return [
      "card",
      "gcash",
      "qrph",
    ];
  }

  return configured
    .split(",")
    .map((method) =>
      method.trim()
    )
    .filter(Boolean);
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

/*
 * Convert PHP pesos to centavos.
 *
 * ₱1,299 -> 129900
 */
const pesosToCentavos = (
  amount
) => {
  const value =
    Number(amount);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    const error = new Error(
      "Payment amount is invalid."
    );

    error.statusCode = 400;

    throw error;
  }

  return Math.round(
    value * 100
  );
};

/*
 * Add orderId to redirect URL.
 */
const buildRedirectUrl = (
  baseUrl,
  orderId
) => {
  const fallback =
    "https://example.com";

  const value =
    baseUrl || fallback;

  try {
    const url =
      new URL(value);

    url.searchParams.set(
      "orderId",
      String(orderId)
    );

    return url.toString();
  } catch {
    return value;
  }
};

/*
 * PayMongo uses HTTP Basic Auth.
 *
 * Username:
 * sk_test_...
 *
 * Password:
 * blank
 */
const getAuthorizationHeader = () => {
  const secretKey =
    getPayMongoSecretKey();

  return (
    "Basic " +
    Buffer.from(
      `${secretKey}:`
    ).toString("base64")
  );
};

/*
 * =========================================================
 * CREATE CHECKOUT SESSION
 * =========================================================
 */
export const createPayMongoCheckoutSession =
  async ({
    order,
    customer,
  }) => {
    if (!order) {
      const error = new Error(
        "Order is required to create a PayMongo checkout session."
      );

      error.statusCode = 400;

      throw error;
    }

    const successUrl =
      buildRedirectUrl(
        process.env
          .PAYMONGO_SUCCESS_URL ||
          "https://example.com/payment-success",
        order._id
      );

    const cancelUrl =
      buildRedirectUrl(
        process.env
          .PAYMONGO_CANCEL_URL ||
          "https://example.com/payment-cancelled",
        order._id
      );

    /*
     * Create checkout line items.
     */
    const lineItems = [
      {
        name:
          String(
            order.productName ||
              "FLOGRAM Order"
          ).slice(
            0,
            255
          ),

        description:
          String(
            order.productDescription ||
              "FLOGRAM flower order"
          ).slice(
            0,
            255
          ),

        amount:
          pesosToCentavos(
            order.unitPrice
          ),

        currency:
          "PHP",

        quantity:
          Number(
            order.quantity
          ) || 1,
      },
    ];

    /*
     * Include delivery fee once
     * delivery pricing is enabled.
     */
    if (
      Number(
        order.deliveryFee
      ) > 0
    ) {
      lineItems.push({
        name:
          "Delivery Fee",

        description:
          "FLOGRAM delivery fee",

        amount:
          pesosToCentavos(
            order.deliveryFee
          ),

        currency:
          "PHP",

        quantity:
          1,
      });
    }

    /*
     * Customer billing details.
     */
    const billing = {};

    const customerName =
      customer
        ? `${customer.firstName || ""} ${
            customer.lastName || ""
          }`.trim()
        : "";

    if (customerName) {
      billing.name =
        customerName;
    }

    if (customer?.email) {
      billing.email =
        customer.email;
    }

    if (customer?.phoneNumber) {
      billing.phone =
        customer.phoneNumber;
    }

    /*
     * PayMongo Checkout attributes.
     *
     * NOTE:
     * pass_on_fees is intentionally
     * NOT included because this
     * checkout endpoint does not
     * support that field.
     */
    const attributes = {
      line_items:
        lineItems,

      payment_method_types:
        getPaymentMethodTypes(),

      success_url:
        successUrl,

      cancel_url:
        cancelUrl,

      reference_number:
        `FLOGRAM-${order._id}`,

      metadata: {
        orderId:
          String(order._id),

        customerId:
          String(
            order.customer
          ),

        sourceType:
          order.sourceType,
      },

      send_email_receipt:
        true,

      show_description:
        true,

      show_line_items:
        true,
    };

    if (
      Object.keys(
        billing
      ).length > 0
    ) {
      attributes.billing =
        billing;
    }

    /*
     * Create Hosted Checkout session.
     */
    const response =
      await fetch(
        `${PAYMONGO_API_URL}/v1/checkout_sessions`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              getAuthorizationHeader(),

            "Content-Type":
              "application/json",

            /*
             * Prevent accidental duplicate
             * checkout session creation.
             */
            "Idempotency-Key":
              `flogram-order-${order._id}`,
          },

          body:
            JSON.stringify({
              data: {
                attributes,
              },
            }),
        }
      );

    let result;

    try {
      result =
        await response.json();
    } catch {
      const error = new Error(
        "Unable to read the PayMongo API response."
      );

      error.statusCode = 502;

      throw error;
    }

    if (!response.ok) {
      console.error(
        "PayMongo checkout error:",
        result
      );

      const message =
        result?.errors?.[0]
          ?.detail ||
        result?.errors?.[0]
          ?.code ||
        result?.message ||
        "Unable to create PayMongo checkout session.";

      const error =
        new Error(message);

      error.statusCode = 502;

      error.paymongoResponse =
        result;

      throw error;
    }

    const checkoutSession =
      result?.data;

    const checkoutUrl =
      checkoutSession
        ?.attributes
        ?.checkout_url;

    if (
      !checkoutSession?.id ||
      !checkoutUrl
    ) {
      console.error(
        "Unexpected PayMongo checkout response:",
        result
      );

      const error = new Error(
        "PayMongo returned an invalid checkout session."
      );

      error.statusCode = 502;

      throw error;
    }

    return {
      checkoutSessionId:
        checkoutSession.id,

      checkoutUrl,

      livemode:
        checkoutSession
          ?.attributes
          ?.livemode ??
        null,

      raw:
        checkoutSession,
    };
  };

/*
 * =========================================================
 * WEBHOOK SIGNATURE VERIFICATION
 * =========================================================
 *
 * Paymongo-Signature:
 *
 * t=timestamp,
 * te=test_signature,
 * li=live_signature
 */
export const verifyPayMongoWebhookSignature =
  (
    rawBody,
    signatureHeader
  ) => {
    if (
      !Buffer.isBuffer(
        rawBody
      )
    ) {
      return false;
    }

    if (!signatureHeader) {
      return false;
    }

    const parts = {};

    String(
      signatureHeader
    )
      .split(",")
      .forEach((part) => {
        const [
          key,
          ...rest
        ] =
          part
            .trim()
            .split("=");

        if (key) {
          parts[key] =
            rest.join("=");
        }
      });

    const timestamp =
      parts.t;

    if (!timestamp) {
      return false;
    }

    /*
     * Test key -> te
     * Live key -> li
     */
    const secretKey =
      getPayMongoSecretKey();

    const signature =
      secretKey.startsWith(
        "sk_live_"
      )
        ? parts.li
        : parts.te;

    if (!signature) {
      return false;
    }

    /*
     * Replay protection.
     *
     * Default:
     * 5 minutes.
     */
    const toleranceSeconds =
      Number(
        process.env
          .PAYMONGO_WEBHOOK_TOLERANCE_SECONDS ||
          300
      );

    const timestampNumber =
      Number(timestamp);

    if (
      Number.isFinite(
        timestampNumber
      ) &&
      toleranceSeconds > 0
    ) {
      const now =
        Math.floor(
          Date.now() /
            1000
        );

      if (
        Math.abs(
          now -
            timestampNumber
        ) >
        toleranceSeconds
      ) {
        return false;
      }
    }

    /*
     * PayMongo signature payload:
     *
     * timestamp.rawBody
     */
    const signaturePayload =
      `${timestamp}.${rawBody.toString(
        "utf8"
      )}`;

    const expected =
      crypto
        .createHmac(
          "sha256",
          getPayMongoWebhookSecret()
        )
        .update(
          signaturePayload
        )
        .digest(
          "hex"
        );

    const expectedBuffer =
      Buffer.from(
        expected,
        "utf8"
      );

    const receivedBuffer =
      Buffer.from(
        signature,
        "utf8"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    );
  };

/*
 * =========================================================
 * WEBHOOK PAYLOAD PARSER
 * =========================================================
 */
export const parsePayMongoWebhook =
  (
    rawBody
  ) => {
    try {
      const text =
        Buffer.isBuffer(
          rawBody
        )
          ? rawBody.toString(
              "utf8"
            )
          : String(
              rawBody || ""
            );

      return JSON.parse(
        text
      );
    } catch {
      const error = new Error(
        "Invalid PayMongo webhook payload."
      );

      error.statusCode = 400;

      throw error;
    }
  };