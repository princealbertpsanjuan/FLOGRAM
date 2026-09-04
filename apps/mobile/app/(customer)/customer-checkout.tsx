import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiRequest } from "../../services/api";

/* =========================================================
 * TYPES
 * ======================================================= */

type FulfillmentType =
  | "delivery"
  | "pickup";

type PaymentMethod =
  | "cash_on_delivery"
  | "cash_on_pickup"
  | "paymongo";

type Address = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

type Florist = {
  _id?: string;
  shopName?: string;
  shopLogo?: string | null;

  address?: Address | null;
};

type Proposal = {
  _id?: string;
  quotedPrice?: number;
  sellerResponse?: string;
  status?: string;

  florist?:
    | Florist
    | string
    | null;
};

type CustomBouquetRequest = {
  _id: string;

  florist?:
    | Florist
    | string
    | null;

  selectedProposal?:
    | Proposal
    | string
    | null;

  inspirationImage?: string | null;

  occasion?: string | null;

  budget?: number | null;

  quantity?: number;

  requestedDate?: string | null;

  customerMessage?: string | null;

  sellerResponse?: string | null;

  quotedPrice?: number | null;

  status?: string;

  proposalSelectedAt?: string | null;

  createdAt?: string;

  updatedAt?: string;
};

type CustomRequestResponse = {
  success: boolean;

  message?: string;

  data?: {
    request?: CustomBouquetRequest;
  };
};

/* =========================================================
 * CART TYPES
 * ======================================================= */

type CartFlower = {
  _id: string;

  florist?:
    | Florist
    | string
    | null;

  name?: string;

  description?: string | null;

  price?: number;

  category?: string;

  occasion?: string[];

  flowerTypes?: string[];

  colors?: string[];

  images?: string[];

  isAvailable?: boolean;

  isActive?: boolean;
};

type CartItem = {
  _id: string;

  flower:
    | CartFlower
    | null;

  quantity: number;

  addedAt?: string;

  isPurchasable?: boolean;

  currentPrice?:
    | number
    | null;

  lineSubtotal?:
    | number
    | null;
};

type Cart = {
  _id: string;

  customer?: string;

  items: CartItem[];

  itemCount: number;

  totalQuantity: number;

  availableItemCount: number;

  unavailableItemCount: number;

  estimatedSubtotal: number;
};

type CartResponse = {
  success: boolean;

  message?: string;

  data?: {
    cart?: Cart;
  };
};

/* =========================================================
 * ORDER TYPES
 * ======================================================= */

type Order = {
  _id: string;

  sourceType?:
    | "flower_listing"
    | "custom_bouquet";

  productName?: string;

  productDescription?:
    | string
    | null;

  inspirationImage?:
    | string
    | null;

  quantity?: number;

  unitPrice?: number;

  subtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  fulfillmentType?:
    | "delivery"
    | "pickup";

  paymentMethod?:
    | PaymentMethod
    | null;

  paymentStatus?: string;

  orderStatus?: string;

  requestedDeliveryDate?:
    | string
    | null;

  florist?: Florist | null;
};

type CreateOrderResponse = {
  success: boolean;

  message?: string;

  data?: {
    order?: Order;
  };
};

type PayMongoCheckoutResponse = {
  success: boolean;

  message?: string;

  data?: {
    orderId?: string;

    checkoutSessionId?: string;

    checkoutUrl?: string;

    paymentStatus?: string;
  };
};

/* =========================================================
 * COLORS
 * ======================================================= */

const COLORS = {
  primary: "#7A1E48",

  primaryDark: "#5E1537",

  primarySoft: "#F8EDF2",

  background: "#FFFDFE",

  card: "#FFFFFF",

  text: "#252025",

  textMuted: "#786F75",

  border: "#EDE4E8",

  graySoft: "#F6F4F5",

  success: "#157347",

  successSoft: "#ECFDF3",

  danger: "#B42318",

  dangerSoft: "#FFF1F0",

  blue: "#2866B1",

  blueSoft: "#EEF5FF",

  warning: "#A15C00",

  warningSoft: "#FFF8E7",
};

/* =========================================================
 * IMAGE
 * ======================================================= */

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  "";

const SERVER_ORIGIN =
  API_BASE.replace(
    /\/api\/v1\/?$/i,
    ""
  ).replace(/\/+$/, "");

const getImageUrl = (
  image?: string | null
) => {
  if (!image) {
    return null;
  }

  const value =
    String(image).trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  const cleaned =
    value
      .replaceAll("\\", "/")
      .replace(/^\/+/, "");

  if (!SERVER_ORIGIN) {
    return cleaned;
  }

  return `${SERVER_ORIGIN}/${cleaned}`;
};

/* =========================================================
 * HELPERS
 * ======================================================= */

const getErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message =
      String(
        (
          error as {
            message?: unknown;
          }
        ).message ?? ""
      ).trim();

    if (message) {
      return message;
    }
  }

  return fallback;
};

const formatCurrency = (
  value?: number | null
) => {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(
      Number(value)
    )
  ) {
    return "—";
  }

  return `₱${Number(
    value
  ).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const isValidPhilippinePhone = (
  value: string
) => {
  return /^(09|\+639)\d{9}$/.test(
    value.trim()
  );
};

const isValidDate = (
  value: string
) => {
  if (!value.trim()) {
    return false;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00`
    );

  return !Number.isNaN(
    date.getTime()
  );
};

const isValidTime = (
  value: string
) => {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value.trim()
  );
};

const getFlorist = (
  request:
    | CustomBouquetRequest
    | null
) => {
  if (!request) {
    return null;
  }

  if (
    request.florist &&
    typeof request.florist ===
      "object"
  ) {
    return request.florist;
  }

  const proposal =
    request.selectedProposal;

  if (
    proposal &&
    typeof proposal ===
      "object" &&
    proposal.florist &&
    typeof proposal.florist ===
      "object"
  ) {
    return proposal.florist;
  }

  return null;
};

const getCartFloristName = (
  item: CartItem
) => {
  const florist =
    item.flower?.florist;

  if (
    florist &&
    typeof florist ===
      "object"
  ) {
    return (
      florist.shopName ||
      "FLOGRAM Florist"
    );
  }

  return "FLOGRAM Florist";
};

const isCartItemPurchasable = (
  item: CartItem
) => {
  if (
    typeof item.isPurchasable ===
    "boolean"
  ) {
    return item.isPurchasable;
  }

  return Boolean(
    item.flower &&
      item.flower.isActive ===
        true &&
      item.flower.isAvailable ===
        true
  );
};

/* =========================================================
 * SCREEN
 * ======================================================= */

export default function CustomerCheckoutScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      customBouquetRequestId?:
        | string
        | string[];

      proposalId?:
        | string
        | string[];

      mode?:
        | string
        | string[];
    }>();

  const customBouquetRequestId =
    Array.isArray(
      params.customBouquetRequestId
    )
      ? params
          .customBouquetRequestId[0] ??
        ""
      : params.customBouquetRequestId ??
        "";

  const mode =
    Array.isArray(params.mode)
      ? params.mode[0] ?? ""
      : params.mode ?? "";

  const isCartCheckout =
    mode === "cart";

  /* =======================================================
   * DATA
   * ===================================================== */

  const [
    request,
    setRequest,
  ] =
    useState<
      CustomBouquetRequest | null
    >(null);

  const [
    cart,
    setCart,
  ] =
    useState<Cart | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    loadError,
    setLoadError,
  ] =
    useState<
      string | null
    >(null);

  /* =======================================================
   * CHECKOUT
   * ===================================================== */

  const [
    fulfillmentType,
    setFulfillmentType,
  ] =
    useState<FulfillmentType>(
      "delivery"
    );

  const [
    recipientName,
    setRecipientName,
  ] =
    useState("");

  const [
    recipientPhone,
    setRecipientPhone,
  ] =
    useState("");

  const [
    street,
    setStreet,
  ] =
    useState("");

  const [
    barangay,
    setBarangay,
  ] =
    useState("");

  const [
    city,
    setCity,
  ] =
    useState("");

  const [
    province,
    setProvince,
  ] =
    useState("");

  const [
    postalCode,
    setPostalCode,
  ] =
    useState("");

  const [
    landmark,
    setLandmark,
  ] =
    useState("");

  const [
    latitude,
    setLatitude,
  ] =
    useState("");

  const [
    longitude,
    setLongitude,
  ] =
    useState("");

  const [
    scheduled,
    setScheduled,
  ] =
    useState(false);

  const [
    deliveryDate,
    setDeliveryDate,
  ] =
    useState("");

  const [
    startTime,
    setStartTime,
  ] =
    useState("");

  const [
    endTime,
    setEndTime,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>(
      "cash_on_delivery"
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  /* =======================================================
   * LOAD CUSTOM REQUEST
   * ===================================================== */

  const loadRequest =
    useCallback(
      async () => {
        if (
          !customBouquetRequestId
        ) {
          throw new Error(
            "No custom bouquet request was provided."
          );
        }

        const response =
          await apiRequest<CustomRequestResponse>(
            `/bloomboard/custom-bouquet-requests/${customBouquetRequestId}`,
            {
              authenticated:
                true,
            }
          );

        const loadedRequest =
          response?.data
            ?.request;

        if (!loadedRequest) {
          throw new Error(
            "The custom bouquet request was not returned by the server."
          );
        }

        if (
          loadedRequest.status !==
          "customer_accepted"
        ) {
          throw new Error(
            "This custom bouquet request is not ready for checkout."
          );
        }

        setRequest(
          loadedRequest
        );
      },
      [
        customBouquetRequestId,
      ]
    );

  /* =======================================================
   * LOAD CART
   * ===================================================== */

  const loadCart =
    useCallback(
      async () => {
        const response =
          await apiRequest<CartResponse>(
            "/cart",
            {
              authenticated:
                true,
            }
          );

        const loadedCart =
          response?.data?.cart;

        if (!loadedCart) {
          throw new Error(
            "The shopping cart was not returned by the server."
          );
        }

        if (
          loadedCart.items.length ===
          0
        ) {
          throw new Error(
            "Your shopping cart is empty."
          );
        }

        if (
          loadedCart.unavailableItemCount >
          0
        ) {
          throw new Error(
            "Your cart contains unavailable flower listings. Remove them before checkout."
          );
        }

        setCart(
          loadedCart
        );
      },
      []
    );

  /* =======================================================
   * LOAD CHECKOUT DATA
   * ===================================================== */

  const loadCheckout =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setLoadError(null);

          if (
            isCartCheckout
          ) {
            await loadCart();
          } else {
            await loadRequest();
          }
        } catch (error) {
          setLoadError(
            getErrorMessage(
              error,
              "Unable to prepare checkout."
            )
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [
        isCartCheckout,
        loadCart,
        loadRequest,
      ]
    );

  useEffect(() => {
    void loadCheckout();
  }, [loadCheckout]);

  /* =======================================================
   * REFRESH
   * ===================================================== */

  const handleRefresh =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await loadCheckout(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [loadCheckout]
    );

  /* =======================================================
   * CUSTOM DERIVED VALUES
   * ===================================================== */

  const florist =
    useMemo(
      () =>
        getFlorist(request),
      [request]
    );

  const customImageUrl =
    getImageUrl(
      request?.inspirationImage
    );

  const customTitle =
    request?.occasion
      ? `Custom ${request.occasion} Bouquet`
      : "Custom Bouquet";

  const quotedPrice =
    request?.quotedPrice ??
    (
      typeof request
        ?.selectedProposal ===
        "object"
        ? request
            .selectedProposal
            ?.quotedPrice
        : undefined
    ) ??
    null;

  const customQuantity =
    Math.max(
      Number(
        request?.quantity
      ) || 1,
      1
    );

  const customSubtotal =
    quotedPrice !== null
      ? quotedPrice *
        customQuantity
      : null;

  /* =======================================================
   * CART DERIVED VALUES
   * ===================================================== */

  const cartItems =
    cart?.items ?? [];

  const cartSubtotal =
    cart?.estimatedSubtotal ??
    0;

  const cartTotalQuantity =
    cart?.totalQuantity ??
    0;

  const cartHasMultipleItems =
    cartItems.length > 1;

  /*
   * Current backend creates one Order
   * document per flower listing.
   *
   * Therefore multiple cart products
   * create multiple orders.
   *
   * Hosted PayMongo checkout is kept
   * to one cart item per checkout so
   * we do not open multiple hosted
   * payment pages at once.
   */

  useEffect(() => {
    if (
      isCartCheckout &&
      cartHasMultipleItems &&
      paymentMethod ===
        "paymongo"
    ) {
      setPaymentMethod(
        fulfillmentType ===
          "delivery"
          ? "cash_on_delivery"
          : "cash_on_pickup"
      );
    }
  }, [
    isCartCheckout,
    cartHasMultipleItems,
    paymentMethod,
    fulfillmentType,
  ]);

  /* =======================================================
   * FULFILLMENT
   * ===================================================== */

  const chooseFulfillment = (
    value: FulfillmentType
  ) => {
    setFulfillmentType(
      value
    );

    if (
      value === "delivery"
    ) {
      if (
        paymentMethod ===
        "cash_on_pickup"
      ) {
        setPaymentMethod(
          "cash_on_delivery"
        );
      }
    } else {
      if (
        paymentMethod ===
        "cash_on_delivery"
      ) {
        setPaymentMethod(
          "cash_on_pickup"
        );
      }
    }
  };

  /* =======================================================
   * VALIDATION
   * ===================================================== */

  const validateForm =
    () => {
      /*
       * SOURCE
       */

      if (
        isCartCheckout
      ) {
        if (
          !cart ||
          cart.items.length ===
            0
        ) {
          Alert.alert(
            "Checkout unavailable",
            "Your shopping cart is empty."
          );

          return false;
        }

        const unavailable =
          cart.items.some(
            (item) =>
              !isCartItemPurchasable(
                item
              )
          );

        if (unavailable) {
          Alert.alert(
            "Unavailable product",
            "Remove unavailable flower listings before checkout."
          );

          return false;
        }

        if (
          paymentMethod ===
            "paymongo" &&
          cart.items.length > 1
        ) {
          Alert.alert(
            "PayMongo",
            "For now, online payment can be used when checking out one flower listing at a time. Use cash payment for this multi-item checkout."
          );

          return false;
        }
      } else {
        if (!request) {
          Alert.alert(
            "Checkout unavailable",
            "The bouquet request has not loaded."
          );

          return false;
        }

        if (
          request.status !==
          "customer_accepted"
        ) {
          Alert.alert(
            "Checkout unavailable",
            "Select a florist proposal before proceeding to checkout."
          );

          return false;
        }
      }

      /*
       * RECIPIENT
       */

      if (
        !recipientName.trim()
      ) {
        Alert.alert(
          "Recipient required",
          "Enter the recipient's full name."
        );

        return false;
      }

      if (
        !recipientPhone.trim()
      ) {
        Alert.alert(
          "Phone number required",
          "Enter the recipient's phone number."
        );

        return false;
      }

      if (
        !isValidPhilippinePhone(
          recipientPhone
        )
      ) {
        Alert.alert(
          "Invalid phone number",
          "Enter a valid Philippine number such as 09171234567."
        );

        return false;
      }

      /*
       * DELIVERY
       */

      if (
        fulfillmentType ===
        "delivery"
      ) {
        if (
          !street.trim() ||
          !barangay.trim() ||
          !city.trim() ||
          !province.trim()
        ) {
          Alert.alert(
            "Delivery address required",
            "Complete the street, barangay, city, and province fields."
          );

          return false;
        }

        const lat =
          Number(latitude);

        const lng =
          Number(longitude);

        if (
          !latitude.trim() ||
          !longitude.trim() ||
          !Number.isFinite(
            lat
          ) ||
          !Number.isFinite(
            lng
          )
        ) {
          Alert.alert(
            "Delivery location required",
            "Enter the exact latitude and longitude of the delivery location."
          );

          return false;
        }

        if (
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          Alert.alert(
            "Invalid coordinates",
            "Check the latitude and longitude values."
          );

          return false;
        }
      }

      /*
       * SCHEDULE
       */

      if (scheduled) {
        if (
          !isValidDate(
            deliveryDate
          )
        ) {
          Alert.alert(
            "Delivery date required",
            "Use YYYY-MM-DD for the scheduled delivery date."
          );

          return false;
        }

        const date =
          new Date(
            `${deliveryDate}T23:59:59`
          );

        if (
          date.getTime() <=
          Date.now()
        ) {
          Alert.alert(
            "Invalid delivery date",
            "Scheduled delivery must be in the future."
          );

          return false;
        }

        const hasStart =
          Boolean(
            startTime.trim()
          );

        const hasEnd =
          Boolean(
            endTime.trim()
          );

        if (
          hasStart !==
          hasEnd
        ) {
          Alert.alert(
            "Delivery time",
            "Enter both the start and end time, or leave both empty."
          );

          return false;
        }

        if (
          hasStart &&
          !isValidTime(
            startTime
          )
        ) {
          Alert.alert(
            "Invalid start time",
            "Use HH:MM format, for example 14:00."
          );

          return false;
        }

        if (
          hasEnd &&
          !isValidTime(
            endTime
          )
        ) {
          Alert.alert(
            "Invalid end time",
            "Use HH:MM format, for example 16:00."
          );

          return false;
        }
      }

      /*
       * PAYMENT
       */

      if (
        fulfillmentType ===
          "delivery" &&
        paymentMethod ===
          "cash_on_pickup"
      ) {
        Alert.alert(
          "Invalid payment method",
          "Cash on pickup cannot be used for delivery orders."
        );

        return false;
      }

      if (
        fulfillmentType ===
          "pickup" &&
        paymentMethod ===
          "cash_on_delivery"
      ) {
        Alert.alert(
          "Invalid payment method",
          "Cash on delivery cannot be used for pickup orders."
        );

        return false;
      }

      return true;
    };

  /* =======================================================
   * COMMON ORDER BODY
   * ===================================================== */

  const buildCommonBody =
    () => {
      const body: Record<
        string,
        unknown
      > = {
        fulfillmentType,

        recipientName:
          recipientName.trim(),

        recipientPhoneNumber:
          recipientPhone.trim(),

        isPreOrder:
          scheduled,

        paymentMethod,

        customerNotes:
          notes.trim() ||
          undefined,
      };

      if (
        fulfillmentType ===
        "delivery"
      ) {
        body.deliveryAddress =
          {
            street:
              street.trim(),

            barangay:
              barangay.trim(),

            city:
              city.trim(),

            province:
              province.trim(),

            postalCode:
              postalCode.trim() ||
              undefined,

            landmark:
              landmark.trim() ||
              undefined,
          };

        body.deliveryLocation =
          {
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

      if (scheduled) {
        body.requestedDeliveryDate =
          new Date(
            `${deliveryDate}T12:00:00`
          ).toISOString();

        if (
          startTime.trim()
        ) {
          body.requestedDeliveryTimeStart =
            startTime.trim();
        }

        if (
          endTime.trim()
        ) {
          body.requestedDeliveryTimeEnd =
            endTime.trim();
        }
      }

      return body;
    };

  /* =======================================================
   * PAYMONGO
   * ===================================================== */

  const startPayMongoCheckout =
    async (
      orderId: string
    ) => {
      const response =
        await apiRequest<PayMongoCheckoutResponse>(
          `/payments/orders/${orderId}/checkout`,
          {
            method:
              "POST",

            authenticated:
              true,
          }
        );

      const checkoutUrl =
        response?.data
          ?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error(
          "PayMongo did not return a checkout URL."
        );
      }

      const supported =
        await Linking.canOpenURL(
          checkoutUrl
        );

      if (!supported) {
        throw new Error(
          "Unable to open the PayMongo checkout page."
        );
      }

      await Linking.openURL(
        checkoutUrl
      );
    };

  /* =======================================================
   * REMOVE COMPLETED CART ITEM
   * ===================================================== */

  const removeCompletedCartItem =
    async (
      cartItemId: string
    ) => {
      await apiRequest<CartResponse>(
        `/cart/items/${cartItemId}`,
        {
          method:
            "DELETE",

          authenticated:
            true,
        }
      );
    };

  /* =======================================================
   * CUSTOM BOUQUET ORDER
   * ===================================================== */

  const placeCustomOrder =
    async () => {
      if (!request) {
        throw new Error(
          "Custom bouquet request was not loaded."
        );
      }

      const body = {
        ...buildCommonBody(),

        sourceType:
          "custom_bouquet",

        customBouquetRequestId:
          request._id,
      };

      const response =
        await apiRequest<CreateOrderResponse>(
          "/orders",
          {
            method:
              "POST",

            authenticated:
              true,

            body:
              JSON.stringify(
                body
              ),
          }
        );

      const order =
        response?.data?.order;

      if (!order?._id) {
        throw new Error(
          "The server did not return the created order."
        );
      }

      return order;
    };

  /* =======================================================
   * CART ORDERS
   * ===================================================== */

  const placeCartOrders =
    async () => {
      if (
        !cart ||
        cart.items.length ===
          0
      ) {
        throw new Error(
          "Your cart is empty."
        );
      }

      const createdOrders:
        Order[] = [];

      const failedItems: {
        item: CartItem;
        error: string;
      }[] = [];

      /*
       * IMPORTANT:
       *
       * Current Order model represents
       * one flower listing per order.
       *
       * Therefore each cart item becomes
       * one Order.
       */

      for (
        const item of
        cart.items
      ) {
        if (
          !item.flower?._id
        ) {
          failedItems.push({
            item,

            error:
              "Flower listing information is missing.",
          });

          continue;
        }

        try {
          const body = {
            ...buildCommonBody(),

            sourceType:
              "flower_listing",

            flowerId:
              item.flower._id,

            quantity:
              Math.max(
                Number(
                  item.quantity
                ) || 1,
                1
              ),
          };

          const response =
            await apiRequest<CreateOrderResponse>(
              "/orders",
              {
                method:
                  "POST",

                authenticated:
                  true,

                body:
                  JSON.stringify(
                    body
                  ),
              }
            );

          const order =
            response?.data?.order;

          if (!order?._id) {
            throw new Error(
              "The server did not return the created order."
            );
          }

          createdOrders.push(
            order
          );

          /*
           * Remove only after the
           * corresponding order
           * successfully exists.
           */

          try {
            await removeCompletedCartItem(
              item._id
            );
          } catch (
            cartError
          ) {
            console.warn(
              "Order created but cart item could not be removed:",
              cartError
            );
          }
        } catch (error) {
          failedItems.push({
            item,

            error:
              getErrorMessage(
                error,
                "Unable to create this order."
              ),
          });
        }
      }

      return {
        createdOrders,

        failedItems,
      };
    };

  /* =======================================================
   * PLACE ORDER
   * ===================================================== */

  const placeOrder =
    async () => {
      if (
        !validateForm()
      ) {
        return;
      }

      try {
        setSubmitting(
          true
        );

        /*
         * ===============================================
         * CART CHECKOUT
         * ===============================================
         */

        if (
          isCartCheckout
        ) {
          const {
            createdOrders,
            failedItems,
          } =
            await placeCartOrders();

          if (
            createdOrders.length ===
            0
          ) {
            throw new Error(
              failedItems[0]
                ?.error ||
                "No orders could be created."
            );
          }

          /*
           * PAYMONGO
           *
           * Validation guarantees this
           * is only one cart item.
           */

          if (
            paymentMethod ===
            "paymongo"
          ) {
            const order =
              createdOrders[0];

            try {
              await startPayMongoCheckout(
                order._id
              );

              Alert.alert(
                "Order created",
                "Your flower order was created. Complete payment through the PayMongo checkout page.",
                [
                  {
                    text:
                      "View Orders",

                    onPress:
                      () =>
                        router.replace(
                          "/(customer)/customer-orders" as never
                        ),
                  },
                ]
              );
            } catch (
              paymentError
            ) {
              Alert.alert(
                "Order created",
                `Your order was created, but the payment page could not be opened.\n\n${getErrorMessage(
                  paymentError,
                  "You can retry payment later."
                )}`,
                [
                  {
                    text:
                      "View Orders",

                    onPress:
                      () =>
                        router.replace(
                          "/(customer)/customer-orders" as never
                        ),
                  },
                ]
              );
            }

            return;
          }

          /*
           * PARTIAL SUCCESS
           */

          if (
            failedItems.length >
            0
          ) {
            Alert.alert(
              "Some orders were placed",
              `${createdOrders.length} order${
                createdOrders.length ===
                1
                  ? ""
                  : "s"
              } were created successfully, but ${failedItems.length} cart item${
                failedItems.length ===
                1
                  ? ""
                  : "s"
              } could not be ordered. The failed items remain in your cart.`,
              [
                {
                  text:
                    "View Orders",

                  onPress:
                    () =>
                      router.replace(
                        "/(customer)/customer-orders" as never
                      ),
                },
              ]
            );

            return;
          }

          Alert.alert(
            "Orders placed!",
            `${createdOrders.length} order${
              createdOrders.length ===
              1
                ? ""
                : "s"
            } ${
              createdOrders.length ===
              1
                ? "has"
                : "have"
            } been placed successfully.`,
            [
              {
                text:
                  "View Orders",

                onPress:
                  () =>
                    router.replace(
                      "/(customer)/customer-orders" as never
                    ),
              },
            ]
          );

          return;
        }

        /*
         * ===============================================
         * CUSTOM BOUQUET CHECKOUT
         * ===============================================
         */

        const order =
          await placeCustomOrder();

        if (
          paymentMethod ===
          "paymongo"
        ) {
          try {
            await startPayMongoCheckout(
              order._id
            );

            Alert.alert(
              "Order created",
              "Your custom bouquet order was created. Complete your payment through the PayMongo checkout page.",
              [
                {
                  text:
                    "View Orders",

                  onPress:
                    () =>
                      router.replace(
                        "/(customer)/customer-orders" as never
                      ),
                },
              ]
            );
          } catch (
            paymentError
          ) {
            Alert.alert(
              "Order created",
              `Your order was created, but the payment page could not be opened.\n\n${getErrorMessage(
                paymentError,
                "You can retry payment later."
              )}`,
              [
                {
                  text:
                    "View Orders",

                  onPress:
                    () =>
                      router.replace(
                        "/(customer)/customer-orders" as never
                      ),
                },
              ]
            );
          }

          return;
        }

        Alert.alert(
          "Order placed!",
          fulfillmentType ===
          "delivery"
            ? "Your custom bouquet order has been placed successfully. Payment will be collected upon delivery."
            : "Your custom bouquet order has been placed successfully. Payment will be collected when you pick up your bouquet.",
          [
            {
              text:
                "View Orders",

              onPress: () =>
                router.replace(
                  "/(customer)/customer-orders" as never
                ),
            },
          ]
        );
      } catch (error) {
        Alert.alert(
          "Unable to place order",
          getErrorMessage(
            error,
            "Please review your checkout information and try again."
          )
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* =======================================================
   * LOADING
   * ===================================================== */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={
            styles.centerState
          }
        >
          <View
            style={
              styles.stateIcon
            }
          >
            <Ionicons
              name="bag-check-outline"
              size={31}
              color={
                COLORS.primary
              }
            />
          </View>

          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.stateText
            }
          >
            Preparing your
            checkout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
   * ERROR
   * ===================================================== */

  const missingData =
    isCartCheckout
      ? !cart
      : !request;

  if (
    loadError ||
    missingData
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={
            styles.centerState
          }
        >
          <View
            style={
              styles.stateIcon
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={
                COLORS.primary
              }
            />
          </View>

          <Text
            style={
              styles.stateTitle
            }
          >
            Checkout unavailable
          </Text>

          <Text
            style={
              styles.stateText
            }
          >
            {loadError ??
              "Unable to load checkout."}
          </Text>

          <Pressable
            onPress={() => {
              void loadCheckout();
            }}
            style={
              styles.retryButton
            }
          >
            <Ionicons
              name="refresh"
              size={17}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.retryButtonText
              }
            >
              Try Again
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.back()
            }
            style={
              styles.backStateButton
            }
          >
            <Text
              style={
                styles.backStateText
              }
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
   * MAIN
   * ===================================================== */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <KeyboardAvoidingView
        style={
          styles.container
        }
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
      >
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={
                COLORS.text
              }
            />
          </Pressable>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.headerEyebrow
              }
            >
              FLOGRAM
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              Checkout
            </Text>
          </View>

          <View
            style={
              styles.headerIcon
            }
          >
            <Ionicons
              name="bag-check-outline"
              size={21}
              color={
                COLORS.primary
              }
            />
          </View>
        </View>

        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              tintColor={
                COLORS.primary
              }
              colors={[
                COLORS.primary,
              ]}
            />
          }
        >
          {/* =============================================
              ORDER SUMMARY
          ============================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="flower-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Order Summary
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {isCartCheckout
                    ? "Review the flower listings in your cart."
                    : "Review your selected custom bouquet."}
                </Text>
              </View>
            </View>

            {/*
             * ===========================================
             * CART SUMMARY
             * ===========================================
             */}

            {isCartCheckout ? (
              <>
                {cartItems.map(
                  (
                    item,
                    index
                  ) => {
                    const flower =
                      item.flower;

                    const imageUrl =
                      getImageUrl(
                        flower
                          ?.images?.[0]
                      );

                    const price =
                      item.currentPrice ??
                      flower?.price ??
                      0;

                    return (
                      <View
                        key={
                          item._id
                        }
                        style={[
                          styles.cartProductCard,

                          index !==
                            cartItems.length -
                              1 &&
                            styles.cartProductCardSpacing,
                        ]}
                      >
                        {imageUrl ? (
                          <Image
                            source={{
                              uri:
                                imageUrl,
                            }}
                            style={
                              styles.productImage
                            }
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={
                              styles.productImagePlaceholder
                            }
                          >
                            <Ionicons
                              name="flower-outline"
                              size={30}
                              color={
                                COLORS.primary
                              }
                            />
                          </View>
                        )}

                        <View
                          style={
                            styles.productMain
                          }
                        >
                          <Text
                            style={
                              styles.productName
                            }
                            numberOfLines={
                              2
                            }
                          >
                            {flower?.name ||
                              "Flower Listing"}
                          </Text>

                          <View
                            style={
                              styles.floristRow
                            }
                          >
                            <Ionicons
                              name="storefront-outline"
                              size={13}
                              color={
                                COLORS.textMuted
                              }
                            />

                            <Text
                              style={
                                styles.floristName
                              }
                              numberOfLines={
                                1
                              }
                            >
                              {getCartFloristName(
                                item
                              )}
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.productPrice
                            }
                          >
                            {formatCurrency(
                              price
                            )}
                          </Text>

                          <Text
                            style={
                              styles.quantityText
                            }
                          >
                            Quantity:{" "}
                            {
                              item.quantity
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.cartLineTotal
                          }
                        >
                          <Text
                            style={
                              styles.cartLineTotalLabel
                            }
                          >
                            Subtotal
                          </Text>

                          <Text
                            style={
                              styles.cartLineTotalValue
                            }
                          >
                            {formatCurrency(
                              item.lineSubtotal ??
                                Number(
                                  price
                                ) *
                                  item.quantity
                            )}
                          </Text>
                        </View>
                      </View>
                    );
                  }
                )}

                <View
                  style={
                    styles.cartInfoBadge
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={
                      COLORS.blue
                    }
                  />

                  <Text
                    style={
                      styles.cartInfoText
                    }
                  >
                    Each flower
                    listing becomes
                    its own order.
                    Delivery fees are
                    calculated by the
                    backend using each
                    florist&apos;s
                    location.
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/*
                 * =======================================
                 * CUSTOM BOUQUET SUMMARY
                 * =======================================
                 */}

                <View
                  style={
                    styles.productCard
                  }
                >
                  {customImageUrl ? (
                    <Image
                      source={{
                        uri:
                          customImageUrl,
                      }}
                      style={
                        styles.productImage
                      }
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={
                        styles.productImagePlaceholder
                      }
                    >
                      <Ionicons
                        name="flower-outline"
                        size={30}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>
                  )}

                  <View
                    style={
                      styles.productMain
                    }
                  >
                    <Text
                      style={
                        styles.productName
                      }
                      numberOfLines={
                        2
                      }
                    >
                      {
                        customTitle
                      }
                    </Text>

                    <View
                      style={
                        styles.floristRow
                      }
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={13}
                        color={
                          COLORS.textMuted
                        }
                      />

                      <Text
                        style={
                          styles.floristName
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {florist
                          ?.shopName ||
                          "Selected FLOGRAM Florist"}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.productPrice
                      }
                    >
                      {formatCurrency(
                        quotedPrice
                      )}
                    </Text>

                    <Text
                      style={
                        styles.quantityText
                      }
                    >
                      Quantity:{" "}
                      {
                        customQuantity
                      }
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.selectedProposalBadge
                  }
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color={
                      COLORS.success
                    }
                  />

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.selectedProposalTitle
                      }
                    >
                      Selected
                      Proposal
                    </Text>

                    <Text
                      style={
                        styles.selectedProposalText
                      }
                    >
                      This price came
                      from the florist
                      proposal you
                      accepted.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* =============================================
              FULFILLMENT
          ============================================= */}

          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Fulfillment
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Choose how you want
              to receive your
              bouquet.
            </Text>

            <View
              style={
                styles.choiceRow
              }
            >
              <Pressable
                onPress={() =>
                  chooseFulfillment(
                    "delivery"
                  )
                }
                style={[
                  styles.choiceCard,

                  fulfillmentType ===
                    "delivery" &&
                    styles.choiceCardActive,
                ]}
              >
                <View
                  style={[
                    styles.choiceIcon,

                    fulfillmentType ===
                      "delivery" &&
                      styles.choiceIconActive,
                  ]}
                >
                  <Ionicons
                    name="bicycle-outline"
                    size={23}
                    color={
                      fulfillmentType ===
                      "delivery"
                        ? "#FFFFFF"
                        : COLORS.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.choiceTitle
                  }
                >
                  Delivery
                </Text>

                <Text
                  style={
                    styles.choiceText
                  }
                >
                  Rider delivery to
                  your location
                </Text>

                {fulfillmentType ===
                  "delivery" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={
                      COLORS.primary
                    }
                    style={
                      styles.choiceCheck
                    }
                  />
                )}
              </Pressable>

              <Pressable
                onPress={() =>
                  chooseFulfillment(
                    "pickup"
                  )
                }
                style={[
                  styles.choiceCard,

                  fulfillmentType ===
                    "pickup" &&
                    styles.choiceCardActive,
                ]}
              >
                <View
                  style={[
                    styles.choiceIcon,

                    fulfillmentType ===
                      "pickup" &&
                      styles.choiceIconActive,
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={23}
                    color={
                      fulfillmentType ===
                      "pickup"
                        ? "#FFFFFF"
                        : COLORS.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.choiceTitle
                  }
                >
                  Pickup
                </Text>

                <Text
                  style={
                    styles.choiceText
                  }
                >
                  Pick up from the
                  florist shop
                </Text>

                {fulfillmentType ===
                  "pickup" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={
                      COLORS.primary
                    }
                    style={
                      styles.choiceCheck
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>

          {/* =============================================
              RECIPIENT
          ============================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Recipient Details
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Who will receive
                  the bouquet?
                </Text>
              </View>
            </View>

            <Field
              label="Full Name"
            >
              <TextInput
                value={
                  recipientName
                }
                onChangeText={
                  setRecipientName
                }
                placeholder="Recipient's full name"
                placeholderTextColor="#A59CA1"
                style={
                  styles.input
                }
              />
            </Field>

            <Field
              label="Phone Number"
            >
              <TextInput
                value={
                  recipientPhone
                }
                onChangeText={
                  setRecipientPhone
                }
                placeholder="09171234567"
                placeholderTextColor="#A59CA1"
                keyboardType="phone-pad"
                style={
                  styles.input
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Philippine mobile
                number, e.g.
                09171234567
              </Text>
            </Field>
          </View>

          {/* =============================================
              DELIVERY ADDRESS
          ============================================= */}

          {fulfillmentType ===
            "delivery" && (
            <View
              style={
                styles.section
              }
            >
              <View
                style={
                  styles.sectionHeading
                }
              >
                <View
                  style={
                    styles.sectionIcon
                  }
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Delivery Address
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Enter the complete
                    destination.
                  </Text>
                </View>
              </View>

              <Field
                label="Street / House No."
              >
                <TextInput
                  value={street}
                  onChangeText={
                    setStreet
                  }
                  placeholder="e.g. 123 Magsaysay Avenue"
                  placeholderTextColor="#A59CA1"
                  style={
                    styles.input
                  }
                />
              </Field>

              <Field
                label="Barangay"
              >
                <TextInput
                  value={
                    barangay
                  }
                  onChangeText={
                    setBarangay
                  }
                  placeholder="Barangay"
                  placeholderTextColor="#A59CA1"
                  style={
                    styles.input
                  }
                />
              </Field>

              <View
                style={
                  styles.twoColumnRow
                }
              >
                <View
                  style={
                    styles.halfField
                  }
                >
                  <Field
                    label="City"
                  >
                    <TextInput
                      value={
                        city
                      }
                      onChangeText={
                        setCity
                      }
                      placeholder="City"
                      placeholderTextColor="#A59CA1"
                      style={
                        styles.input
                      }
                    />
                  </Field>
                </View>

                <View
                  style={
                    styles.halfField
                  }
                >
                  <Field
                    label="Province"
                  >
                    <TextInput
                      value={
                        province
                      }
                      onChangeText={
                        setProvince
                      }
                      placeholder="Province"
                      placeholderTextColor="#A59CA1"
                      style={
                        styles.input
                      }
                    />
                  </Field>
                </View>
              </View>

              <View
                style={
                  styles.twoColumnRow
                }
              >
                <View
                  style={
                    styles.halfField
                  }
                >
                  <Field
                    label="Postal Code"
                  >
                    <TextInput
                      value={
                        postalCode
                      }
                      onChangeText={
                        setPostalCode
                      }
                      placeholder="4400"
                      placeholderTextColor="#A59CA1"
                      keyboardType="number-pad"
                      style={
                        styles.input
                      }
                    />
                  </Field>
                </View>

                <View
                  style={
                    styles.halfField
                  }
                >
                  <Field
                    label="Landmark"
                  >
                    <TextInput
                      value={
                        landmark
                      }
                      onChangeText={
                        setLandmark
                      }
                      placeholder="Optional"
                      placeholderTextColor="#A59CA1"
                      style={
                        styles.input
                      }
                    />
                  </Field>
                </View>
              </View>

              <View
                style={
                  styles.locationCard
                }
              >
                <View
                  style={
                    styles.locationHeader
                  }
                >
                  <View
                    style={
                      styles.locationIcon
                    }
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={20}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.locationTitle
                      }
                    >
                      Delivery Map
                      Location
                    </Text>

                    <Text
                      style={
                        styles.locationText
                      }
                    >
                      These coordinates
                      are used by the
                      backend to
                      calculate the
                      route and
                      delivery fee.
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.twoColumnRow
                  }
                >
                  <View
                    style={
                      styles.halfField
                    }
                  >
                    <Field
                      label="Latitude"
                    >
                      <TextInput
                        value={
                          latitude
                        }
                        onChangeText={
                          setLatitude
                        }
                        placeholder="13.6218"
                        placeholderTextColor="#A59CA1"
                        keyboardType="numbers-and-punctuation"
                        style={
                          styles.input
                        }
                      />
                    </Field>
                  </View>

                  <View
                    style={
                      styles.halfField
                    }
                  >
                    <Field
                      label="Longitude"
                    >
                      <TextInput
                        value={
                          longitude
                        }
                        onChangeText={
                          setLongitude
                        }
                        placeholder="123.1948"
                        placeholderTextColor="#A59CA1"
                        keyboardType="numbers-and-punctuation"
                        style={
                          styles.input
                        }
                      />
                    </Field>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* =============================================
              SCHEDULE
          ============================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Schedule
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Receive it now or
                  schedule a future
                  date.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() =>
                setScheduled(false)
              }
              style={[
                styles.radioCard,

                !scheduled &&
                  styles.radioCardActive,
              ]}
            >
              <Ionicons
                name={
                  !scheduled
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={
                  !scheduled
                    ? COLORS.primary
                    : COLORS.textMuted
                }
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.radioTitle
                  }
                >
                  As soon as
                  possible
                </Text>

                <Text
                  style={
                    styles.radioText
                  }
                >
                  Process the order
                  without scheduling.
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                setScheduled(true)
              }
              style={[
                styles.radioCard,

                scheduled &&
                  styles.radioCardActive,
              ]}
            >
              <Ionicons
                name={
                  scheduled
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={
                  scheduled
                    ? COLORS.primary
                    : COLORS.textMuted
                }
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.radioTitle
                  }
                >
                  Schedule Order
                </Text>

                <Text
                  style={
                    styles.radioText
                  }
                >
                  Choose a future
                  date and preferred
                  time.
                </Text>
              </View>
            </Pressable>

            {scheduled && (
              <View
                style={
                  styles.scheduleFields
                }
              >
                <Field
                  label="Delivery Date"
                >
                  <View
                    style={
                      styles.iconInput
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={
                        COLORS.textMuted
                      }
                    />

                    <TextInput
                      value={
                        deliveryDate
                      }
                      onChangeText={
                        setDeliveryDate
                      }
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#A59CA1"
                      style={
                        styles.iconTextInput
                      }
                    />
                  </View>
                </Field>

                <View
                  style={
                    styles.twoColumnRow
                  }
                >
                  <View
                    style={
                      styles.halfField
                    }
                  >
                    <Field
                      label="Start"
                    >
                      <TextInput
                        value={
                          startTime
                        }
                        onChangeText={
                          setStartTime
                        }
                        placeholder="14:00"
                        placeholderTextColor="#A59CA1"
                        style={
                          styles.input
                        }
                      />
                    </Field>
                  </View>

                  <View
                    style={
                      styles.halfField
                    }
                  >
                    <Field
                      label="End"
                    >
                      <TextInput
                        value={
                          endTime
                        }
                        onChangeText={
                          setEndTime
                        }
                        placeholder="16:00"
                        placeholderTextColor="#A59CA1"
                        style={
                          styles.input
                        }
                      />
                    </Field>
                  </View>
                </View>

                <View
                  style={
                    styles.preorderNotice
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={
                      COLORS.warning
                    }
                  />

                  <Text
                    style={
                      styles.preorderNoticeText
                    }
                  >
                    Scheduled orders
                    may include the
                    backend pre-order
                    fee.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* =============================================
              NOTES
          ============================================= */}

          <View
            style={
              styles.section
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Order Notes
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Optional instructions
              for the florist or
              delivery.
            </Text>

            <TextInput
              value={notes}
              onChangeText={
                setNotes
              }
              placeholder="Add order instructions..."
              placeholderTextColor="#A59CA1"
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.notesInput,
              ]}
            />

            <Text
              style={
                styles.counterText
              }
            >
              {notes.length}/2000
            </Text>
          </View>

          {/* =============================================
              PAYMENT
          ============================================= */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Payment Method
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Choose how you
                  want to pay.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() =>
                setPaymentMethod(
                  fulfillmentType ===
                    "delivery"
                    ? "cash_on_delivery"
                    : "cash_on_pickup"
                )
              }
              style={[
                styles.paymentCard,

                paymentMethod !==
                  "paymongo" &&
                  styles.paymentCardActive,
              ]}
            >
              <View
                style={
                  styles.paymentIcon
                }
              >
                <Ionicons
                  name="cash-outline"
                  size={22}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.paymentTitle
                  }
                >
                  {fulfillmentType ===
                  "delivery"
                    ? "Cash on Delivery"
                    : "Cash on Pickup"}
                </Text>

                <Text
                  style={
                    styles.paymentText
                  }
                >
                  {fulfillmentType ===
                  "delivery"
                    ? "Pay when the order is delivered."
                    : "Pay when you collect the order."}
                </Text>
              </View>

              <Ionicons
                name={
                  paymentMethod !==
                  "paymongo"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={21}
                color={
                  paymentMethod !==
                  "paymongo"
                    ? COLORS.primary
                    : COLORS.textMuted
                }
              />
            </Pressable>

            <Pressable
              onPress={() => {
                if (
                  isCartCheckout &&
                  cartHasMultipleItems
                ) {
                  Alert.alert(
                    "PayMongo",
                    "Online payment is currently available when checking out one flower listing at a time because each flower listing becomes a separate order."
                  );

                  return;
                }

                setPaymentMethod(
                  "paymongo"
                );
              }}
              style={[
                styles.paymentCard,

                paymentMethod ===
                  "paymongo" &&
                  styles.paymentCardActive,

                isCartCheckout &&
                  cartHasMultipleItems &&
                  styles.paymentCardDisabled,
              ]}
            >
              <View
                style={
                  styles.paymentIcon
                }
              >
                <Ionicons
                  name="wallet-outline"
                  size={22}
                  color={
                    isCartCheckout &&
                    cartHasMultipleItems
                      ? "#AFA7AB"
                      : COLORS.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={[
                    styles.paymentTitle,

                    isCartCheckout &&
                      cartHasMultipleItems &&
                      styles.disabledText,
                  ]}
                >
                  PayMongo
                </Text>

                <Text
                  style={
                    styles.paymentText
                  }
                >
                  {isCartCheckout &&
                  cartHasMultipleItems
                    ? "Available for single-item checkout"
                    : "GCash • Card • QRPh"}
                </Text>
              </View>

              <Ionicons
                name={
                  paymentMethod ===
                  "paymongo"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={21}
                color={
                  isCartCheckout &&
                  cartHasMultipleItems
                    ? "#C8C2C5"
                    : paymentMethod ===
                        "paymongo"
                      ? COLORS.primary
                      : COLORS.textMuted
                }
              />
            </Pressable>
          </View>

          {/* =============================================
              TOTAL
          ============================================= */}

          <View
            style={
              styles.totalCard
            }
          >
            <View
              style={
                styles.totalHeader
              }
            >
              <Text
                style={
                  styles.totalTitle
                }
              >
                Order Total
              </Text>

              <Ionicons
                name="receipt-outline"
                size={21}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={
                styles.totalDivider
              }
            />

            <View
              style={
                styles.totalRow
              }
            >
              <Text
                style={
                  styles.totalLabel
                }
              >
                {isCartCheckout
                  ? `Products (${cartTotalQuantity})`
                  : "Bouquet subtotal"}
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                {formatCurrency(
                  isCartCheckout
                    ? cartSubtotal
                    : customSubtotal
                )}
              </Text>
            </View>

            <View
              style={
                styles.totalRow
              }
            >
              <Text
                style={
                  styles.totalLabel
                }
              >
                Delivery fee
              </Text>

              <Text
                style={
                  styles.calculatedText
                }
              >
                {fulfillmentType ===
                "pickup"
                  ? "₱0.00"
                  : "Calculated by backend"}
              </Text>
            </View>

            {scheduled && (
              <View
                style={
                  styles.totalRow
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Pre-order fee
                </Text>

                <Text
                  style={
                    styles.calculatedText
                  }
                >
                  Calculated by
                  backend
                </Text>
              </View>
            )}

            <View
              style={
                styles.totalNotice
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={
                  COLORS.blue
                }
              />

              <Text
                style={
                  styles.totalNoticeText
                }
              >
                {isCartCheckout &&
                fulfillmentType ===
                  "delivery"
                  ? "The displayed subtotal covers products only. Each order's final total is calculated using its florist-to-customer delivery route."
                  : fulfillmentType ===
                      "delivery"
                    ? "The backend calculates the final amount using the florist-to-customer delivery route."
                    : "Pickup has no rider delivery fee."}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.bottomSpace
            }
          />
        </ScrollView>

        {/* =============================================
            PLACE ORDER BAR
        ============================================= */}

        <View
          style={
            styles.checkoutBar
          }
        >
          <View
            style={
              styles.checkoutTotal
            }
          >
            <Text
              style={
                styles.checkoutTotalLabel
              }
            >
              Product subtotal
            </Text>

            <Text
              style={
                styles.checkoutTotalValue
              }
            >
              {formatCurrency(
                isCartCheckout
                  ? cartSubtotal
                  : customSubtotal
              )}
            </Text>
          </View>

          <Pressable
            onPress={() =>
              void placeOrder()
            }
            disabled={
              submitting
            }
            style={[
              styles.placeOrderButton,

              submitting &&
                styles.placeOrderButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text
                  style={
                    styles.placeOrderButtonText
                  }
                >
                  {isCartCheckout &&
                  cartItems.length >
                    1
                    ? `Place ${cartItems.length} Orders`
                    : "Place Order"}
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
 * FIELD
 * ======================================================= */

function Field({
  label,
  children,
}: {
  label: string;

  children:
    React.ReactNode;
}) {
  return (
    <View
      style={
        styles.fieldGroup
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      {children}
    </View>
  );
}

/* =========================================================
 * STYLES
 * ======================================================= */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    header: {
      minHeight: 67,

      paddingHorizontal: 14,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        COLORS.card,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        COLORS.border,
    },

    backButton: {
      width: 42,

      height: 42,

      borderRadius: 21,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerCenter: {
      flex: 1,

      alignItems:
        "center",
    },

    headerEyebrow: {
      fontSize: 8,

      fontWeight:
        "800",

      letterSpacing: 1.5,

      color:
        COLORS.primary,
    },

    headerTitle: {
      marginTop: 1,

      fontSize: 19,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    headerIcon: {
      width: 42,

      height: 42,

      borderRadius: 21,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      padding: 15,

      paddingBottom: 20,
    },

    section: {
      marginBottom: 14,

      padding: 16,

      borderRadius: 19,

      backgroundColor:
        COLORS.card,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    sectionHeading: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,

      marginBottom: 14,
    },

    sectionIcon: {
      width: 38,

      height: 38,

      borderRadius: 12,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    sectionTitle: {
      fontSize: 15,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    sectionSubtitle: {
      marginTop: 3,

      fontSize: 11,

      lineHeight: 16,

      color:
        COLORS.textMuted,
    },

    productCard: {
      padding: 11,

      borderRadius: 16,

      flexDirection:
        "row",

      backgroundColor:
        COLORS.graySoft,
    },

    cartProductCard: {
      padding: 11,

      borderRadius: 16,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        COLORS.graySoft,
    },

    cartProductCardSpacing: {
      marginBottom: 10,
    },

    productImage: {
      width: 82,

      height: 82,

      borderRadius: 13,

      backgroundColor:
        COLORS.primarySoft,
    },

    productImagePlaceholder: {
      width: 82,

      height: 82,

      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    productMain: {
      flex: 1,

      marginLeft: 11,

      justifyContent:
        "center",
    },

    productName: {
      fontSize: 14,

      lineHeight: 18,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    floristRow: {
      marginTop: 4,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,
    },

    floristName: {
      flex: 1,

      fontSize: 10,

      color:
        COLORS.textMuted,
    },

    productPrice: {
      marginTop: 5,

      fontSize: 14,

      fontWeight:
        "900",

      color:
        COLORS.primary,
    },

    quantityText: {
      marginTop: 2,

      fontSize: 10,

      color:
        COLORS.textMuted,
    },

    cartLineTotal: {
      marginLeft: 8,

      alignItems:
        "flex-end",
    },

    cartLineTotalLabel: {
      fontSize: 9,

      color:
        COLORS.textMuted,
    },

    cartLineTotalValue: {
      marginTop: 3,

      fontSize: 13,

      fontWeight:
        "900",

      color:
        COLORS.primary,
    },

    selectedProposalBadge: {
      marginTop: 11,

      padding: 11,

      borderRadius: 13,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,

      backgroundColor:
        COLORS.successSoft,
    },

    selectedProposalTitle: {
      fontSize: 11,

      fontWeight:
        "800",

      color:
        COLORS.success,
    },

    selectedProposalText: {
      marginTop: 2,

      fontSize: 10,

      lineHeight: 15,

      color: "#4D6F5D",
    },

    cartInfoBadge: {
      marginTop: 11,

      padding: 11,

      borderRadius: 13,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,

      backgroundColor:
        COLORS.blueSoft,
    },

    cartInfoText: {
      flex: 1,

      fontSize: 10,

      lineHeight: 16,

      color:
        COLORS.blue,
    },

    choiceRow: {
      marginTop: 13,

      flexDirection:
        "row",

      gap: 10,
    },

    choiceCard: {
      flex: 1,

      minHeight: 135,

      padding: 13,

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,

      position:
        "relative",
    },

    choiceCardActive: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primarySoft,
    },

    choiceIcon: {
      width: 42,

      height: 42,

      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    choiceIconActive: {
      backgroundColor:
        COLORS.primary,
    },

    choiceTitle: {
      marginTop: 10,

      fontSize: 13,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    choiceText: {
      marginTop: 3,

      paddingRight: 5,

      fontSize: 10,

      lineHeight: 14,

      color:
        COLORS.textMuted,
    },

    choiceCheck: {
      position:
        "absolute",

      top: 10,

      right: 10,
    },

    fieldGroup: {
      marginTop: 12,
    },

    fieldLabel: {
      marginBottom: 6,

      fontSize: 11,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    input: {
      width: "100%",

      minHeight: 46,

      paddingHorizontal: 13,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 13,

      backgroundColor:
        COLORS.graySoft,

      fontSize: 13,

      color:
        COLORS.text,
    },

    helperText: {
      marginTop: 5,

      fontSize: 9,

      color:
        COLORS.textMuted,
    },

    twoColumnRow: {
      flexDirection:
        "row",

      gap: 10,
    },

    halfField: {
      flex: 1,
    },

    locationCard: {
      marginTop: 14,

      padding: 13,

      borderRadius: 15,

      backgroundColor:
        COLORS.blueSoft,
    },

    locationHeader: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 9,
    },

    locationIcon: {
      width: 36,

      height: 36,

      borderRadius: 11,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFFFFF",
    },

    locationTitle: {
      fontSize: 12,

      fontWeight:
        "900",

      color:
        COLORS.blue,
    },

    locationText: {
      marginTop: 3,

      fontSize: 10,

      lineHeight: 15,

      color: "#54789F",
    },

    radioCard: {
      minHeight: 66,

      marginTop: 10,

      padding: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 14,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,

      backgroundColor:
        COLORS.card,
    },

    radioCardActive: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primarySoft,
    },

    radioTitle: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    radioText: {
      marginTop: 2,

      fontSize: 10,

      color:
        COLORS.textMuted,
    },

    scheduleFields: {
      marginTop: 8,
    },

    iconInput: {
      minHeight: 46,

      paddingHorizontal: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 13,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      backgroundColor:
        COLORS.graySoft,
    },

    iconTextInput: {
      flex: 1,

      minHeight: 44,

      fontSize: 13,

      color:
        COLORS.text,
    },

    preorderNotice: {
      marginTop: 12,

      padding: 10,

      borderRadius: 12,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 7,

      backgroundColor:
        COLORS.warningSoft,
    },

    preorderNoticeText: {
      flex: 1,

      fontSize: 10,

      lineHeight: 15,

      color:
        COLORS.warning,
    },

    notesInput: {
      minHeight: 105,

      paddingTop: 12,
    },

    counterText: {
      marginTop: 5,

      textAlign:
        "right",

      fontSize: 9,

      color:
        COLORS.textMuted,
    },

    paymentCard: {
      marginTop: 10,

      minHeight: 70,

      padding: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 15,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,

      backgroundColor:
        COLORS.card,
    },

    paymentCardActive: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primarySoft,
    },

    paymentCardDisabled: {
      opacity: 0.6,

      backgroundColor:
        "#F2F0F1",
    },

    paymentIcon: {
      width: 41,

      height: 41,

      borderRadius: 13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFFFFF",
    },

    paymentTitle: {
      fontSize: 12,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    paymentText: {
      marginTop: 2,

      fontSize: 10,

      color:
        COLORS.textMuted,
    },

    disabledText: {
      color: "#989095",
    },

    totalCard: {
      marginBottom: 14,

      padding: 16,

      borderRadius: 19,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    totalHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    totalTitle: {
      fontSize: 15,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    totalDivider: {
      height: 1,

      marginVertical: 12,

      backgroundColor:
        COLORS.border,
    },

    totalRow: {
      minHeight: 32,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      gap: 15,
    },

    totalLabel: {
      fontSize: 11,

      color:
        COLORS.textMuted,
    },

    totalValue: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    calculatedText: {
      flexShrink: 1,

      textAlign:
        "right",

      fontSize: 10,

      fontWeight:
        "700",

      color:
        COLORS.blue,
    },

    totalNotice: {
      marginTop: 11,

      padding: 10,

      borderRadius: 12,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 7,

      backgroundColor:
        COLORS.blueSoft,
    },

    totalNoticeText: {
      flex: 1,

      fontSize: 9,

      lineHeight: 14,

      color:
        COLORS.blue,
    },

    bottomSpace: {
      height: 15,
    },

    checkoutBar: {
      minHeight: 79,

      paddingHorizontal: 15,

      paddingVertical: 10,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        COLORS.border,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 13,

      backgroundColor:
        COLORS.card,
    },

    checkoutTotal: {
      minWidth: 105,

      maxWidth: 135,
    },

    checkoutTotalLabel: {
      fontSize: 9,

      color:
        COLORS.textMuted,
    },

    checkoutTotalValue: {
      marginTop: 2,

      fontSize: 18,

      fontWeight:
        "900",

      color:
        COLORS.primary,
    },

    placeOrderButton: {
      flex: 1,

      minHeight: 50,

      borderRadius: 15,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      backgroundColor:
        COLORS.primary,
    },

    placeOrderButtonDisabled: {
      opacity: 0.6,
    },

    placeOrderButtonText: {
      fontSize: 13,

      fontWeight:
        "900",

      color: "#FFFFFF",
    },

    centerState: {
      flex: 1,

      paddingHorizontal: 30,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.background,
    },

    stateIcon: {
      width: 72,

      height: 72,

      marginBottom: 17,

      borderRadius: 36,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    stateTitle: {
      marginTop: 10,

      fontSize: 19,

      fontWeight:
        "900",

      color:
        COLORS.text,

      textAlign:
        "center",
    },

    stateText: {
      marginTop: 9,

      fontSize: 12,

      lineHeight: 18,

      color:
        COLORS.textMuted,

      textAlign:
        "center",
    },

    retryButton: {
      marginTop: 20,

      minHeight: 44,

      paddingHorizontal: 20,

      borderRadius: 13,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,

      backgroundColor:
        COLORS.primary,
    },

    retryButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color: "#FFFFFF",
    },

    backStateButton: {
      marginTop: 10,

      paddingHorizontal: 18,

      paddingVertical: 10,
    },

    backStateText: {
      fontSize: 12,

      fontWeight:
        "700",

      color:
        COLORS.primary,
    },
  });