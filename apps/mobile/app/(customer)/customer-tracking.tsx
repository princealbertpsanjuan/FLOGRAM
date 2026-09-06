import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MapView, {
  Marker,
  type LatLng,
} from "react-native-maps";

import {
  getCustomerDeliveries,
  getDeliveryTracking,
  type Delivery,
  type DeliveryFlorist,
  type DeliveryOrder,
  type DeliveryRider,
  type DeliveryRiderOwner,
  type DeliveryStatus,
} from "../../services/delivery";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type TimelineStep = {
  key:
    | "confirmed"
    | "preparing"
    | "ready"
    | "accepted"
    | "picked_up"
    | "out_for_delivery"
    | "delivered";

  title: string;

  description: string;

  icon:
    | "checkmark-circle-outline"
    | "flower-outline"
    | "cube-outline"
    | "person-outline"
    | "bag-check-outline"
    | "bicycle-outline"
    | "home-outline";
};

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const TRACKING_REFRESH_MS =
  8000;

const ACTIVE_TRACKING_STATUSES:
  DeliveryStatus[] = [
    "available",
    "accepted",
    "picked_up",
    "out_for_delivery",
  ];

/*
 * =========================================================
 * GENERAL HELPERS
 * =========================================================
 */

const shortId = (
  value?: string | null
) => {
  if (!value) {
    return "--------";
  }

  return value
    .slice(-8)
    .toUpperCase();
};

const formatStatus = (
  value?: string | null
) => {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleString(
    "en-PH",
    {
      month: "short",

      day: "numeric",

      year: "numeric",

      hour: "numeric",

      minute: "2-digit",
    }
  );
};

const formatTime = (
  value?: string | null
) => {
  if (!value) {
    return "--";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }

  return date.toLocaleTimeString(
    "en-PH",
    {
      hour: "numeric",

      minute: "2-digit",
    }
  );
};

const formatDistance = (
  meters?:
    | number
    | null
) => {
  if (
    meters === null ||
    meters === undefined ||
    !Number.isFinite(
      meters
    )
  ) {
    return "--";
  }

  if (meters < 1000) {
    return `${Math.round(
      meters
    )} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} km`;
};

const formatDuration = (
  seconds?:
    | number
    | null
) => {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(
      seconds
    )
  ) {
    return "--";
  }

  const minutes =
    Math.max(
      1,
      Math.round(
        seconds / 60
      )
    );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remainingMinutes =
    minutes % 60;

  if (
    remainingMinutes ===
    0
  ) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
};

/*
 * =========================================================
 * ADDRESS
 * =========================================================
 */

const formatAddress = (
  address?: {
    street?: string;

    barangay?: string;

    city?: string;

    province?: string;

    postalCode?: string;

    landmark?: string;
  } | null
) => {
  if (!address) {
    return "Address unavailable";
  }

  const mainAddress = [
    address.street,

    address.barangay,

    address.city,

    address.province,

    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    mainAddress ||
    "Address unavailable"
  );
};

/*
 * =========================================================
 * ORDER
 * =========================================================
 */

const getOrder = (
  delivery:
    Delivery | null
): DeliveryOrder | null => {
  if (
    !delivery?.order ||
    typeof delivery.order ===
      "string"
  ) {
    return null;
  }

  return delivery.order;
};

/*
 * =========================================================
 * FLORIST
 * =========================================================
 */

const getFlorist = (
  delivery:
    Delivery | null
): DeliveryFlorist | null => {
  if (
    !delivery?.florist ||
    typeof delivery.florist ===
      "string"
  ) {
    return null;
  }

  return delivery.florist;
};

/*
 * =========================================================
 * RIDER
 * =========================================================
 */

const getRider = (
  delivery:
    Delivery | null
): DeliveryRider | null => {
  if (
    !delivery?.rider ||
    typeof delivery.rider ===
      "string"
  ) {
    return null;
  }

  return delivery.rider;
};

const getRiderOwner = (
  delivery:
    Delivery | null
): DeliveryRiderOwner | null => {
  const rider =
    getRider(
      delivery
    );

  if (
    !rider?.owner ||
    typeof rider.owner ===
      "string"
  ) {
    return null;
  }

  return rider.owner;
};

const getRiderName = (
  delivery:
    Delivery | null
) => {
  const owner =
    getRiderOwner(
      delivery
    );

  if (!owner) {
    return "Waiting for rider";
  }

  const fullName = [
    owner.firstName,

    owner.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    "FLOGRAM Rider"
  );
};

/*
 * =========================================================
 * STATUS DISPLAY
 * =========================================================
 */

const getDeliveryStatusDisplay =
  (
    status:
      DeliveryStatus
  ) => {
    switch (status) {
      case "available":
        return {
          title:
            "Finding a Rider",

          description:
            "Your florist has requested delivery. We're waiting for an available rider to accept it.",

          icon:
            "search-outline" as const,

          backgroundColor:
            "#FFF5E6",

          textColor:
            "#A66D12",
        };

      case "accepted":
        return {
          title:
            "Rider Assigned",

          description:
            "A rider has accepted your delivery and is heading to the florist.",

          icon:
            "person-circle-outline" as const,

          backgroundColor:
            "#F3EDFC",

          textColor:
            "#7952A8",
        };

      case "picked_up":
        return {
          title:
            "Bouquet Picked Up",

          description:
            "Your bouquet has been collected from the florist.",

          icon:
            "bag-check-outline" as const,

          backgroundColor:
            "#EEF4FF",

          textColor:
            "#4973A8",
        };

      case "out_for_delivery":
        return {
          title:
            "Out for Delivery",

          description:
            "Your rider is currently travelling to the delivery destination.",

          icon:
            "bicycle-outline" as const,

          backgroundColor:
            "#FDEEF3",

          textColor:
            "#C34F70",
        };

      case "delivered":
        return {
          title:
            "Delivered",

          description:
            "The rider has marked your bouquet as successfully delivered.",

          icon:
            "checkmark-circle-outline" as const,

          backgroundColor:
            "#EAF7ED",

          textColor:
            "#3F8650",
        };

      case "cancelled":
        return {
          title:
            "Delivery Cancelled",

          description:
            "This delivery request is no longer active.",

          icon:
            "close-circle-outline" as const,

          backgroundColor:
            "#FDEBEC",

          textColor:
            "#B64E59",
        };

      default:
        return {
          title:
            formatStatus(
              status
            ),

          description:
            "Delivery status updated.",

          icon:
            "information-circle-outline" as const,

          backgroundColor:
            "#F4F0EF",

          textColor:
            "#6F6765",
        };
    }
  };

/*
 * =========================================================
 * TIMELINE
 * =========================================================
 */

const TIMELINE_STEPS:
  TimelineStep[] = [
    {
      key:
        "confirmed",

      title:
        "Order Confirmed",

      description:
        "The florist received your order.",

      icon:
        "checkmark-circle-outline",
    },

    {
      key:
        "preparing",

      title:
        "Preparing Bouquet",

      description:
        "The florist is preparing your flowers.",

      icon:
        "flower-outline",
    },

    {
      key:
        "ready",

      title:
        "Ready for Delivery",

      description:
        "Your bouquet is ready for rider pickup.",

      icon:
        "cube-outline",
    },

    {
      key:
        "accepted",

      title:
        "Rider Assigned",

      description:
        "A rider accepted your delivery request.",

      icon:
        "person-outline",
    },

    {
      key:
        "picked_up",

      title:
        "Bouquet Picked Up",

      description:
        "The rider collected your bouquet.",

      icon:
        "bag-check-outline",
    },

    {
      key:
        "out_for_delivery",

      title:
        "Out for Delivery",

      description:
        "The rider is heading to the recipient.",

      icon:
        "bicycle-outline",
    },

    {
      key:
        "delivered",

      title:
        "Delivered",

      description:
        "The bouquet reached its destination.",

      icon:
        "home-outline",
    },
  ];

const getTimelineProgress = (
  delivery:
    Delivery
) => {
  switch (
    delivery.status
  ) {
    case "available":
      return 2;

    case "accepted":
      return 3;

    case "picked_up":
      return 4;

    case "out_for_delivery":
      return 5;

    case "delivered":
      return 6;

    case "cancelled":
      return -1;

    default:
      return 2;
  }
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerTrackingScreen() {
  const params =
    useLocalSearchParams<{
      deliveryId?:
        string;

      orderId?:
        string;
    }>();

  const requestedDeliveryId =
    typeof params.deliveryId ===
    "string"
      ? params.deliveryId
      : "";

  const requestedOrderId =
    typeof params.orderId ===
    "string"
      ? params.orderId
      : "";

  /*
   * =======================================================
   * STATE
   * =======================================================
   */

  const [
    deliveryId,
    setDeliveryId,
  ] = useState(
    requestedDeliveryId
  );

  const [
    delivery,
    setDelivery,
  ] =
    useState<Delivery | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null
    );

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] =
    useState<Date | null>(
      null
    );

  /*
   * =======================================================
   * MAP
   * =======================================================
   */

  const mapRef =
    useRef<MapView | null>(
      null
    );

  /*
   * =======================================================
   * RESOLVE DELIVERY ID FROM ORDER ID
   * =======================================================
   */

  const resolveDeliveryId =
    useCallback(
      async () => {
        if (
          requestedDeliveryId
        ) {
          setDeliveryId(
            requestedDeliveryId
          );

          return requestedDeliveryId;
        }

        if (
          !requestedOrderId
        ) {
          return "";
        }

        const response =
          await getCustomerDeliveries();

        const deliveries =
          Array.isArray(
            response.deliveries
          )
            ? response.deliveries
            : [];

        const matchingDelivery =
          deliveries.find(
            (
              currentDelivery
            ) => {
              if (
                typeof currentDelivery.order ===
                "string"
              ) {
                return (
                  currentDelivery.order ===
                  requestedOrderId
                );
              }

              return (
                currentDelivery
                  .order?._id ===
                requestedOrderId
              );
            }
          );

        if (
          !matchingDelivery
        ) {
          return "";
        }

        setDeliveryId(
          matchingDelivery._id
        );

        return matchingDelivery._id;
      },
      [
        requestedDeliveryId,
        requestedOrderId,
      ]
    );

  /*
   * =======================================================
   * LOAD TRACKING
   * =======================================================
   */

  const loadTracking =
    useCallback(
      async (
        targetDeliveryId?:
          string
      ) => {
        try {
          setErrorMessage(
            null
          );

          let activeDeliveryId =
            targetDeliveryId ||
            deliveryId;

          if (
            !activeDeliveryId
          ) {
            activeDeliveryId =
              await resolveDeliveryId();
          }

          if (
            !activeDeliveryId
          ) {
            throw new Error(
              "No delivery is available for this order yet."
            );
          }

          const tracking =
            await getDeliveryTracking(
              activeDeliveryId
            );

          setDelivery(
            tracking
          );

          setDeliveryId(
            tracking._id
          );

          setLastUpdatedAt(
            new Date()
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to load customer delivery tracking:",
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load delivery tracking."
          );
        }
      },
      [
        deliveryId,
        resolveDeliveryId,
      ]
    );

  /*
   * =======================================================
   * INITIAL LOAD
   * =======================================================
   */

  useEffect(() => {
    let mounted =
      true;

    const initialize =
      async () => {
        try {
          if (mounted) {
            setLoading(
              true
            );
          }

          const resolvedId =
            await resolveDeliveryId();

          if (
            !mounted
          ) {
            return;
          }

          if (
            !resolvedId
          ) {
            setErrorMessage(
              "No delivery request exists for this order yet."
            );

            return;
          }

          await loadTracking(
            resolvedId
          );
        } catch (
          error
        ) {
          if (
            !mounted
          ) {
            return;
          }

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to initialize tracking."
          );
        } finally {
          if (mounted) {
            setLoading(
              false
            );
          }
        }
      };

    void initialize();

    return () => {
      mounted =
        false;
    };
  }, [
    loadTracking,
    resolveDeliveryId,
  ]);

  /*
   * =======================================================
   * LIVE POLLING
   * =======================================================
   */

  useEffect(() => {
    if (
      !deliveryId ||
      !delivery
    ) {
      return;
    }

    const shouldPoll =
      ACTIVE_TRACKING_STATUSES.includes(
        delivery.status
      );

    if (!shouldPoll) {
      return;
    }

    const interval =
      setInterval(() => {
        void loadTracking(
          deliveryId
        );
      }, TRACKING_REFRESH_MS);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    delivery,
    deliveryId,
    loadTracking,
  ]);

  /*
   * =======================================================
   * REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await loadTracking();
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [loadTracking]
    );

  /*
   * =======================================================
   * DERIVED DATA
   * =======================================================
   */

  const order =
    useMemo(
      () =>
        getOrder(
          delivery
        ),
      [delivery]
    );

  const florist =
    useMemo(
      () =>
        getFlorist(
          delivery
        ),
      [delivery]
    );

  const riderOwner =
    useMemo(
      () =>
        getRiderOwner(
          delivery
        ),
      [delivery]
    );

  const riderName =
    useMemo(
      () =>
        getRiderName(
          delivery
        ),
      [delivery]
    );

  const riderPhone =
    riderOwner
      ?.phoneNumber ||
    "";

  const riderCoordinate =
    useMemo<LatLng | null>(
      () => {
        const latitude =
          delivery
            ?.riderLocation
            ?.latitude;

        const longitude =
          delivery
            ?.riderLocation
            ?.longitude;

        if (
          typeof latitude !==
            "number" ||
          typeof longitude !==
            "number"
        ) {
          return null;
        }

        return {
          latitude,

          longitude,
        };
      },
      [
        delivery
          ?.riderLocation
          ?.latitude,

        delivery
          ?.riderLocation
          ?.longitude,
      ]
    );

  const pickupCoordinate =
    useMemo<LatLng | null>(
      () => {
        const latitude =
          delivery
            ?.pickupLocation
            ?.latitude;

        const longitude =
          delivery
            ?.pickupLocation
            ?.longitude;

        if (
          typeof latitude !==
            "number" ||
          typeof longitude !==
            "number"
        ) {
          return null;
        }

        return {
          latitude,

          longitude,
        };
      },
      [
        delivery
          ?.pickupLocation
          ?.latitude,

        delivery
          ?.pickupLocation
          ?.longitude,
      ]
    );

  const deliveryCoordinate =
    useMemo<LatLng | null>(
      () => {
        const latitude =
          delivery
            ?.deliveryLocation
            ?.latitude;

        const longitude =
          delivery
            ?.deliveryLocation
            ?.longitude;

        if (
          typeof latitude !==
            "number" ||
          typeof longitude !==
            "number"
        ) {
          return null;
        }

        return {
          latitude,

          longitude,
        };
      },
      [
        delivery
          ?.deliveryLocation
          ?.latitude,

        delivery
          ?.deliveryLocation
          ?.longitude,
      ]
    );

  /*
   * =======================================================
   * MAP INITIAL COORDINATE
   * =======================================================
   */

  const initialMapCoordinate =
    useMemo<
      LatLng | null
    >(() => {
      if (
        riderCoordinate
      ) {
        return riderCoordinate;
      }

      if (
        deliveryCoordinate
      ) {
        return deliveryCoordinate;
      }

      if (
        pickupCoordinate
      ) {
        return pickupCoordinate;
      }

      return null;
    }, [
      deliveryCoordinate,
      pickupCoordinate,
      riderCoordinate,
    ]);

  /*
   * =======================================================
   * FIT MAP
   * =======================================================
   */

  const fitMap =
    useCallback(() => {
      if (
        !mapRef.current
      ) {
        return;
      }

      const coordinates:
        LatLng[] = [];

      if (
        riderCoordinate
      ) {
        coordinates.push(
          riderCoordinate
        );
      }

      if (
        pickupCoordinate
      ) {
        coordinates.push(
          pickupCoordinate
        );
      }

      if (
        deliveryCoordinate
      ) {
        coordinates.push(
          deliveryCoordinate
        );
      }

      if (
        coordinates.length >=
        2
      ) {
        mapRef.current.fitToCoordinates(
          coordinates,
          {
            edgePadding: {
              top: 70,

              right: 55,

              bottom: 70,

              left: 55,
            },

            animated:
              true,
          }
        );

        return;
      }

      if (
        coordinates.length ===
        1
      ) {
        mapRef.current.animateToRegion(
          {
            latitude:
              coordinates[0]
                .latitude,

            longitude:
              coordinates[0]
                .longitude,

            latitudeDelta:
              0.014,

            longitudeDelta:
              0.014,
          },

          500
        );
      }
    }, [
      deliveryCoordinate,
      pickupCoordinate,
      riderCoordinate,
    ]);

  useEffect(() => {
    if (
      !initialMapCoordinate
    ) {
      return;
    }

    const timeout =
      setTimeout(() => {
        fitMap();
      }, 350);

    return () => {
      clearTimeout(
        timeout
      );
    };
  }, [
    fitMap,
    initialMapCoordinate,
  ]);

  /*
   * =======================================================
   * STATUS
   * =======================================================
   */

  const statusDisplay =
    delivery
      ? getDeliveryStatusDisplay(
          delivery.status
        )
      : null;

  const timelineProgress =
    delivery
      ? getTimelineProgress(
          delivery
        )
      : -1;

  /*
   * =======================================================
   * RIDER CONTACT
   * =======================================================
   */

  const callRider =
    useCallback(
      async () => {
        if (
          !riderPhone
        ) {
          return;
        }

        const cleanPhone =
          riderPhone.replace(
            /[^\d+]/g,
            ""
          );

        try {
          await Linking.openURL(
            `tel:${cleanPhone}`
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to open phone dialer:",
            error
          );
        }
      },
      [riderPhone]
    );

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingIcon
            }
          >
            <Ionicons
              name="bicycle-outline"
              size={34}
              color="#D85D7A"
            />
          </View>

          <ActivityIndicator
            size="large"
            color="#D85D7A"
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading Delivery
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Getting the latest
            tracking information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * ERROR / NO DELIVERY
   * =======================================================
   */

  if (
    !delivery
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View
          style={
            styles.screen
          }
        >
          <View
            style={
              styles.header
            }
          >
            <Pressable
              style={
                styles.headerButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color="#35302F"
              />
            </Pressable>

            <Text
              style={
                styles.headerTitle
              }
            >
              Track Delivery
            </Text>

            <View
              style={
                styles.headerButton
              }
            />
          </View>

          <View
            style={
              styles.noDeliveryContainer
            }
          >
            <View
              style={
                styles.noDeliveryIcon
              }
            >
              <Ionicons
                name="bicycle-outline"
                size={52}
                color="#D85D7A"
              />
            </View>

            <Text
              style={
                styles.noDeliveryTitle
              }
            >
              Tracking Not
              Available Yet
            </Text>

            <Text
              style={
                styles.noDeliveryDescription
              }
            >
              {errorMessage ||
                "The florist has not created a delivery request for this order yet."}
            </Text>

            <Pressable
              style={
                styles.retryButton
              }
              onPress={() =>
                void loadTracking()
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
                Check Again
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.backOrdersButton
              }
              onPress={() =>
                router.replace(
                  "/(customer)/customer-orders" as never
                )
              }
            >
              <Text
                style={
                  styles.backOrdersText
                }
              >
                Back to My Orders
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * MAIN SCREEN
   * =======================================================
   */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <View
        style={
          styles.screen
        }
      >
        {/*
         * =====================================================
         * HEADER
         * =====================================================
         */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color="#35302F"
            />
          </Pressable>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Track Delivery
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              #
              {shortId(
                delivery._id
              )}
            </Text>
          </View>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              void loadTracking()
            }
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color="#6E6664"
            />
          </Pressable>
        </View>

        {/*
         * =====================================================
         * CONTENT
         * =====================================================
         */}

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
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              colors={[
                "#D85D7A",
              ]}
              tintColor="#D85D7A"
            />
          }
        >
          {/*
           * ===================================================
           * LIVE STATUS
           * ===================================================
           */}

          {statusDisplay ? (
            <View
              style={[
                styles.statusCard,

                {
                  backgroundColor:
                    statusDisplay.backgroundColor,
                },
              ]}
            >
              <View
                style={
                  styles.statusIconCircle
                }
              >
                <Ionicons
                  name={
                    statusDisplay.icon
                  }
                  size={25}
                  color={
                    statusDisplay.textColor
                  }
                />
              </View>

              <View
                style={
                  styles.statusContent
                }
              >
                <View
                  style={
                    styles.statusTitleRow
                  }
                >
                  <Text
                    style={[
                      styles.statusTitle,

                      {
                        color:
                          statusDisplay.textColor,
                      },
                    ]}
                  >
                    {
                      statusDisplay.title
                    }
                  </Text>

                  {ACTIVE_TRACKING_STATUSES.includes(
                    delivery.status
                  ) ? (
                    <View
                      style={
                        styles.liveBadge
                      }
                    >
                      <View
                        style={
                          styles.liveDot
                        }
                      />

                      <Text
                        style={
                          styles.liveText
                        }
                      >
                        LIVE
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={
                    styles.statusDescription
                  }
                >
                  {
                    statusDisplay.description
                  }
                </Text>

                {lastUpdatedAt ? (
                  <Text
                    style={
                      styles.lastUpdatedText
                    }
                  >
                    Updated{" "}
                    {lastUpdatedAt.toLocaleTimeString(
                      "en-PH",
                      {
                        hour:
                          "numeric",

                        minute:
                          "2-digit",

                        second:
                          "2-digit",
                      }
                    )}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/*
           * ===================================================
           * ERROR BANNER
           * ===================================================
           */}

          {errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color="#B55062"
              />

              <Text
                style={
                  styles.errorText
                }
              >
                {
                  errorMessage
                }
              </Text>

              <Pressable
                onPress={() =>
                  void loadTracking()
                }
              >
                <Ionicons
                  name="refresh"
                  size={19}
                  color="#D85D7A"
                />
              </Pressable>
            </View>
          ) : null}

          {/*
           * ===================================================
           * NAVIGATION SUMMARY
           * ===================================================
           */}

          <View
            style={
              styles.navigationCard
            }
          >
            <View
              style={
                styles.sectionHeadingRow
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  DELIVERY STATUS
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Live Tracking
                </Text>
              </View>

              <View
                style={
                  styles.navigationIcon
                }
              >
                <Ionicons
                  name="navigate-outline"
                  size={22}
                  color="#D85D7A"
                />
              </View>
            </View>

            <View
              style={
                styles.navigationStats
              }
            >
              <NavigationStat
                icon="map-outline"
                value={formatDistance(
                  delivery
                    .navigation
                    ?.distanceMeters
                )}
                label="Distance"
              />

              <View
                style={
                  styles.statDivider
                }
              />

              <NavigationStat
                icon="time-outline"
                value={formatDuration(
                  delivery
                    .navigation
                    ?.durationSeconds
                )}
                label="Travel Time"
              />

              <View
                style={
                  styles.statDivider
                }
              />

              <NavigationStat
                icon="flag-outline"
                value={formatTime(
                  delivery
                    .navigation
                    ?.estimatedArrivalAt
                )}
                label="ETA"
              />
            </View>

            {delivery
              .navigation
              ?.updatedAt ? (
              <Text
                style={
                  styles.navigationUpdated
                }
              >
                Route estimate
                updated{" "}
                {formatTime(
                  delivery
                    .navigation
                    .updatedAt
                )}
              </Text>
            ) : null}
          </View>

          {/*
           * ===================================================
           * MAP
           * ===================================================
           */}

          <View
            style={
              styles.mapCard
            }
          >
            <View
              style={
                styles.mapHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  MAP
                </Text>

                <Text
                  style={
                    styles.mapTitle
                  }
                >
                  Delivery Location
                </Text>
              </View>

              {riderCoordinate ? (
                <View
                  style={
                    styles.gpsBadge
                  }
                >
                  <View
                    style={
                      styles.gpsDot
                    }
                  />

                  <Text
                    style={
                      styles.gpsText
                    }
                  >
                    Rider GPS
                  </Text>
                </View>
              ) : null}
            </View>

            {initialMapCoordinate ? (
              <View
                style={
                  styles.mapContainer
                }
              >
                <MapView
                  ref={
                    mapRef
                  }
                  style={
                    styles.map
                  }
                  initialRegion={{
                    latitude:
                      initialMapCoordinate.latitude,

                    longitude:
                      initialMapCoordinate.longitude,

                    latitudeDelta:
                      0.018,

                    longitudeDelta:
                      0.018,
                  }}
                  showsCompass
                  showsMyLocationButton={
                    false
                  }
                  rotateEnabled
                  pitchEnabled
                  zoomEnabled
                  scrollEnabled
                  mapType="standard"
                  onMapReady={() => {
                    setTimeout(
                      () => {
                        fitMap();
                      },
                      350
                    );
                  }}
                >
                  {pickupCoordinate ? (
                    <Marker
                      coordinate={
                        pickupCoordinate
                      }
                      title={
                        florist?.shopName ||
                        "Florist Pickup"
                      }
                      description={formatAddress(
                        delivery.pickupAddress
                      )}
                    >
                      <View
                        style={
                          styles.pickupMarkerOuter
                        }
                      >
                        <View
                          style={
                            styles.pickupMarker
                          }
                        >
                          <Ionicons
                            name="flower-outline"
                            size={17}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    </Marker>
                  ) : null}

                  {deliveryCoordinate ? (
                    <Marker
                      coordinate={
                        deliveryCoordinate
                      }
                      title="Delivery Destination"
                      description={formatAddress(
                        delivery.deliveryAddress
                      )}
                    >
                      <View
                        style={
                          styles.destinationMarkerOuter
                        }
                      >
                        <View
                          style={
                            styles.destinationMarker
                          }
                        >
                          <Ionicons
                            name="location"
                            size={18}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    </Marker>
                  ) : null}

                  {riderCoordinate ? (
                    <Marker
                      coordinate={
                        riderCoordinate
                      }
                      title={
                        riderName
                      }
                      description="FLOGRAM Rider"
                      anchor={{
                        x: 0.5,

                        y: 0.5,
                      }}
                    >
                      <View
                        style={
                          styles.riderMarkerOuter
                        }
                      >
                        <View
                          style={
                            styles.riderMarker
                          }
                        >
                          <Ionicons
                            name="bicycle"
                            size={18}
                            color="#FFFFFF"
                          />
                        </View>
                      </View>
                    </Marker>
                  ) : null}
                </MapView>

                <Pressable
                  style={({ pressed }) => [
                    styles.recenterButton,

                    pressed &&
                      styles.recenterButtonPressed,
                  ]}
                  onPress={
                    fitMap
                  }
                >
                  <Ionicons
                    name="scan-outline"
                    size={18}
                    color="#5E5654"
                  />

                  <Text
                    style={
                      styles.recenterText
                    }
                  >
                    Recenter
                  </Text>
                </Pressable>

                {!riderCoordinate &&
                delivery.status !==
                  "available" &&
                delivery.status !==
                  "delivered" ? (
                  <View
                    style={
                      styles.waitingGpsBadge
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color="#A66D12"
                    />

                    <Text
                      style={
                        styles.waitingGpsText
                      }
                    >
                      Waiting for
                      rider GPS
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                style={
                  styles.noMapContainer
                }
              >
                <Ionicons
                  name="map-outline"
                  size={38}
                  color="#C8BEBC"
                />

                <Text
                  style={
                    styles.noMapTitle
                  }
                >
                  Map Unavailable
                </Text>

                <Text
                  style={
                    styles.noMapText
                  }
                >
                  Delivery coordinates
                  are not available yet.
                </Text>
              </View>
            )}

            <View
              style={
                styles.mapLegend
              }
            >
              <LegendItem
                icon="flower-outline"
                label="Florist"
              />

              <LegendItem
                icon="bicycle-outline"
                label="Rider"
              />

              <LegendItem
                icon="location-outline"
                label="Destination"
              />
            </View>
          </View>

          {/*
           * ===================================================
           * RIDER
           * ===================================================
           */}

          <View
            style={
              styles.card
            }
          >
            <View
              style={
                styles.sectionHeadingRow
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  ASSIGNED RIDER
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Delivery Partner
                </Text>
              </View>

              <View
                style={
                  styles.riderAvatar
                }
              >
                <Ionicons
                  name="person"
                  size={23}
                  color="#D85D7A"
                />
              </View>
            </View>

            {delivery.rider ? (
              <View
                style={
                  styles.riderInfoRow
                }
              >
                <View
                  style={
                    styles.riderInfo
                  }
                >
                  <Text
                    style={
                      styles.riderName
                    }
                  >
                    {
                      riderName
                    }
                  </Text>

                  <Text
                    style={
                      styles.riderRole
                    }
                  >
                    FLOGRAM Rider
                  </Text>

                  {riderPhone ? (
                    <Text
                      style={
                        styles.riderPhone
                      }
                    >
                      {
                        riderPhone
                      }
                    </Text>
                  ) : null}
                </View>

                {riderPhone ? (
                  <Pressable
                    style={
                      styles.callButton
                    }
                    onPress={() =>
                      void callRider()
                    }
                  >
                    <Ionicons
                      name="call"
                      size={18}
                      color="#FFFFFF"
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View
                style={
                  styles.waitingRider
                }
              >
                <View
                  style={
                    styles.waitingRiderIcon
                  }
                >
                  <Ionicons
                    name="search-outline"
                    size={22}
                    color="#A66D12"
                  />
                </View>

                <View
                  style={
                    styles.waitingRiderContent
                  }
                >
                  <Text
                    style={
                      styles.waitingRiderTitle
                    }
                  >
                    Waiting for Rider
                  </Text>

                  <Text
                    style={
                      styles.waitingRiderText
                    }
                  >
                    Your delivery request
                    is waiting to be
                    accepted.
                  </Text>
                </View>
              </View>
            )}

            {delivery
              .riderLocation
              ?.updatedAt ? (
              <View
                style={
                  styles.riderLocationUpdate
                }
              >
                <Ionicons
                  name="radio-outline"
                  size={15}
                  color="#6B9B75"
                />

                <Text
                  style={
                    styles.riderLocationUpdateText
                  }
                >
                  Last rider location:{" "}
                  {formatDateTime(
                    delivery
                      .riderLocation
                      .updatedAt
                  )}
                </Text>
              </View>
            ) : null}
          </View>

          {/*
           * ===================================================
           * DELIVERY ROUTE
           * ===================================================
           */}

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              DELIVERY ROUTE
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Pickup & Destination
            </Text>

            <View
              style={
                styles.routeContainer
              }
            >
              <RoutePoint
                icon="flower-outline"
                iconBackground="#FDECF1"
                iconColor="#D85D7A"
                label="Pickup"
                title={
                  florist?.shopName ||
                  "Florist"
                }
                address={formatAddress(
                  delivery.pickupAddress
                )}
              />

              <View
                style={
                  styles.routeConnector
                }
              >
                <View
                  style={
                    styles.routeConnectorLine
                  }
                />
              </View>

              <RoutePoint
                icon="location-outline"
                iconBackground="#EEF2FB"
                iconColor="#5274A3"
                label="Deliver To"
                title={
                  delivery.recipientName ||
                  "Recipient"
                }
                address={formatAddress(
                  delivery.deliveryAddress
                )}
              />

              {delivery
                .deliveryAddress
                ?.landmark ? (
                <View
                  style={
                    styles.landmarkBox
                  }
                >
                  <Ionicons
                    name="flag-outline"
                    size={15}
                    color="#8B681E"
                  />

                  <Text
                    style={
                      styles.landmarkText
                    }
                  >
                    Landmark:{" "}
                    {
                      delivery
                        .deliveryAddress
                        .landmark
                    }
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/*
           * ===================================================
           * ORDER INFORMATION
           * ===================================================
           */}

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              ORDER
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Delivery Details
            </Text>

            <View
              style={
                styles.detailRows
              }
            >
              <DetailRow
                icon="flower-outline"
                label="Bouquet"
                value={
                  order?.productName ||
                  "Flower Order"
                }
              />

              <DetailRow
                icon="person-outline"
                label="Recipient"
                value={
                  delivery.recipientName ||
                  "Recipient"
                }
              />

              <DetailRow
                icon="call-outline"
                label="Recipient Phone"
                value={
                  delivery.recipientPhoneNumber ||
                  "Not available"
                }
              />

              <DetailRow
                icon="storefront-outline"
                label="Florist"
                value={
                  florist?.shopName ||
                  "FLOGRAM Florist"
                }
              />

              <DetailRow
                icon="card-outline"
                label="Payment"
                value={
                  order?.paymentStatus
                    ? formatStatus(
                        order.paymentStatus
                      )
                    : "Not available"
                }
              />
            </View>
          </View>

          {/*
           * ===================================================
           * TIMELINE
           * ===================================================
           */}

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              PROGRESS
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Delivery Timeline
            </Text>

            {delivery.status ===
            "cancelled" ? (
              <View
                style={
                  styles.cancelledTimeline
                }
              >
                <View
                  style={
                    styles.cancelledTimelineIcon
                  }
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={
                    styles.cancelledTimelineContent
                  }
                >
                  <Text
                    style={
                      styles.cancelledTimelineTitle
                    }
                  >
                    Delivery Cancelled
                  </Text>

                  <Text
                    style={
                      styles.cancelledTimelineText
                    }
                  >
                    This delivery request
                    has been cancelled.
                  </Text>

                  {delivery.cancelledAt ? (
                    <Text
                      style={
                        styles.timelineTime
                      }
                    >
                      {formatDateTime(
                        delivery.cancelledAt
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View
                style={
                  styles.timeline
                }
              >
                {TIMELINE_STEPS.map(
                  (
                    step,
                    index
                  ) => {
                    const completed =
                      index <=
                      timelineProgress;

                    const current =
                      index ===
                        timelineProgress &&
                      delivery.status !==
                        "delivered";

                    const isLast =
                      index ===
                      TIMELINE_STEPS.length -
                        1;

                    let timestamp:
                      | string
                      | null
                      | undefined =
                      null;

                    if (
                      step.key ===
                      "accepted"
                    ) {
                      timestamp =
                        delivery.acceptedAt;
                    }

                    if (
                      step.key ===
                      "picked_up"
                    ) {
                      timestamp =
                        delivery.pickedUpAt;
                    }

                    if (
                      step.key ===
                      "out_for_delivery"
                    ) {
                      timestamp =
                        delivery.outForDeliveryAt;
                    }

                    if (
                      step.key ===
                      "delivered"
                    ) {
                      timestamp =
                        delivery.deliveredAt;
                    }

                    return (
                      <View
                        key={
                          step.key
                        }
                        style={
                          styles.timelineRow
                        }
                      >
                        <View
                          style={
                            styles.timelineLeft
                          }
                        >
                          <View
                            style={[
                              styles.timelineIcon,

                              completed &&
                                styles.timelineIconComplete,

                              current &&
                                styles.timelineIconCurrent,
                            ]}
                          >
                            <Ionicons
                              name={
                                completed
                                  ? "checkmark"
                                  : step.icon
                              }
                              size={
                                completed
                                  ? 16
                                  : 15
                              }
                              color={
                                completed
                                  ? "#FFFFFF"
                                  : "#A9A09E"
                              }
                            />
                          </View>

                          {!isLast ? (
                            <View
                              style={[
                                styles.timelineLine,

                                index <
                                  timelineProgress &&
                                  styles.timelineLineComplete,
                              ]}
                            />
                          ) : null}
                        </View>

                        <View
                          style={
                            styles.timelineContent
                          }
                        >
                          <Text
                            style={[
                              styles.timelineTitle,

                              completed &&
                                styles.timelineTitleComplete,
                            ]}
                          >
                            {
                              step.title
                            }
                          </Text>

                          <Text
                            style={
                              styles.timelineDescription
                            }
                          >
                            {
                              step.description
                            }
                          </Text>

                          {timestamp ? (
                            <Text
                              style={
                                styles.timelineTime
                              }
                            >
                              {formatDateTime(
                                timestamp
                              )}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  }
                )}
              </View>
            )}
          </View>

          {/*
           * ===================================================
           * DELIVERED NOTICE
           * ===================================================
           */}

          {delivery.status ===
          "delivered" ? (
            <View
              style={
                styles.deliveredNotice
              }
            >
              <View
                style={
                  styles.deliveredNoticeIcon
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={31}
                  color="#3F8650"
                />
              </View>

              <View
                style={
                  styles.deliveredNoticeContent
                }
              >
                <Text
                  style={
                    styles.deliveredNoticeTitle
                  }
                >
                  Bouquet Delivered
                </Text>

                <Text
                  style={
                    styles.deliveredNoticeText
                  }
                >
                  Return to your order
                  details to confirm
                  that you received
                  the bouquet.
                </Text>

                <Pressable
                  style={
                    styles.viewOrderButton
                  }
                  onPress={() => {
                    const orderId =
                      typeof delivery.order ===
                      "string"
                        ? delivery.order
                        : delivery.order
                            ?._id;

                    if (
                      orderId
                    ) {
                      router.replace({
                        pathname:
                          "/(customer)/customer-order-details",

                        params: {
                          orderId,
                        },
                      } as never);

                      return;
                    }

                    router.replace(
                      "/(customer)/customer-orders" as never
                    );
                  }}
                >
                  <Text
                    style={
                      styles.viewOrderButtonText
                    }
                  >
                    View Order
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </View>
          ) : null}

          <View
            style={{
              height: 28,
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * NAVIGATION STAT
 * =========================================================
 */

function NavigationStat({
  icon,
  value,
  label,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  value: string;

  label: string;
}) {
  return (
    <View
      style={
        styles.navigationStat
      }
    >
      <Ionicons
        name={
          icon
        }
        size={17}
        color="#D85D7A"
      />

      <Text
        style={
          styles.navigationStatValue
        }
      >
        {
          value
        }
      </Text>

      <Text
        style={
          styles.navigationStatLabel
        }
      >
        {
          label
        }
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * LEGEND
 * =========================================================
 */

function LegendItem({
  icon,
  label,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;
}) {
  return (
    <View
      style={
        styles.legendItem
      }
    >
      <Ionicons
        name={
          icon
        }
        size={14}
        color="#807775"
      />

      <Text
        style={
          styles.legendText
        }
      >
        {
          label
        }
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * ROUTE POINT
 * =========================================================
 */

function RoutePoint({
  icon,
  iconBackground,
  iconColor,
  label,
  title,
  address,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  iconBackground:
    string;

  iconColor:
    string;

  label: string;

  title: string;

  address: string;
}) {
  return (
    <View
      style={
        styles.routePoint
      }
    >
      <View
        style={[
          styles.routePointIcon,

          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={
            icon
          }
          size={19}
          color={
            iconColor
          }
        />
      </View>

      <View
        style={
          styles.routePointContent
        }
      >
        <Text
          style={
            styles.routePointLabel
          }
        >
          {
            label
          }
        </Text>

        <Text
          style={
            styles.routePointTitle
          }
        >
          {
            title
          }
        </Text>

        <Text
          style={
            styles.routePointAddress
          }
        >
          {
            address
          }
        </Text>
      </View>
    </View>
  );
}

/*
 * =========================================================
 * DETAIL ROW
 * =========================================================
 */

function DetailRow({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <View
        style={
          styles.detailIcon
        }
      >
        <Ionicons
          name={
            icon
          }
          size={17}
          color="#D85D7A"
        />
      </View>

      <View
        style={
          styles.detailContent
        }
      >
        <Text
          style={
            styles.detailLabel
          }
        >
          {
            label
          }
        </Text>

        <Text
          style={
            styles.detailValue
          }
        >
          {
            value
          }
        </Text>
      </View>
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",
    },

    screen: {
      flex: 1,

      backgroundColor:
        "#FAF8F7",
    },

    /*
     * HEADER
     */

    header: {
      minHeight: 70,

      paddingHorizontal:
        14,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#EAE4E2",
    },

    headerButton: {
      width: 42,

      height: 42,

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

    headerTitle: {
      fontSize: 19,

      fontWeight:
        "800",

      color:
        "#302B2A",
    },

    headerSubtitle: {
      marginTop: 2,

      fontSize: 10,

      fontWeight:
        "700",

      color:
        "#A09896",

      letterSpacing:
        0.4,
    },

    /*
     * SCROLL
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      padding: 15,
    },

    /*
     * LOADING
     */

    loadingContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        30,

      backgroundColor:
        "#FAF8F7",
    },

    loadingIcon: {
      width: 74,

      height: 74,

      borderRadius:
        37,

      marginBottom:
        20,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    loadingTitle: {
      marginTop: 16,

      fontSize: 18,

      fontWeight:
        "800",

      color:
        "#393332",
    },

    loadingText: {
      marginTop: 6,

      fontSize: 12,

      lineHeight: 18,

      textAlign:
        "center",

      color:
        "#8F8785",
    },

    /*
     * NO DELIVERY
     */

    noDeliveryContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        32,

      backgroundColor:
        "#FAF8F7",
    },

    noDeliveryIcon: {
      width: 108,

      height: 108,

      borderRadius:
        54,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    noDeliveryTitle: {
      marginTop: 22,

      fontSize: 21,

      fontWeight:
        "900",

      color:
        "#332E2D",

      textAlign:
        "center",
    },

    noDeliveryDescription: {
      marginTop: 9,

      fontSize: 13,

      lineHeight: 20,

      color:
        "#8D8583",

      textAlign:
        "center",
    },

    retryButton: {
      marginTop: 24,

      minHeight: 46,

      paddingHorizontal:
        22,

      borderRadius:
        14,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,

      backgroundColor:
        "#D85D7A",
    },

    retryButtonText: {
      fontSize: 13,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    backOrdersButton: {
      marginTop: 10,

      paddingHorizontal:
        18,

      paddingVertical:
        12,
    },

    backOrdersText: {
      fontSize: 12,

      fontWeight:
        "700",

      color:
        "#817977",
    },

    /*
     * STATUS CARD
     */

    statusCard: {
      padding: 16,

      borderRadius:
        18,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 12,

      borderWidth: 1,

      borderColor:
        "rgba(0,0,0,0.03)",
    },

    statusIconCircle: {
      width: 48,

      height: 48,

      borderRadius:
        24,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "rgba(255,255,255,0.75)",
    },

    statusContent: {
      flex: 1,
    },

    statusTitleRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      flexWrap:
        "wrap",

      gap: 8,
    },

    statusTitle: {
      fontSize: 16,

      fontWeight:
        "900",
    },

    statusDescription: {
      marginTop: 4,

      fontSize: 12,

      lineHeight: 18,

      color:
        "#716967",
    },

    lastUpdatedText: {
      marginTop: 7,

      fontSize: 9,

      color:
        "#938A88",
    },

    liveBadge: {
      paddingHorizontal:
        7,

      paddingVertical:
        4,

      borderRadius:
        10,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,

      backgroundColor:
        "#FFFFFF",
    },

    liveDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        "#42A05A",
    },

    liveText: {
      fontSize: 8,

      fontWeight:
        "900",

      color:
        "#4A8E59",

      letterSpacing:
        0.4,
    },

    /*
     * ERROR
     */

    errorCard: {
      marginTop: 12,

      padding: 12,

      borderRadius:
        12,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      backgroundColor:
        "#FFF0F3",
    },

    errorText: {
      flex: 1,

      fontSize: 11,

      lineHeight: 16,

      color:
        "#9D5A67",
    },

    /*
     * GENERAL CARD
     */

    card: {
      marginTop: 13,

      padding: 16,

      borderRadius:
        18,

      borderWidth: 1,

      borderColor:
        "#EBE5E3",

      backgroundColor:
        "#FFFFFF",
    },

    sectionHeadingRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    sectionEyebrow: {
      fontSize: 9,

      fontWeight:
        "800",

      letterSpacing:
        0.8,

      color:
        "#A49B99",
    },

    sectionTitle: {
      marginTop: 3,

      fontSize: 16,

      fontWeight:
        "900",

      color:
        "#383230",
    },

    /*
     * NAVIGATION
     */

    navigationCard: {
      marginTop: 13,

      padding: 16,

      borderRadius:
        18,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#EBE5E3",
    },

    navigationIcon: {
      width: 41,

      height: 41,

      borderRadius:
        13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    navigationStats: {
      marginTop: 17,

      flexDirection:
        "row",

      alignItems:
        "stretch",

      justifyContent:
        "space-between",
    },

    navigationStat: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        4,
    },

    navigationStatValue: {
      marginTop: 5,

      fontSize: 16,

      fontWeight:
        "900",

      color:
        "#373130",
    },

    navigationStatLabel: {
      marginTop: 2,

      fontSize: 9,

      fontWeight:
        "600",

      color:
        "#99908E",
    },

    statDivider: {
      width: 1,

      backgroundColor:
        "#EEE8E6",
    },

    navigationUpdated: {
      marginTop: 13,

      fontSize: 9,

      textAlign:
        "center",

      color:
        "#AAA19F",
    },

    /*
     * MAP
     */

    mapCard: {
      marginTop: 13,

      borderRadius:
        18,

      overflow:
        "hidden",

      borderWidth: 1,

      borderColor:
        "#EBE5E3",

      backgroundColor:
        "#FFFFFF",
    },

    mapHeader: {
      padding: 16,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    mapTitle: {
      marginTop: 3,

      fontSize: 16,

      fontWeight:
        "900",

      color:
        "#383230",
    },

    gpsBadge: {
      paddingHorizontal:
        9,

      paddingVertical:
        6,

      borderRadius:
        12,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      backgroundColor:
        "#EDF8EF",
    },

    gpsDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        "#4E9B5E",
    },

    gpsText: {
      fontSize: 9,

      fontWeight:
        "800",

      color:
        "#4E895B",
    },

    mapContainer: {
      height: 340,

      position:
        "relative",

      backgroundColor:
        "#F0EEEC",
    },

    map: {
      ...StyleSheet.absoluteFill,
    },

    recenterButton: {
      position:
        "absolute",

      right: 12,

      top: 12,

      minHeight: 38,

      paddingHorizontal:
        11,

      borderRadius:
        12,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,

      backgroundColor:
        "rgba(255,255,255,0.95)",

      borderWidth: 1,

      borderColor:
        "#E4DEDC",
    },

    recenterButtonPressed: {
      opacity: 0.8,
    },

    recenterText: {
      fontSize: 10,

      fontWeight:
        "800",

      color:
        "#5D5654",
    },

    waitingGpsBadge: {
      position:
        "absolute",

      left: 12,

      bottom: 12,

      paddingHorizontal:
        10,

      minHeight: 38,

      borderRadius:
        12,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,

      backgroundColor:
        "rgba(255,248,232,0.96)",

      borderWidth: 1,

      borderColor:
        "#F1DFC0",
    },

    waitingGpsText: {
      fontSize: 9,

      fontWeight:
        "700",

      color:
        "#956C1E",
    },

    noMapContainer: {
      height: 230,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        25,

      backgroundColor:
        "#F8F5F4",
    },

    noMapTitle: {
      marginTop: 9,

      fontSize: 14,

      fontWeight:
        "800",

      color:
        "#6D6563",
    },

    noMapText: {
      marginTop: 4,

      fontSize: 11,

      textAlign:
        "center",

      color:
        "#A09997",
    },

    mapLegend: {
      minHeight: 47,

      paddingHorizontal:
        15,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 20,

      borderTopWidth:
        1,

      borderTopColor:
        "#EFEAE8",

      backgroundColor:
        "#FFFFFF",
    },

    legendItem: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,
    },

    legendText: {
      fontSize: 9,

      fontWeight:
        "600",

      color:
        "#817A78",
    },

    /*
     * MAP MARKERS
     */

    pickupMarkerOuter: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "rgba(216,93,122,0.20)",
    },

    pickupMarker: {
      width: 31,

      height: 31,

      borderRadius:
        16,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#D85D7A",

      borderWidth: 2,

      borderColor:
        "#FFFFFF",
    },

    destinationMarkerOuter: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "rgba(75,111,161,0.20)",
    },

    destinationMarker: {
      width: 31,

      height: 31,

      borderRadius:
        16,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#5274A3",

      borderWidth: 2,

      borderColor:
        "#FFFFFF",
    },

    riderMarkerOuter: {
      width: 49,

      height: 49,

      borderRadius:
        25,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "rgba(68,151,83,0.20)",
    },

    riderMarker: {
      width: 35,

      height: 35,

      borderRadius:
        18,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#489758",

      borderWidth: 2,

      borderColor:
        "#FFFFFF",
    },

    /*
     * RIDER
     */

    riderAvatar: {
      width: 43,

      height: 43,

      borderRadius:
        22,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    riderInfoRow: {
      marginTop: 15,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    riderInfo: {
      flex: 1,
    },

    riderName: {
      fontSize: 15,

      fontWeight:
        "900",

      color:
        "#373130",
    },

    riderRole: {
      marginTop: 2,

      fontSize: 10,

      fontWeight:
        "600",

      color:
        "#A09896",
    },

    riderPhone: {
      marginTop: 5,

      fontSize: 11,

      fontWeight:
        "700",

      color:
        "#6F6765",
    },

    callButton: {
      width: 43,

      height: 43,

      borderRadius:
        22,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#D85D7A",
    },

    riderLocationUpdate: {
      marginTop: 13,

      paddingTop: 11,

      borderTopWidth: 1,

      borderTopColor:
        "#F0EBE9",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,
    },

    riderLocationUpdateText: {
      flex: 1,

      fontSize: 9,

      color:
        "#8D8583",
    },

    waitingRider: {
      marginTop: 15,

      padding: 13,

      borderRadius:
        13,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 11,

      backgroundColor:
        "#FFF8E9",
    },

    waitingRiderIcon: {
      width: 38,

      height: 38,

      borderRadius:
        19,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0D2",
    },

    waitingRiderContent: {
      flex: 1,
    },

    waitingRiderTitle: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#87651F",
    },

    waitingRiderText: {
      marginTop: 2,

      fontSize: 10,

      lineHeight: 15,

      color:
        "#9E814A",
    },

    /*
     * ROUTE
     */

    routeContainer: {
      marginTop: 17,
    },

    routePoint: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",
    },

    routePointIcon: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    routePointContent: {
      flex: 1,

      marginLeft: 12,
    },

    routePointLabel: {
      fontSize: 9,

      fontWeight:
        "700",

      textTransform:
        "uppercase",

      letterSpacing:
        0.5,

      color:
        "#A29A98",
    },

    routePointTitle: {
      marginTop: 2,

      fontSize: 13,

      fontWeight:
        "800",

      color:
        "#3E3836",
    },

    routePointAddress: {
      marginTop: 3,

      fontSize: 11,

      lineHeight: 16,

      color:
        "#837B79",
    },

    routeConnector: {
      height: 28,

      width: 42,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    routeConnectorLine: {
      width: 2,

      height: 22,

      backgroundColor:
        "#E6DEDC",
    },

    landmarkBox: {
      marginTop: 14,

      paddingHorizontal:
        11,

      paddingVertical:
        9,

      borderRadius:
        10,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 6,

      backgroundColor:
        "#FFF8E9",
    },

    landmarkText: {
      flex: 1,

      fontSize: 10,

      lineHeight: 15,

      color:
        "#8D6B25",
    },

    /*
     * DETAILS
     */

    detailRows: {
      marginTop: 10,
    },

    detailRow: {
      minHeight: 59,

      flexDirection:
        "row",

      alignItems:
        "center",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#EEE8E6",
    },

    detailIcon: {
      width: 34,

      height: 34,

      borderRadius:
        11,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF2F5",
    },

    detailContent: {
      flex: 1,

      marginLeft: 11,
    },

    detailLabel: {
      fontSize: 9,

      fontWeight:
        "600",

      color:
        "#A09896",
    },

    detailValue: {
      marginTop: 2,

      fontSize: 12,

      fontWeight:
        "700",

      color:
        "#514A48",
    },

    /*
     * TIMELINE
     */

    timeline: {
      marginTop: 18,
    },

    timelineRow: {
      flexDirection:
        "row",

      minHeight: 76,
    },

    timelineLeft: {
      width: 40,

      alignItems:
        "center",
    },

    timelineIcon: {
      width: 30,

      height: 30,

      borderRadius:
        15,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#F0ECEB",

      borderWidth: 1,

      borderColor:
        "#E4DEDC",
    },

    timelineIconComplete: {
      backgroundColor:
        "#D85D7A",

      borderColor:
        "#D85D7A",
    },

    timelineIconCurrent: {
      backgroundColor:
        "#D85D7A",

      borderColor:
        "#D85D7A",
    },

    timelineLine: {
      width: 2,

      flex: 1,

      backgroundColor:
        "#E5DFDD",
    },

    timelineLineComplete: {
      backgroundColor:
        "#D85D7A",
    },

    timelineContent: {
      flex: 1,

      paddingLeft: 9,

      paddingBottom:
        18,
    },

    timelineTitle: {
      fontSize: 12,

      fontWeight:
        "700",

      color:
        "#9B9391",
    },

    timelineTitleComplete: {
      color:
        "#403937",

      fontWeight:
        "900",
    },

    timelineDescription: {
      marginTop: 3,

      fontSize: 10,

      lineHeight: 15,

      color:
        "#9B9391",
    },

    timelineTime: {
      marginTop: 4,

      fontSize: 9,

      color:
        "#B0A8A6",
    },

    cancelledTimeline: {
      marginTop: 17,

      flexDirection:
        "row",

      alignItems:
        "flex-start",
    },

    cancelledTimelineIcon: {
      width: 35,

      height: 35,

      borderRadius:
        18,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#C25A68",
    },

    cancelledTimelineContent: {
      flex: 1,

      marginLeft: 11,
    },

    cancelledTimelineTitle: {
      fontSize: 13,

      fontWeight:
        "900",

      color:
        "#A64D59",
    },

    cancelledTimelineText: {
      marginTop: 3,

      fontSize: 10,

      lineHeight: 15,

      color:
        "#946D72",
    },

    /*
     * DELIVERED
     */

    deliveredNotice: {
      marginTop: 13,

      padding: 16,

      borderRadius:
        18,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 12,

      borderWidth: 1,

      borderColor:
        "#D3EAD7",

      backgroundColor:
        "#F0FAF2",
    },

    deliveredNoticeIcon: {
      width: 43,

      height: 43,

      borderRadius:
        22,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#DFF2E4",
    },

    deliveredNoticeContent: {
      flex: 1,
    },

    deliveredNoticeTitle: {
      fontSize: 14,

      fontWeight:
        "900",

      color:
        "#3E794A",
    },

    deliveredNoticeText: {
      marginTop: 4,

      fontSize: 11,

      lineHeight: 17,

      color:
        "#67826E",
    },

    viewOrderButton: {
      marginTop: 12,

      alignSelf:
        "flex-start",

      minHeight: 39,

      paddingHorizontal:
        14,

      borderRadius:
        11,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,

      backgroundColor:
        "#4B915A",
    },

    viewOrderButtonText: {
      fontSize: 11,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },
  });