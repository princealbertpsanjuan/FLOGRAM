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
     * =====================================================
     * CHECKOUT LINE ITEMS
     * =====================================================
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
     * =====================================================
     * DELIVERY FEE
     * =====================================================
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
     * =====================================================
     * PRE-ORDER FEE
     * =====================================================
     */

    if (
      order.isPreOrder &&
      Number(
        order.preOrderFee
      ) > 0
    ) {
      lineItems.push({
        name:
          "Pre-order Fee",

        description:
          "FLOGRAM scheduled order fee",

        amount:
          pesosToCentavos(
            order.preOrderFee
          ),

        currency:
          "PHP",

        quantity:
          1,
      });
    }

    /*
     * =====================================================
     * SAFETY CHECK
     * =====================================================
     */

    const checkoutTotalCentavos =
      lineItems.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
          ) *
            Number(
              item.quantity ||
                1
            ),
        0
      );

    const expectedTotalCentavos =
      pesosToCentavos(
        order.totalAmount
      );

    if (
      checkoutTotalCentavos !==
      expectedTotalCentavos
    ) {
      console.error(
        "PayMongo checkout total mismatch:",
        {
          orderId:
            String(
              order._id
            ),

          expectedTotalCentavos,

          checkoutTotalCentavos,

          lineItems,
        }
      );

      const error =
        new Error(
          "Checkout amount does not match the order total."
        );

      error.statusCode =
        500;

      throw error;
    }

    /*
     * =====================================================
     * BILLING
     * =====================================================
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

    if (
      customer?.phoneNumber
    ) {
      billing.phone =
        customer.phoneNumber;
    }

    /*
     * =====================================================
     * PAYMONGO ATTRIBUTES
     * =====================================================
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
          String(
            order._id
          ),

        customerId:
          String(
            order.customer
          ),

        sourceType:
          order.sourceType,

        isPreOrder:
          Boolean(
            order.isPreOrder
          ),

        deliveryFee:
          String(
            order.deliveryFee ||
              0
          ),

        preOrderFee:
          String(
            order.preOrderFee ||
              0
          ),

        totalAmount:
          String(
            order.totalAmount ||
              0
          ),
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
     * =====================================================
     * CREATE HOSTED CHECKOUT SESSION
     * =====================================================
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
      const error =
        new Error(
          "Unable to read the PayMongo API response."
        );

      error.statusCode =
        502;

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
        new Error(
          message
        );

      error.statusCode =
        502;

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

      const error =
        new Error(
          "PayMongo returned an invalid checkout session."
        );

      error.statusCode =
        502;

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
 * PayMongo signs the exact raw request body using HMAC-SHA256.
 *
 * This verifier:
 * - requires the raw request body to remain a Buffer
 * - accepts the test (te) or live (li) signature
 * - validates the webhook timestamp against the configured tolerance
 * - compares signatures with crypto.timingSafeEqual()
 * =========================================================
 */

export const verifyPayMongoWebhookSignature = (
  rawBody,
  signatureHeader
) => {
  if (!Buffer.isBuffer(rawBody)) {
    return false;
  }

  if (!signatureHeader) {
    return false;
  }

  const parts = {};

  String(signatureHeader)
    .split(",")
    .forEach((part) => {
      const [key, ...rest] =
        part.trim().split("=");

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

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampNumber
    )
  ) {
    return false;
  }

  const toleranceSeconds =
    Number(
      process.env
        .PAYMONGO_WEBHOOK_TOLERANCE_SECONDS ||
        300
    );

  const now =
    Math.floor(
      Date.now() / 1000
    );

  const timestampAge =
    Math.abs(
      now -
        timestampNumber
    );

  if (
    Number.isFinite(
      toleranceSeconds
    ) &&
    toleranceSeconds > 0 &&
    timestampAge >
      toleranceSeconds
  ) {
    return false;
  }

  const candidateSignatures =
    [
      parts.te,
      parts.li,
    ].filter(
      (value) =>
        typeof value ===
          "string" &&
        value.length > 0
    );

  if (
    candidateSignatures.length ===
    0
  ) {
    return false;
  }

  const webhookSecret =
    getPayMongoWebhookSecret();

  const signaturePayload =
    `${timestamp}.${rawBody.toString(
      "utf8"
    )}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        webhookSecret
      )
      .update(
        signaturePayload
      )
      .digest(
        "hex"
      );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  for (
    const candidate of
    candidateSignatures
  ) {
    const receivedBuffer =
      Buffer.from(
        candidate,
        "utf8"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      continue;
    }

    if (
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      )
    ) {
      return true;
    }
  }

  return false;
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
              rawBody ||
                ""
            );

      return JSON.parse(
        text
      );
    } catch {
      const error =
        new Error(
          "Invalid PayMongo webhook payload."
        );

      error.statusCode =
        400;

      throw error;
    }
  };