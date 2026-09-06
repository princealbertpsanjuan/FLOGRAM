import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Location from "expo-location";

import MapView, {
  Marker,
  type LatLng,
} from "react-native-maps";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | string;

type CheckoutStatus =
  | "created"
  | "payment_pending"
  | "paid"
  | "completed"
  | "cancelled"
  | "failed"
  | string;

/* =========================================================
 * ADDRESS
 * ======================================================= */

type Address = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  landmark?: string;
};

/* =========================================================
 * FLORIST
 * ======================================================= */

type Florist = {
  _id?: string;
  shopName?: string;
  shopLogo?: string | null;
  address?: Address | null;
};

/* =========================================================
 * CUSTOM BOUQUET
 * ======================================================= */

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
 * CART
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
 * GROUPED CHECKOUT QUOTE
 * ======================================================= */

type CheckoutQuoteItem = {
  cartItem?: string | null;

  flower?: string | CartFlower | null;

  seller?: string | null;

  florist?:
    | string
    | Florist
    | null;

  productName?: string;

  inspirationImage?: string | null;

  quantity?: number;

  unitPrice?: number;

  subtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  deliveryDistanceMeters?:
    | number
    | null;

  deliveryDurationSeconds?:
    | number
    | null;
};

type CheckoutShopQuote = {
  florist?:
    | string
    | Florist
    | null;

  shopName?: string;

  itemCount?: number;

  totalQuantity?: number;

  productsSubtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  deliveryDistanceMeters?:
    | number
    | null;

  deliveryDurationSeconds?:
    | number
    | null;

  items?: CheckoutQuoteItem[];
};

type CheckoutQuote = {
  itemCount?: number;

  totalQuantity?: number;

  shopCount?: number;

  productsSubtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  shops?: CheckoutShopQuote[];

  items?: CheckoutQuoteItem[];
};

type CheckoutQuoteResponse = {
  success: boolean;

  message?: string;

  data?: {
    quote?: CheckoutQuote;
  };
};

/* =========================================================
 * GROUPED CHECKOUT
 * ======================================================= */

type CheckoutOrder = {
  _id: string;

  productName?: string;

  quantity?: number;

  subtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  paymentMethod?: PaymentMethod;

  paymentStatus?: PaymentStatus;

  orderStatus?: string;

  florist?: Florist | null;
};

type Checkout = {
  _id: string;

  customer?: string;

  items?: CheckoutQuoteItem[];

  orders?: CheckoutOrder[];

  shopBreakdown?: CheckoutShopQuote[];

  fulfillmentType?: FulfillmentType;

  productsSubtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  paymentMethod?: PaymentMethod;

  paymentProvider?: string | null;

  paymentStatus?: PaymentStatus;

  checkoutStatus?: CheckoutStatus;

  paymongoCheckoutSessionId?:
    | string
    | null;

  paymongoPaymentId?:
    | string
    | null;

  paymentCheckoutUrl?:
    | string
    | null;

  paymentInitiatedAt?:
    | string
    | null;

  paidAt?:
    | string
    | null;

  paymentFailedAt?:
    | string
    | null;

  lastPaymentEventId?:
    | string
    | null;

  createdAt?: string;

  updatedAt?: string;
};

type CreateCheckoutResponse = {
  success: boolean;

  message?: string;

  data?: {
    checkout?: Checkout;
  };
};

type GetCheckoutResponse = {
  success: boolean;

  message?: string;

  data?: {
    checkout?: Checkout;
  };
};

type GroupedPayMongoResponse = {
  success: boolean;

  message?: string;

  data?: {
    checkoutId?: string;

    checkoutSessionId?: string;

    checkoutUrl?: string;

    paymentStatus?: PaymentStatus;

    productsSubtotal?: number;

    deliveryFee?: number;

    preOrderFee?: number;

    totalAmount?: number;
  };
};

/* =========================================================
 * LEGACY ORDER
 *
 * Still used by custom bouquet checkout.
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

type LegacyPayMongoResponse = {
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
  process.env
    .EXPO_PUBLIC_API_URL ??
  "";

const SERVER_ORIGIN =
  API_BASE.replace(
    /\/api\/v1\/?$/i,
    ""
  ).replace(
    /\/+$/,
    ""
  );

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
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    )
  ) {
    return value;
  }

  const cleaned =
    value
      .replaceAll(
        "\\",
        "/"
      )
      .replace(
        /^\/+/,
        ""
      );

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
    typeof error ===
      "object" &&
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
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
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

const sleep = (
  milliseconds: number
) =>
  new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );

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
      item.flower
        .isAvailable ===
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
    Array.isArray(
      params.mode
    )
      ? params.mode[0] ??
        ""
      : params.mode ?? "";

  const isCartCheckout =
    mode === "cart";

  /* =======================================================
   * SOURCE DATA
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
   * FORM
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
    deliveryCoordinate,
    setDeliveryCoordinate,
  ] =
    useState<LatLng | null>(
      null
    );

  const [
    locationPermissionGranted,
    setLocationPermissionGranted,
  ] =
    useState(false);

  const [
    locatingCustomer,
    setLocatingCustomer,
  ] =
    useState(false);

  const [
    locationError,
    setLocationError,
  ] =
    useState<
      string | null
    >(null);

  const deliveryMapRef =
    useRef<MapView | null>(
      null
    );

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

  /* =======================================================
   * GROUPED CART CHECKOUT STATE
   * ===================================================== */

  const [
    quote,
    setQuote,
  ] =
    useState<
      CheckoutQuote | null
    >(null);

  const [
    quoteLoading,
    setQuoteLoading,
  ] =
    useState(false);

  const [
    quoteError,
    setQuoteError,
  ] =
    useState<
      string | null
    >(null);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    checkingPayment,
    setCheckingPayment,
  ] =
    useState(false);

  const [
    createdCheckout,
    setCreatedCheckout,
  ] =
    useState<
      Checkout | null
    >(null);

  const quoteRequestIdRef =
    useRef(0);

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
          loadedCart.items
            .length === 0
        ) {
          throw new Error(
            "Your shopping cart is empty."
          );
        }

        if (
          loadedCart
            .unavailableItemCount >
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
   * LOAD SCREEN
   * ===================================================== */

  const loadCheckout =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(
              true
            );
          }

          setLoadError(
            null
          );

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
            setLoading(
              false
            );
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
   * DERIVED CUSTOM VALUES
   * ===================================================== */

  const florist =
    useMemo(
      () =>
        getFlorist(
          request
        ),
      [request]
    );

  const customImageUrl =
    getImageUrl(
      request
        ?.inspirationImage
    );

  const customTitle =
    request?.occasion
      ? `Custom ${request.occasion} Bouquet`
      : "Custom Bouquet";

  const quotedPrice =
    request
      ?.quotedPrice ??
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
   * DERIVED CART VALUES
   * ===================================================== */

  const cartItems =
    cart?.items ?? [];

  const cartSubtotal =
    cart
      ?.estimatedSubtotal ??
    0;

  const cartTotalQuantity =
    cart
      ?.totalQuantity ??
    0;

  /* =======================================================
   * DELIVERY LOCATION PIN
   * ===================================================== */

  const selectDeliveryCoordinate =
    useCallback(
      (coordinate: LatLng) => {
        if (
          !Number.isFinite(
            coordinate.latitude
          ) ||
          !Number.isFinite(
            coordinate.longitude
          )
        ) {
          return;
        }

        setDeliveryCoordinate(
          coordinate
        );

        setLocationError(
          null
        );

        setQuote(
          null
        );

        setQuoteError(
          null
        );
      },
      []
    );

  /* =======================================================
   * USE CURRENT LOCATION
   * ===================================================== */

  const handleUseCurrentLocation =
    useCallback(
      async () => {
        try {
          setLocatingCustomer(
            true
          );

          setLocationError(
            null
          );

          const permission =
            await Location
              .requestForegroundPermissionsAsync();

          if (
            permission.status !==
            "granted"
          ) {
            setLocationPermissionGranted(
              false
            );

            setLocationError(
              "Location permission is required to use your current location. You can still tap the map to choose the delivery point."
            );

            return;
          }

          setLocationPermissionGranted(
            true
          );

          const currentLocation =
            await Location
              .getCurrentPositionAsync(
                {
                  accuracy:
                    Location.Accuracy.High,
                }
              );

          const coordinate:
            LatLng = {
            latitude:
              currentLocation.coords
                .latitude,

            longitude:
              currentLocation.coords
                .longitude,
          };

          selectDeliveryCoordinate(
            coordinate
          );

          deliveryMapRef.current
            ?.animateToRegion(
              {
                latitude:
                  coordinate.latitude,

                longitude:
                  coordinate.longitude,

                latitudeDelta:
                  0.008,

                longitudeDelta:
                  0.008,
              },
              500
            );
        } catch (error) {
          setLocationError(
            getErrorMessage(
              error,
              "Unable to get your current location. Tap the map to choose the delivery point manually."
            )
          );
        } finally {
          setLocatingCustomer(
            false
          );
        }
      },
      [
        selectDeliveryCoordinate,
      ]
    );

  /* =======================================================
   * FULFILLMENT
   * ===================================================== */

  const chooseFulfillment = (
    value: FulfillmentType
  ) => {
    setFulfillmentType(
      value
    );

    setQuote(
      null
    );

    setQuoteError(
      null
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

  const getValidationError =
    useCallback(
      (
        checkPayment = true
      ) => {
        if (
          isCartCheckout
        ) {
          if (
            !cart ||
            cart.items.length === 0
          ) {
            return "Your shopping cart is empty.";
          }

          const unavailable =
            cart.items.some(
              (item) =>
                !isCartItemPurchasable(
                  item
                )
            );

          if (unavailable) {
            return "Remove unavailable flower listings before checkout.";
          }
        } else {
          if (!request) {
            return "The bouquet request has not loaded.";
          }

          if (
            request.status !==
            "customer_accepted"
          ) {
            return "Select a florist proposal before proceeding to checkout.";
          }
        }

        if (
          !recipientName.trim()
        ) {
          return "Enter the recipient's full name.";
        }

        if (
          !recipientPhone.trim()
        ) {
          return "Enter the recipient's phone number.";
        }

        if (
          !isValidPhilippinePhone(
            recipientPhone
          )
        ) {
          return "Enter a valid Philippine phone number such as 09171234567.";
        }

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
            return "Complete the street, barangay, city, and province fields.";
          }

          if (
            !deliveryCoordinate
          ) {
            return "Pin the exact delivery location on the map.";
          }

          const selectedLatitude =
            deliveryCoordinate.latitude;

          const selectedLongitude =
            deliveryCoordinate.longitude;

          if (
            !Number.isFinite(
              selectedLatitude
            ) ||
            !Number.isFinite(
              selectedLongitude
            ) ||
            selectedLatitude < -90 ||
            selectedLatitude > 90 ||
            selectedLongitude < -180 ||
            selectedLongitude > 180
          ) {
            return "The pinned delivery location is invalid.";
          }
        }

        if (scheduled) {
          if (
            !isValidDate(
              deliveryDate
            )
          ) {
            return "Enter the scheduled date using YYYY-MM-DD.";
          }

          const selectedDate =
            new Date(
              `${deliveryDate}T23:59:59`
            );

          if (
            Number.isNaN(
              selectedDate.getTime()
            )
          ) {
            return "Enter a valid scheduled delivery date.";
          }

          if (
            selectedDate.getTime() <=
            Date.now()
          ) {
            return "Scheduled delivery must be in the future.";
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
            hasStart !== hasEnd
          ) {
            return "Enter both delivery start and end times, or leave both empty.";
          }

          if (
            hasStart &&
            !isValidTime(
              startTime
            )
          ) {
            return "Use HH:MM format for the delivery start time.";
          }

          if (
            hasEnd &&
            !isValidTime(
              endTime
            )
          ) {
            return "Use HH:MM format for the delivery end time.";
          }
        }

        if (checkPayment) {
          if (
            fulfillmentType ===
              "delivery" &&
            paymentMethod ===
              "cash_on_pickup"
          ) {
            return "Cash on pickup cannot be used for delivery.";
          }

          if (
            fulfillmentType ===
              "pickup" &&
            paymentMethod ===
              "cash_on_delivery"
          ) {
            return "Cash on delivery cannot be used for pickup.";
          }
        }

        return null;
      },
      [
        barangay,
        cart,
        city,
        deliveryCoordinate,
        deliveryDate,
        endTime,
        fulfillmentType,
        isCartCheckout,
        paymentMethod,
        province,
        recipientName,
        recipientPhone,
        request,
        scheduled,
        startTime,
        street,
      ]
    );

  const validateForm =
    () => {
      const error =
        getValidationError(
          true
        );

      if (!error) {
        return true;
      }

      Alert.alert(
        "Checkout information",
        error
      );

      return false;
    };

  /* =======================================================
   * COMMON BODY
   * ===================================================== */

  const commonBody =
    useMemo(() => {
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

        customerNotes:
          notes.trim() ||
          undefined,
      };

      if (
        fulfillmentType ===
        "delivery"
      ) {
        body.deliveryAddress = {
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

        if (
          deliveryCoordinate
        ) {
          body.deliveryLocation = {
            latitude:
              deliveryCoordinate.latitude,

            longitude:
              deliveryCoordinate.longitude,
          };
        }
      }

      if (
        scheduled &&
        isValidDate(
          deliveryDate
        )
      ) {
        const requestedDate =
          new Date(
            `${deliveryDate}T12:00:00`
          );

        if (
          !Number.isNaN(
            requestedDate.getTime()
          )
        ) {
          body.requestedDeliveryDate =
            requestedDate.toISOString();
        }

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
    }, [
      barangay,
      city,
      deliveryCoordinate,
      deliveryDate,
      endTime,
      fulfillmentType,
      landmark,
      notes,
      postalCode,
      province,
      recipientName,
      recipientPhone,
      scheduled,
      startTime,
      street,
    ]);

  /* =======================================================
   * CART QUOTE
   * ===================================================== */

  const requestCartQuote =
    useCallback(
      async (
        showErrors = false
      ) => {
        if (
          !isCartCheckout
        ) {
          return null;
        }

        const validationError =
          getValidationError(
            false
          );

        if (
          validationError
        ) {
          setQuote(
            null
          );

          if (showErrors) {
            Alert.alert(
              "Complete checkout details",
              validationError
            );
          }

          return null;
        }

        const requestId =
          ++quoteRequestIdRef
            .current;

        try {
          setQuoteLoading(
            true
          );

          setQuoteError(
            null
          );

          const response =
            await apiRequest<CheckoutQuoteResponse>(
              "/checkout/quote",
              {
                method:
                  "POST",

                authenticated:
                  true,

                body:
                  JSON.stringify(
                    commonBody
                  ),
              }
            );

          if (
            requestId !==
            quoteRequestIdRef
              .current
          ) {
            return null;
          }

          const loadedQuote =
            response?.data
              ?.quote;

          if (!loadedQuote) {
            throw new Error(
              "The server did not return a checkout quote."
            );
          }

          setQuote(
            loadedQuote
          );

          return loadedQuote;
        } catch (error) {
          if (
            requestId ===
            quoteRequestIdRef
              .current
          ) {
            const message =
              getErrorMessage(
                error,
                "Unable to calculate the checkout total."
              );

            setQuote(
              null
            );

            setQuoteError(
              message
            );

            if (showErrors) {
              Alert.alert(
                "Unable to calculate total",
                message
              );
            }
          }

          return null;
        } finally {
          if (
            requestId ===
            quoteRequestIdRef
              .current
          ) {
            setQuoteLoading(
              false
            );
          }
        }
      },
      [
        commonBody,
        getValidationError,
        isCartCheckout,
      ]
    );

  /*
   * Automatically refresh the server quote.
   *
   * A short debounce prevents route calculation
   * on every keystroke.
   */
  useEffect(() => {
    if (
      !isCartCheckout ||
      !cart
    ) {
      return;
    }

    setQuote(
      null
    );

    setQuoteError(
      null
    );

    const validationError =
      getValidationError(
        false
      );

    if (validationError) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          void requestCartQuote(
            false
          );
        },
        700
      );

    return () => {
      clearTimeout(
        timer
      );
    };
  }, [
    cart,
    commonBody,
    getValidationError,
    isCartCheckout,
    requestCartQuote,
  ]);

  /* =======================================================
   * GROUPED CHECKOUT CREATION
   * ===================================================== */

  const createGroupedCheckout =
    async () => {
      const freshQuote =
        quote ??
        (
          await requestCartQuote(
            true
          )
        );

      if (!freshQuote) {
        throw new Error(
          "A valid checkout quote is required before placing the order."
        );
      }

      const response =
        await apiRequest<CreateCheckoutResponse>(
          "/checkout",
          {
            method:
              "POST",

            authenticated:
              true,

            body:
              JSON.stringify({
                ...commonBody,

                paymentMethod,
              }),
          }
        );

      const checkout =
        response?.data
          ?.checkout;

      if (!checkout?._id) {
        throw new Error(
          "The server did not return the created checkout."
        );
      }

      setCreatedCheckout(
        checkout
      );

      return checkout;
    };

  /* =======================================================
   * GROUPED PAYMONGO
   * ===================================================== */

  const getGroupedCheckout =
    async (
      checkoutId: string
    ) => {
      const response =
        await apiRequest<GetCheckoutResponse>(
          `/checkout/${checkoutId}`,
          {
            authenticated:
              true,
          }
        );

      const checkout =
        response?.data
          ?.checkout;

      if (!checkout) {
        throw new Error(
          "The checkout was not returned by the server."
        );
      }

      setCreatedCheckout(
        checkout
      );

      return checkout;
    };

  const waitForGroupedPayment =
    async (
      checkoutId: string
    ) => {
      try {
        setCheckingPayment(
          true
        );

        /*
         * Give PayMongo webhook time to reach
         * the backend after browser checkout.
         */
        for (
          let attempt = 0;
          attempt < 10;
          attempt += 1
        ) {
          if (attempt > 0) {
            await sleep(
              1500
            );
          }

          const checkout =
            await getGroupedCheckout(
              checkoutId
            );

          if (
            checkout.paymentStatus ===
            "paid"
          ) {
            return checkout;
          }

          if (
            checkout.paymentStatus ===
              "failed" ||
            checkout.checkoutStatus ===
              "failed"
          ) {
            return checkout;
          }
        }

        return await getGroupedCheckout(
          checkoutId
        );
      } finally {
        setCheckingPayment(
          false
        );
      }
    };

  const startGroupedPayMongo =
    async (
      checkout: Checkout
    ) => {
      const response =
        await apiRequest<GroupedPayMongoResponse>(
          `/checkout/${checkout._id}/paymongo`,
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

      await WebBrowser
        .openBrowserAsync(
          checkoutUrl
        );

      return waitForGroupedPayment(
        checkout._id
      );
    };

  /* =======================================================
   * LEGACY CUSTOM BOUQUET PAYMONGO
   * ===================================================== */

  const startCustomPayMongo =
    async (
      orderId: string
    ) => {
      const response =
        await apiRequest<LegacyPayMongoResponse>(
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

      await WebBrowser
        .openBrowserAsync(
          checkoutUrl
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
        ...commonBody,

        paymentMethod,

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
        response?.data
          ?.order;

      if (!order?._id) {
        throw new Error(
          "The server did not return the created order."
        );
      }

      return order;
    };

  /* =======================================================
   * COMPLETE / NAVIGATION
   * ===================================================== */

  const returnHome =
    () => {
      router.replace(
        "/(customer)/customer-dashboard" as never
      );
    };

  const showGroupedPaymentResult =
    (
      checkout: Checkout
    ) => {
      if (
        checkout.paymentStatus ===
        "paid"
      ) {
        Alert.alert(
          "Payment successful",
          `Your payment of ${formatCurrency(
            checkout.totalAmount
          )} was verified successfully. Your orders have been placed.`,
          [
            {
              text:
                "Continue",

              onPress:
                returnHome,
            },
          ]
        );

        return;
      }

      if (
        checkout.paymentStatus ===
        "failed"
      ) {
        Alert.alert(
          "Payment not completed",
          "PayMongo reported that the payment was not completed. Your checkout has been saved.",
          [
            {
              text:
                "OK",
            },
          ]
        );

        return;
      }

      Alert.alert(
        "Payment verification pending",
        "The payment page was closed, but FLOGRAM has not received PayMongo's successful payment confirmation yet. You can check the payment status again.",
        [
          {
            text:
              "Stay Here",
          },

          {
            text:
              "Check Again",

            onPress:
              () => {
                void handleCheckPaymentAgain();
              },
          },
        ]
      );
    };

  const handleCheckPaymentAgain =
    async () => {
      if (
        !createdCheckout?._id
      ) {
        return;
      }

      try {
        const checkout =
          await waitForGroupedPayment(
            createdCheckout._id
          );

        showGroupedPaymentResult(
          checkout
        );
      } catch (error) {
        Alert.alert(
          "Unable to check payment",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      }
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
         * =================================================
         * CART → GROUPED CHECKOUT
         * =================================================
         */
        if (
          isCartCheckout
        ) {
          const checkout =
            await createGroupedCheckout();

          /*
           * CASH
           */
          if (
            paymentMethod !==
            "paymongo"
          ) {
            Alert.alert(
              "Order placed!",
              fulfillmentType ===
              "delivery"
                ? `Your checkout was created successfully. ${formatCurrency(
                    checkout.totalAmount
                  )} will be collected upon delivery.`
                : `Your checkout was created successfully. ${formatCurrency(
                    checkout.totalAmount
                  )} will be collected when you pick up your order.`,
              [
                {
                  text:
                    "Continue",

                  onPress:
                    returnHome,
                },
              ]
            );

            return;
          }

          /*
           * PAYMONGO
           */
          try {
            const updatedCheckout =
              await startGroupedPayMongo(
                checkout
              );

            showGroupedPaymentResult(
              updatedCheckout
            );
          } catch (paymentError) {
            Alert.alert(
              "Checkout created",
              `Your orders were created, but the PayMongo payment page could not be completed.\n\n${getErrorMessage(
                paymentError,
                "You can retry payment."
              )}`,
              [
                {
                  text:
                    "OK",
                },
              ]
            );
          }

          return;
        }

        /*
         * =================================================
         * CUSTOM BOUQUET
         *
         * Preserve existing direct Order flow.
         * =================================================
         */

        const order =
          await placeCustomOrder();

        if (
          paymentMethod ===
          "paymongo"
        ) {
          try {
            await startCustomPayMongo(
              order._id
            );

            Alert.alert(
              "Payment submitted",
              "Your custom bouquet order was created. FLOGRAM will update the payment status after PayMongo confirms the payment.",
              [
                {
                  text:
                    "Continue",

                  onPress:
                    returnHome,
                },
              ]
            );
          } catch (
            paymentError
          ) {
            Alert.alert(
              "Order created",
              `Your custom bouquet order was created, but the PayMongo payment page could not be opened.\n\n${getErrorMessage(
                paymentError,
                "You can retry payment later."
              )}`,
              [
                {
                  text:
                    "OK",
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
                "Continue",

              onPress:
                returnHome,
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
            Preparing your checkout...
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
          {/* =================================================
              ORDER SUMMARY
          ================================================= */}

          <Section
            icon="flower-outline"
            title="Order Summary"
            subtitle={
              isCartCheckout
                ? "Review all flower listings in this checkout."
                : "Review your selected custom bouquet."
            }
          >
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
                              size={29}
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
                            styles.lineTotalBox
                          }
                        >
                          <Text
                            style={
                              styles.lineTotalLabel
                            }
                          >
                            Subtotal
                          </Text>

                          <Text
                            style={
                              styles.lineTotalValue
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
                    styles.infoBadge
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={19}
                    color={
                      COLORS.blue
                    }
                  />

                  <Text
                    style={
                      styles.infoBadgeText
                    }
                  >
                    FLOGRAM groups this cart
                    into one customer checkout.
                    Each florist still receives
                    separate fulfillment orders.
                    Delivery and pre-order fees
                    are calculated once per shop.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View
                  style={
                    styles.customProductCard
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
                    styles.successBadge
                  }
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={
                      COLORS.success
                    }
                  />

                  <Text
                    style={
                      styles.successBadgeText
                    }
                  >
                    Selected florist proposal
                  </Text>
                </View>
              </>
            )}
          </Section>

          {/* =================================================
              FULFILLMENT
          ================================================= */}

          <Section
            icon="bicycle-outline"
            title="Fulfillment"
            subtitle="Choose how you want to receive your bouquet."
          >
            <View
              style={
                styles.choiceRow
              }
            >
              <ChoiceCard
                icon="bicycle-outline"
                title="Delivery"
                subtitle="Rider delivery"
                selected={
                  fulfillmentType ===
                  "delivery"
                }
                onPress={() =>
                  chooseFulfillment(
                    "delivery"
                  )
                }
              />

              <ChoiceCard
                icon="storefront-outline"
                title="Pickup"
                subtitle="Pick up at shop"
                selected={
                  fulfillmentType ===
                  "pickup"
                }
                onPress={() =>
                  chooseFulfillment(
                    "pickup"
                  )
                }
              />
            </View>
          </Section>

          {/* =================================================
              RECIPIENT
          ================================================= */}

          <Section
            icon="person-outline"
            title="Recipient Details"
            subtitle="Who will receive the bouquet?"
          >
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
                Philippine mobile number
              </Text>
            </Field>
          </Section>

          {/* =================================================
              DELIVERY ADDRESS
          ================================================= */}

          {fulfillmentType ===
            "delivery" && (
            <Section
              icon="location-outline"
              title="Delivery Address"
              subtitle="Enter the recipient's delivery location."
            >
              <Field
                label="Street / House Number"
              >
                <TextInput
                  value={
                    street
                  }
                  onChangeText={
                    setStreet
                  }
                  placeholder="123 Sample Street"
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
                    styles.column
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
                      placeholder="Naga City"
                      placeholderTextColor="#A59CA1"
                      style={
                        styles.input
                      }
                    />
                  </Field>
                </View>

                <View
                  style={
                    styles.column
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
                      placeholder="Camarines Sur"
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
                    styles.column
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
                    styles.column
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
                  styles.locationNotice
                }
              >
                <Ionicons
                  name="navigate-circle-outline"
                  size={20}
                  color={
                    COLORS.blue
                  }
                />

                <Text
                  style={
                    styles.locationNoticeText
                  }
                >
                  Pin the recipient&apos;s exact delivery location. FLOGRAM will use the pinned point to calculate the delivery route and fee.
                </Text>
              </View>

              <View
                style={
                  styles.deliveryMapCard
                }
              >
                <MapView
                  ref={
                    deliveryMapRef
                  }
                  style={
                    styles.deliveryMap
                  }
                  initialRegion={{
                    latitude: 13.6218,
                    longitude: 123.1948,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  showsUserLocation={
                    locationPermissionGranted
                  }
                  showsMyLocationButton={
                    false
                  }
                  showsCompass
                  rotateEnabled
                  pitchEnabled
                  zoomEnabled
                  scrollEnabled
                  mapType="standard"
                  onPress={(event) => {
                    selectDeliveryCoordinate(
                      event.nativeEvent.coordinate
                    );
                  }}
                >
                  {deliveryCoordinate && (
                    <Marker
                      coordinate={
                        deliveryCoordinate
                      }
                      title="Delivery Location"
                      description="Recipient delivery point"
                      draggable
                      onDragEnd={(event) => {
                        selectDeliveryCoordinate(
                          event.nativeEvent.coordinate
                        );
                      }}
                    />
                  )}
                </MapView>

                {!deliveryCoordinate && (
                  <View
                    pointerEvents="none"
                    style={
                      styles.mapHintOverlay
                    }
                  >
                    <View
                      style={
                        styles.mapHintBubble
                      }
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color={
                          COLORS.primary
                        }
                      />

                      <Text
                        style={
                          styles.mapHintText
                        }
                      >
                        Tap the map to place the delivery pin
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <Pressable
                disabled={
                  locatingCustomer
                }
                onPress={() => {
                  void handleUseCurrentLocation();
                }}
                style={({
                  pressed,
                }) => [
                  styles.currentLocationButton,
                  pressed &&
                    styles.currentLocationButtonPressed,
                  locatingCustomer &&
                    styles.currentLocationButtonDisabled,
                ]}
              >
                {locatingCustomer ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.primary
                    }
                  />
                ) : (
                  <Ionicons
                    name="navigate"
                    size={18}
                    color={
                      COLORS.primary
                    }
                  />
                )}

                <Text
                  style={
                    styles.currentLocationButtonText
                  }
                >
                  {locatingCustomer
                    ? "Finding your location..."
                    : "Use My Current Location"}
                </Text>
              </Pressable>

              {deliveryCoordinate && (
                <View
                  style={
                    styles.selectedLocationCard
                  }
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={
                      COLORS.success
                    }
                  />

                  <View
                    style={
                      styles.selectedLocationTextArea
                    }
                  >
                    <Text
                      style={
                        styles.selectedLocationTitle
                      }
                    >
                      Delivery location pinned
                    </Text>

                    <Text
                      style={
                        styles.selectedLocationText
                      }
                    >
                      Tap another point or drag the marker to adjust the destination.
                    </Text>
                  </View>
                </View>
              )}

              {locationError && (
                <View
                  style={
                    styles.locationErrorCard
                  }
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={
                      COLORS.danger
                    }
                  />

                  <Text
                    style={
                      styles.locationErrorText
                    }
                  >
                    {locationError}
                  </Text>
                </View>
              )}
            </Section>
          )}

          {/* =================================================
              SCHEDULE
          ================================================= */}

          <Section
            icon="calendar-outline"
            title="Delivery Schedule"
            subtitle="Order now or schedule a future fulfillment."
          >
            <Pressable
              onPress={() => {
                setScheduled(
                  (value) =>
                    !value
                );

                setQuote(
                  null
                );
              }}
              style={
                styles.toggleRow
              }
            >
              <View
                style={
                  styles.toggleTextArea
                }
              >
                <Text
                  style={
                    styles.toggleTitle
                  }
                >
                  Pre-order / Schedule
                </Text>

                <Text
                  style={
                    styles.toggleSubtitle
                  }
                >
                  Schedule this order for a
                  future date.
                </Text>
              </View>

              <View
                style={[
                  styles.switchTrack,

                  scheduled &&
                    styles.switchTrackActive,
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,

                    scheduled &&
                      styles.switchThumbActive,
                  ]}
                />
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
                  <TextInput
                    value={
                      deliveryDate
                    }
                    onChangeText={
                      setDeliveryDate
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#A59CA1"
                    autoCapitalize="none"
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
                      styles.column
                    }
                  >
                    <Field
                      label="Start Time"
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
                        autoCapitalize="none"
                        style={
                          styles.input
                        }
                      />
                    </Field>
                  </View>

                  <View
                    style={
                      styles.column
                    }
                  >
                    <Field
                      label="End Time"
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
                        autoCapitalize="none"
                        style={
                          styles.input
                        }
                      />
                    </Field>
                  </View>
                </View>

                <View
                  style={
                    styles.warningBadge
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={
                      COLORS.warning
                    }
                  />

                  <Text
                    style={
                      styles.warningText
                    }
                  >
                    Pre-order fees are
                    calculated by the backend.
                    For grouped cart checkout,
                    the fee is charged once per
                    florist/shop.
                  </Text>
                </View>
              </View>
            )}
          </Section>

          {/* =================================================
              NOTES
          ================================================= */}

          <Section
            icon="chatbubble-ellipses-outline"
            title="Order Notes"
            subtitle="Add optional instructions for your florist or rider."
          >
            <TextInput
              value={
                notes
              }
              onChangeText={
                setNotes
              }
              placeholder="Example: Please handle carefully."
              placeholderTextColor="#A59CA1"
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.notesInput,
              ]}
            />
          </Section>

          {/* =================================================
              PAYMENT
          ================================================= */}

          <Section
            icon="wallet-outline"
            title="Payment Method"
            subtitle="Choose how you want to pay."
          >
            {fulfillmentType ===
              "delivery" && (
              <PaymentChoice
                icon="cash-outline"
                title="Cash on Delivery"
                subtitle="Pay when the rider delivers your order."
                selected={
                  paymentMethod ===
                  "cash_on_delivery"
                }
                onPress={() =>
                  setPaymentMethod(
                    "cash_on_delivery"
                  )
                }
              />
            )}

            {fulfillmentType ===
              "pickup" && (
              <PaymentChoice
                icon="cash-outline"
                title="Cash on Pickup"
                subtitle="Pay when you collect your order from the shop."
                selected={
                  paymentMethod ===
                  "cash_on_pickup"
                }
                onPress={() =>
                  setPaymentMethod(
                    "cash_on_pickup"
                  )
                }
              />
            )}

            <PaymentChoice
              icon="card-outline"
              title="PayMongo"
              subtitle={
                isCartCheckout
                  ? "Pay all items in this checkout through one PayMongo payment."
                  : "Pay securely through PayMongo."
              }
              selected={
                paymentMethod ===
                "paymongo"
              }
              onPress={() =>
                setPaymentMethod(
                  "paymongo"
                )
              }
            />
          </Section>

          {/* =================================================
              CART SERVER QUOTE
          ================================================= */}

          {isCartCheckout && (
            <Section
              icon="receipt-outline"
              title="Checkout Total"
              subtitle="Calculated securely by the FLOGRAM backend."
            >
              {quoteLoading ? (
                <View
                  style={
                    styles.quoteLoading
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.primary
                    }
                  />

                  <Text
                    style={
                      styles.quoteLoadingText
                    }
                  >
                    Calculating delivery
                    and pre-order fees...
                  </Text>
                </View>
              ) : quote ? (
                <>
                  {Boolean(
                    quote.shops
                      ?.length
                  ) && (
                    <View
                      style={
                        styles.shopBreakdownContainer
                      }
                    >
                      {quote.shops?.map(
                        (
                          shop,
                          index
                        ) => (
                          <View
                            key={
                              `${
                                shop.shopName ??
                                "shop"
                              }-${index}`
                            }
                            style={
                              styles.shopCard
                            }
                          >
                            <View
                              style={
                                styles.shopHeader
                              }
                            >
                              <View
                                style={
                                  styles.shopIcon
                                }
                              >
                                <Ionicons
                                  name="storefront-outline"
                                  size={17}
                                  color={
                                    COLORS.primary
                                  }
                                />
                              </View>

                              <View
                                style={
                                  styles.shopHeaderText
                                }
                              >
                                <Text
                                  style={
                                    styles.shopName
                                  }
                                >
                                  {shop.shopName ||
                                    `Shop ${
                                      index +
                                      1
                                    }`}
                                </Text>

                                <Text
                                  style={
                                    styles.shopMeta
                                  }
                                >
                                  {shop.itemCount ??
                                    0}{" "}
                                  product
                                  {(shop.itemCount ??
                                    0) ===
                                  1
                                    ? ""
                                    : "s"}{" "}
                                  •{" "}
                                  {shop.totalQuantity ??
                                    0}{" "}
                                  item
                                  {(shop.totalQuantity ??
                                    0) ===
                                  1
                                    ? ""
                                    : "s"}
                                </Text>
                              </View>
                            </View>

                            <SummaryRow
                              label="Products"
                              value={
                                shop.productsSubtotal
                              }
                            />

                            <SummaryRow
                              label="Delivery"
                              value={
                                shop.deliveryFee
                              }
                            />

                            <SummaryRow
                              label="Pre-order"
                              value={
                                shop.preOrderFee
                              }
                            />

                            <View
                              style={
                                styles.shopTotalDivider
                              }
                            />

                            <SummaryRow
                              label="Shop total"
                              value={
                                shop.totalAmount
                              }
                              strong
                            />
                          </View>
                        )
                      )}
                    </View>
                  )}

                  <View
                    style={
                      styles.totalCard
                    }
                  >
                    <SummaryRow
                      label="Products subtotal"
                      value={
                        quote.productsSubtotal
                      }
                    />

                    <SummaryRow
                      label="Delivery fee"
                      value={
                        quote.deliveryFee
                      }
                    />

                    <SummaryRow
                      label="Pre-order fee"
                      value={
                        quote.preOrderFee
                      }
                    />

                    <View
                      style={
                        styles.totalDivider
                      }
                    />

                    <View
                      style={
                        styles.grandTotalRow
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.grandTotalLabel
                          }
                        >
                          Total
                        </Text>

                        <Text
                          style={
                            styles.grandTotalCaption
                          }
                        >
                          {quote.shopCount ??
                            0}{" "}
                          shop
                          {(quote.shopCount ??
                            0) ===
                          1
                            ? ""
                            : "s"}{" "}
                          •{" "}
                          {quote.totalQuantity ??
                            cartTotalQuantity}{" "}
                          item
                          {(quote.totalQuantity ??
                            cartTotalQuantity) ===
                          1
                            ? ""
                            : "s"}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.grandTotalValue
                        }
                      >
                        {formatCurrency(
                          quote.totalAmount
                        )}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View>
                  <View
                    style={
                      styles.pendingQuote
                    }
                  >
                    <Ionicons
                      name="calculator-outline"
                      size={22}
                      color={
                        quoteError
                          ? COLORS.danger
                          : COLORS.primary
                      }
                    />

                    <Text
                      style={[
                        styles.pendingQuoteText,

                        quoteError &&
                          styles.pendingQuoteError,
                      ]}
                    >
                      {quoteError ||
                        "Complete the recipient and fulfillment details to calculate the final server total."}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      void requestCartQuote(
                        true
                      );
                    }}
                    disabled={
                      quoteLoading
                    }
                    style={
                      styles.calculateButton
                    }
                  >
                    <Ionicons
                      name="calculator-outline"
                      size={17}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.calculateButtonText
                      }
                    >
                      Calculate Total
                    </Text>
                  </Pressable>
                </View>
              )}
            </Section>
          )}

          {/* =================================================
              CUSTOM SUMMARY
          ================================================= */}

          {!isCartCheckout && (
            <Section
              icon="receipt-outline"
              title="Price Summary"
              subtitle="Final delivery and pre-order fees are calculated by the backend when the custom bouquet order is created."
            >
              <View
                style={
                  styles.totalCard
                }
              >
                <SummaryRow
                  label="Bouquet subtotal"
                  value={
                    customSubtotal
                  }
                />

                <View
                  style={
                    styles.totalDivider
                  }
                />

                <View
                  style={
                    styles.grandTotalRow
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.grandTotalLabel
                      }
                    >
                      Bouquet
                    </Text>

                    <Text
                      style={
                        styles.grandTotalCaption
                      }
                    >
                      Delivery or scheduling
                      fees are confirmed by
                      the server.
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.grandTotalValue
                    }
                  >
                    {formatCurrency(
                      customSubtotal
                    )}
                  </Text>
                </View>
              </View>
            </Section>
          )}

          {/* =================================================
              PAYMENT STATUS
          ================================================= */}

          {createdCheckout &&
            paymentMethod ===
              "paymongo" && (
            <View
              style={
                styles.paymentStatusCard
              }
            >
              <View
                style={
                  styles.paymentStatusHeader
                }
              >
                <Ionicons
                  name={
                    createdCheckout
                      .paymentStatus ===
                    "paid"
                      ? "checkmark-circle"
                      : "time-outline"
                  }
                  size={23}
                  color={
                    createdCheckout
                      .paymentStatus ===
                    "paid"
                      ? COLORS.success
                      : COLORS.warning
                  }
                />

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      styles.paymentStatusTitle
                    }
                  >
                    {createdCheckout
                      .paymentStatus ===
                    "paid"
                      ? "Payment verified"
                      : "Payment status"}
                  </Text>

                  <Text
                    style={
                      styles.paymentStatusText
                    }
                  >
                    {createdCheckout
                      .paymentStatus ??
                      "pending"}
                  </Text>
                </View>
              </View>

              {createdCheckout
                .paymentStatus !==
                "paid" && (
                <Pressable
                  onPress={() => {
                    void handleCheckPaymentAgain();
                  }}
                  disabled={
                    checkingPayment
                  }
                  style={
                    styles.checkPaymentButton
                  }
                >
                  {checkingPayment ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.primary
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="refresh"
                        size={17}
                        color={
                          COLORS.primary
                        }
                      />

                      <Text
                        style={
                          styles.checkPaymentText
                        }
                      >
                        Check Payment Status
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          )}

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* =================================================
            BOTTOM CHECKOUT BAR
        ================================================= */}

        <View
          style={
            styles.bottomBar
          }
        >
          <View
            style={
              styles.bottomTotalArea
            }
          >
            <Text
              style={
                styles.bottomTotalLabel
              }
            >
              {isCartCheckout
                ? "Final total"
                : "Bouquet subtotal"}
            </Text>

            <Text
              style={
                styles.bottomTotal
              }
            >
              {isCartCheckout
                ? quote
                  ? formatCurrency(
                      quote.totalAmount
                    )
                  : formatCurrency(
                      cartSubtotal
                    )
                : formatCurrency(
                    customSubtotal
                  )}
            </Text>

            {isCartCheckout &&
              !quote && (
              <Text
                style={
                  styles.bottomEstimate
                }
              >
                Complete details for final
                fees
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => {
              void placeOrder();
            }}
            disabled={
              submitting ||
              checkingPayment
            }
            style={({ pressed }) => [
              styles.placeOrderButton,

              (
                submitting ||
                checkingPayment
              ) &&
                styles.placeOrderButtonDisabled,

              pressed &&
                !submitting &&
                styles.placeOrderButtonPressed,
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
                  {paymentMethod ===
                  "paymongo"
                    ? "Continue to PayMongo"
                    : "Place Order"}
                </Text>

                <Ionicons
                  name={
                    paymentMethod ===
                    "paymongo"
                      ? "card-outline"
                      : "arrow-forward"
                  }
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
 * SECTION
 * ======================================================= */

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  subtitle?: string;

  children:
    React.ReactNode;
}) {
  return (
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
            name={icon}
            size={19}
            color={
              COLORS.primary
            }
          />
        </View>

        <View
          style={
            styles.sectionHeadingText
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {children}
    </View>
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
        styles.field
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
 * CHOICE CARD
 * ======================================================= */

function ChoiceCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  subtitle: string;

  selected: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={[
        styles.choiceCard,

        selected &&
          styles.choiceCardActive,
      ]}
    >
      <View
        style={[
          styles.choiceIcon,

          selected &&
            styles.choiceIconActive,
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={22}
          color={
            selected
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
        {title}
      </Text>

      <Text
        style={
          styles.choiceSubtitle
        }
      >
        {subtitle}
      </Text>

      {selected && (
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
  );
}

/* =========================================================
 * PAYMENT CHOICE
 * ======================================================= */

function PaymentChoice({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  subtitle: string;

  selected: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={[
        styles.paymentChoice,

        selected &&
          styles.paymentChoiceActive,
      ]}
    >
      <View
        style={[
          styles.paymentIcon,

          selected &&
            styles.paymentIconActive,
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={21}
          color={
            selected
              ? "#FFFFFF"
              : COLORS.primary
          }
        />
      </View>

      <View
        style={
          styles.paymentMain
        }
      >
        <Text
          style={
            styles.paymentTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.paymentSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.radioOuter,

          selected &&
            styles.radioOuterActive,
        ]}
      >
        {selected && (
          <View
            style={
              styles.radioInner
            }
          />
        )}
      </View>
    </Pressable>
  );
}

/* =========================================================
 * SUMMARY ROW
 * ======================================================= */

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;

  value?:
    | number
    | null;

  strong?: boolean;
}) {
  return (
    <View
      style={
        styles.summaryRow
      }
    >
      <Text
        style={[
          styles.summaryLabel,

          strong &&
            styles.summaryStrong,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValue,

          strong &&
            styles.summaryStrong,
        ]}
      >
        {formatCurrency(
          value
        )}
      </Text>
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
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        16,

      paddingTop:
        14,

      paddingBottom:
        150,
    },

    /* =====================================================
     * HEADER
     * =================================================== */

    header: {
      minHeight: 68,

      paddingHorizontal:
        16,

      flexDirection:
        "row",

      alignItems:
        "center",

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    backButton: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.graySoft,
    },

    headerCenter: {
      flex: 1,

      alignItems:
        "center",
    },

    headerEyebrow: {
      fontSize: 10,

      fontWeight:
        "800",

      letterSpacing:
        1.6,

      color:
        COLORS.primary,
    },

    headerTitle: {
      marginTop: 2,

      fontSize: 20,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    headerIcon: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    /* =====================================================
     * SECTION
     * =================================================== */

    section: {
      marginBottom:
        14,

      padding:
        16,

      borderRadius:
        18,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,

      shadowColor:
        "#000000",

      shadowOpacity:
        0.025,

      shadowRadius:
        8,

      shadowOffset: {
        width: 0,

        height: 3,
      },

      elevation: 1,
    },

    sectionHeading: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      marginBottom:
        16,
    },

    sectionIcon: {
      width: 38,

      height: 38,

      marginRight: 11,

      borderRadius:
        12,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    sectionHeadingText: {
      flex: 1,
    },

    sectionTitle: {
      fontSize: 17,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    sectionSubtitle: {
      marginTop: 4,

      fontSize: 12.5,

      lineHeight: 18,

      color:
        COLORS.textMuted,
    },

    /* =====================================================
     * PRODUCTS
     * =================================================== */

    cartProductCard: {
      padding:
        12,

      borderRadius:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,

      flexDirection:
        "row",

      flexWrap:
        "wrap",
    },

    cartProductCardSpacing: {
      marginBottom:
        10,
    },

    customProductCard: {
      padding:
        12,

      borderRadius:
        15,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,

      flexDirection:
        "row",
    },

    productImage: {
      width: 76,

      height: 76,

      borderRadius:
        13,

      backgroundColor:
        COLORS.graySoft,
    },

    productImagePlaceholder: {
      width: 76,

      height: 76,

      borderRadius:
        13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    productMain: {
      flex: 1,

      minWidth: 140,

      paddingLeft:
        12,

      justifyContent:
        "center",
    },

    productName: {
      fontSize: 15,

      lineHeight: 20,

      fontWeight:
        "800",

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
      flexShrink: 1,

      fontSize: 11.5,

      color:
        COLORS.textMuted,
    },

    productPrice: {
      marginTop: 7,

      fontSize: 15,

      fontWeight:
        "800",

      color:
        COLORS.primary,
    },

    quantityText: {
      marginTop: 2,

      fontSize: 11.5,

      color:
        COLORS.textMuted,
    },

    lineTotalBox: {
      width: "100%",

      marginTop: 10,

      paddingTop: 10,

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    lineTotalLabel: {
      fontSize: 12,

      color:
        COLORS.textMuted,
    },

    lineTotalValue: {
      fontSize: 14,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    /* =====================================================
     * BADGES
     * =================================================== */

    infoBadge: {
      marginTop: 12,

      padding: 12,

      borderRadius:
        13,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,

      backgroundColor:
        COLORS.blueSoft,
    },

    infoBadgeText: {
      flex: 1,

      fontSize: 11.5,

      lineHeight: 17,

      color:
        COLORS.blue,
    },

    successBadge: {
      marginTop: 12,

      paddingVertical:
        10,

      paddingHorizontal:
        12,

      borderRadius:
        12,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,

      backgroundColor:
        COLORS.successSoft,
    },

    successBadgeText: {
      fontSize: 12,

      fontWeight:
        "700",

      color:
        COLORS.success,
    },

    warningBadge: {
      marginTop: 4,

      padding: 11,

      borderRadius:
        12,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,

      backgroundColor:
        COLORS.warningSoft,
    },

    warningText: {
      flex: 1,

      fontSize: 11.5,

      lineHeight: 17,

      color:
        COLORS.warning,
    },

    /* =====================================================
     * CHOICES
     * =================================================== */

    choiceRow: {
      flexDirection:
        "row",

      gap: 10,
    },

    choiceCard: {
      flex: 1,

      minHeight:
        125,

      padding: 13,

      borderRadius:
        15,

      borderWidth:
        1.5,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,
    },

    choiceCardActive: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primarySoft,
    },

    choiceIcon: {
      width: 40,

      height: 40,

      borderRadius:
        12,

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

      fontSize: 14,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    choiceSubtitle: {
      marginTop: 3,

      paddingRight: 15,

      fontSize: 11,

      lineHeight: 15,

      color:
        COLORS.textMuted,
    },

    choiceCheck: {
      position:
        "absolute",

      top: 10,

      right: 10,
    },

    /* =====================================================
     * FIELDS
     * =================================================== */

    field: {
      marginBottom:
        13,
    },

    fieldLabel: {
      marginBottom: 7,

      fontSize: 12,

      fontWeight:
        "700",

      color:
        COLORS.text,
    },

    input: {
      minHeight: 49,

      paddingHorizontal:
        13,

      paddingVertical:
        11,

      borderRadius:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,

      fontSize: 14,

      color:
        COLORS.text,
    },

    helperText: {
      marginTop: 5,

      marginLeft: 2,

      fontSize: 10.5,

      color:
        COLORS.textMuted,
    },

    notesInput: {
      minHeight: 105,
    },

    twoColumnRow: {
      flexDirection:
        "row",

      gap: 10,
    },

    column: {
      flex: 1,
    },

    locationNotice: {
      marginBottom: 13,

      padding: 11,

      borderRadius:
        12,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,

      backgroundColor:
        COLORS.blueSoft,
    },

    locationNoticeText: {
      flex: 1,

      fontSize: 11,

      lineHeight: 16,

      color:
        COLORS.blue,
    },


    deliveryMapCard: {
      height: 285,

      marginBottom: 12,

      borderRadius: 16,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      overflow: "hidden",

      backgroundColor:
        COLORS.graySoft,
    },

    deliveryMap: {
      ...StyleSheet.absoluteFill,
    },

    mapHintOverlay: {
      ...StyleSheet.absoluteFill,

      alignItems: "center",

      justifyContent: "center",
    },

    mapHintBubble: {
      maxWidth: 245,

      paddingVertical: 10,

      paddingHorizontal: 13,

      borderRadius: 14,

      flexDirection: "row",

      alignItems: "center",

      gap: 7,

      backgroundColor:
        "rgba(255,255,255,0.94)",

      shadowColor: "#000000",

      shadowOpacity: 0.12,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 4,
    },

    mapHintText: {
      flexShrink: 1,

      fontSize: 11.5,

      lineHeight: 16,

      fontWeight: "700",

      color:
        COLORS.text,
    },

    currentLocationButton: {
      minHeight: 48,

      marginBottom: 12,

      paddingHorizontal: 14,

      borderRadius: 13,

      borderWidth: 1,

      borderColor:
        COLORS.primary,

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "center",

      gap: 8,

      backgroundColor:
        COLORS.primarySoft,
    },

    currentLocationButtonPressed: {
      opacity: 0.82,
    },

    currentLocationButtonDisabled: {
      opacity: 0.6,
    },

    currentLocationButtonText: {
      fontSize: 12.5,

      fontWeight: "800",

      color:
        COLORS.primary,
    },

    selectedLocationCard: {
      marginBottom: 12,

      padding: 12,

      borderRadius: 13,

      flexDirection: "row",

      alignItems: "flex-start",

      gap: 9,

      backgroundColor:
        COLORS.successSoft,
    },

    selectedLocationTextArea: {
      flex: 1,
    },

    selectedLocationTitle: {
      fontSize: 12.5,

      fontWeight: "800",

      color:
        COLORS.success,
    },

    selectedLocationText: {
      marginTop: 2,

      fontSize: 10.5,

      lineHeight: 15,

      color:
        COLORS.success,
    },

    locationErrorCard: {
      marginBottom: 12,

      padding: 11,

      borderRadius: 12,

      flexDirection: "row",

      alignItems: "flex-start",

      gap: 8,

      backgroundColor:
        COLORS.dangerSoft,
    },

    locationErrorText: {
      flex: 1,

      fontSize: 11,

      lineHeight: 16,

      color:
        COLORS.danger,
    },

    /* =====================================================
     * SCHEDULE SWITCH
     * =================================================== */

    toggleRow: {
      padding:
        13,

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    toggleTextArea: {
      flex: 1,

      paddingRight:
        12,
    },

    toggleTitle: {
      fontSize: 13,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    toggleSubtitle: {
      marginTop: 3,

      fontSize: 11,

      lineHeight: 15,

      color:
        COLORS.textMuted,
    },

    switchTrack: {
      width: 46,

      height: 27,

      padding: 3,

      borderRadius:
        15,

      justifyContent:
        "center",

      backgroundColor:
        "#D8D2D5",
    },

    switchTrackActive: {
      backgroundColor:
        COLORS.primary,
    },

    switchThumb: {
      width: 21,

      height: 21,

      borderRadius:
        11,

      backgroundColor:
        "#FFFFFF",

      transform: [
        {
          translateX: 0,
        },
      ],
    },

    switchThumbActive: {
      transform: [
        {
          translateX: 19,
        },
      ],
    },

    scheduleFields: {
      marginTop: 14,
    },

    /* =====================================================
     * PAYMENT
     * =================================================== */

    paymentChoice: {
      minHeight:
        76,

      marginBottom:
        10,

      padding: 12,

      borderRadius:
        14,

      borderWidth:
        1.5,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    paymentChoiceActive: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primarySoft,
    },

    paymentIcon: {
      width: 42,

      height: 42,

      marginRight:
        11,

      borderRadius:
        13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    paymentIconActive: {
      backgroundColor:
        COLORS.primary,
    },

    paymentMain: {
      flex: 1,

      paddingRight:
        8,
    },

    paymentTitle: {
      fontSize: 13,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    paymentSubtitle: {
      marginTop: 3,

      fontSize: 10.5,

      lineHeight: 15,

      color:
        COLORS.textMuted,
    },

    radioOuter: {
      width: 20,

      height: 20,

      borderRadius:
        10,

      borderWidth:
        2,

      borderColor:
        "#C7BEC3",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    radioOuterActive: {
      borderColor:
        COLORS.primary,
    },

    radioInner: {
      width: 10,

      height: 10,

      borderRadius: 5,

      backgroundColor:
        COLORS.primary,
    },

    /* =====================================================
     * QUOTE
     * =================================================== */

    quoteLoading: {
      minHeight:
        80,

      borderRadius:
        14,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 10,

      backgroundColor:
        COLORS.primarySoft,
    },

    quoteLoadingText: {
      maxWidth:
        "75%",

      fontSize: 12,

      color:
        COLORS.primary,
    },

    pendingQuote: {
      minHeight:
        76,

      padding: 13,

      borderRadius:
        14,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 9,

      backgroundColor:
        COLORS.graySoft,
    },

    pendingQuoteText: {
      flex: 1,

      fontSize: 11.5,

      lineHeight: 17,

      color:
        COLORS.textMuted,
    },

    pendingQuoteError: {
      color:
        COLORS.danger,
    },

    calculateButton: {
      minHeight:
        45,

      marginTop: 10,

      paddingHorizontal:
        15,

      borderRadius:
        12,

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

    calculateButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    shopBreakdownContainer: {
      marginBottom:
        11,
    },

    shopCard: {
      marginBottom:
        9,

      padding: 13,

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.background,
    },

    shopHeader: {
      marginBottom:
        11,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    shopIcon: {
      width: 34,

      height: 34,

      marginRight:
        9,

      borderRadius:
        10,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    shopHeaderText: {
      flex: 1,
    },

    shopName: {
      fontSize: 13,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    shopMeta: {
      marginTop: 2,

      fontSize: 10.5,

      color:
        COLORS.textMuted,
    },

    shopTotalDivider: {
      height: 1,

      marginVertical: 8,

      backgroundColor:
        COLORS.border,
    },

    totalCard: {
      padding: 14,

      borderRadius:
        15,

      backgroundColor:
        COLORS.graySoft,
    },

    summaryRow: {
      minHeight:
        27,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    summaryLabel: {
      fontSize: 12,

      color:
        COLORS.textMuted,
    },

    summaryValue: {
      fontSize: 12,

      fontWeight:
        "700",

      color:
        COLORS.text,
    },

    summaryStrong: {
      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    totalDivider: {
      height: 1,

      marginVertical:
        10,

      backgroundColor:
        COLORS.border,
    },

    grandTotalRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      gap: 15,
    },

    grandTotalLabel: {
      fontSize: 15,

      fontWeight:
        "900",

      color:
        COLORS.text,
    },

    grandTotalCaption: {
      maxWidth: 180,

      marginTop: 3,

      fontSize: 10,

      lineHeight: 14,

      color:
        COLORS.textMuted,
    },

    grandTotalValue: {
      fontSize: 21,

      fontWeight:
        "900",

      color:
        COLORS.primary,
    },

    /* =====================================================
     * PAYMENT STATUS
     * =================================================== */

    paymentStatusCard: {
      marginBottom:
        14,

      padding: 15,

      borderRadius:
        17,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    paymentStatusHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,
    },

    paymentStatusTitle: {
      fontSize: 13,

      fontWeight:
        "800",

      color:
        COLORS.text,
    },

    paymentStatusText: {
      marginTop: 2,

      fontSize: 11.5,

      textTransform:
        "capitalize",

      color:
        COLORS.textMuted,
    },

    checkPaymentButton: {
      minHeight:
        43,

      marginTop: 12,

      borderRadius:
        12,

      borderWidth:
        1,

      borderColor:
        COLORS.primary,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,

      backgroundColor:
        COLORS.primarySoft,
    },

    checkPaymentText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        COLORS.primary,
    },

    /* =====================================================
     * BOTTOM BAR
     * =================================================== */

    bottomSpacer: {
      height: 20,
    },

    bottomBar: {
      minHeight: 86,

      paddingHorizontal:
        16,

      paddingTop:
        11,

      paddingBottom:
        Platform.OS ===
        "ios"
          ? 14
          : 11,

      borderTopWidth:
        1,

      borderTopColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 12,

      shadowColor:
        "#000000",

      shadowOpacity:
        0.05,

      shadowRadius:
        12,

      shadowOffset: {
        width: 0,

        height: -3,
      },

      elevation: 8,
    },

    bottomTotalArea: {
      flex: 1,
    },

    bottomTotalLabel: {
      fontSize: 10.5,

      color:
        COLORS.textMuted,
    },

    bottomTotal: {
      marginTop: 1,

      fontSize: 19,

      fontWeight:
        "900",

      color:
        COLORS.primary,
    },

    bottomEstimate: {
      marginTop: 2,

      fontSize: 9.5,

      color:
        COLORS.warning,
    },

    placeOrderButton: {
      minWidth:
        180,

      minHeight:
        52,

      paddingHorizontal:
        17,

      borderRadius:
        15,

      backgroundColor:
        COLORS.primary,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },

    placeOrderButtonDisabled: {
      opacity: 0.55,
    },

    placeOrderButtonPressed: {
      backgroundColor:
        COLORS.primaryDark,

      transform: [
        {
          scale: 0.985,
        },
      ],
    },

    placeOrderButtonText: {
      fontSize: 13,

      fontWeight:
        "900",

      color:
        "#FFFFFF",
    },

    /* =====================================================
     * STATE
     * =================================================== */

    centerState: {
      flex: 1,

      paddingHorizontal:
        30,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    stateIcon: {
      width: 62,

      height: 62,

      marginBottom:
        18,

      borderRadius:
        20,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    stateTitle: {
      marginBottom: 7,

      fontSize: 19,

      fontWeight:
        "900",

      textAlign:
        "center",

      color:
        COLORS.text,
    },

    stateText: {
      marginTop: 10,

      maxWidth: 320,

      fontSize: 13,

      lineHeight: 19,

      textAlign:
        "center",

      color:
        COLORS.textMuted,
    },

    retryButton: {
      minHeight:
        45,

      marginTop: 20,

      paddingHorizontal:
        22,

      borderRadius:
        13,

      backgroundColor:
        COLORS.primary,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,
    },

    retryButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    backStateButton: {
      marginTop: 13,

      padding:
        8,
    },

    backStateText: {
      fontSize: 12,

      fontWeight:
        "700",

      color:
        COLORS.primary,
    },
  });