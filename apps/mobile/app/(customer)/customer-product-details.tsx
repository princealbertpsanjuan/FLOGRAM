import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  apiRequest,
} from "../../services/api";

/*
 * =========================================================
 * API CONFIGURATION
 * =========================================================
 */

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "";

const API_ORIGIN =
  API_URL.replace(
    /\/api\/v1\/?$/i,
    ""
  ).replace(/\/+$/, "");

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type Address = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

type Seller = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type Florist = {
  _id?: string;
  shopName?: string;
  description?: string | null;
  address?: Address;
  contactNumber?: string | null;
  businessEmail?: string | null;
};

type Flower = {
  _id: string;

  seller?: Seller | string | null;

  florist?: Florist | string | null;

  name: string;

  description?: string | null;

  price: number;

  category?: string | null;

  occasion?: string[];

  flowerTypes?: string[];

  colors?: string[];

  images?: string[];

  isAvailable: boolean;

  isActive: boolean;

  createdAt?: string;

  updatedAt?: string;
};

type FlowerResponse = {
  success: boolean;

  message?: string;

  data?: {
    flower?: Flower;
  };
};

type CartResponse = {
  success: boolean;

  message?: string;

  data?: {
    cart?: {
      _id: string;
      itemCount: number;
      totalQuantity: number;
    };
  };
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const getImageUrl = (
  path?: string | null
) => {
  if (!path) {
    return null;
  }

  const value =
    String(path).trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (!API_ORIGIN) {
    return value;
  }

  const normalizedPath =
    value.replace(/^\/+/, "");

  return `${API_ORIGIN}/${normalizedPath}`;
};

const formatPrice = (
  value?: number | null
) => {
  const numberValue =
    Number(value);

  if (
    !Number.isFinite(numberValue)
  ) {
    return "₱0.00";
  }

  return `₱${numberValue.toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatAddress = (
  address?: Address
) => {
  if (!address) {
    return "Address unavailable";
  }

  const text = [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    text ||
    "Address unavailable"
  );
};

const getFloristName = (
  florist?: Florist | string | null
) => {
  if (
    florist &&
    typeof florist === "object"
  ) {
    return (
      florist.shopName ||
      "FLOGRAM Florist"
    );
  }

  return "FLOGRAM Florist";
};

/*
 * =========================================================
 * MAIN SCREEN
 * =========================================================
 */

export default function CustomerProductDetailsScreen() {
  /*
   * =======================================================
   * ROUTE PARAMS
   * =======================================================
   */

  const params =
    useLocalSearchParams<{
      flowerId?:
        | string
        | string[];
    }>();

  const flowerId =
    Array.isArray(
      params.flowerId
    )
      ? params.flowerId[0]
      : params.flowerId;

  /*
   * =======================================================
   * STATE
   * =======================================================
   */

  const [
    flower,
    setFlower,
  ] =
    useState<Flower | null>(
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
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    quantity,
    setQuantity,
  ] =
    useState(1);

  const [
    selectedImageIndex,
    setSelectedImageIndex,
  ] =
    useState(0);

  const [
    addingToCart,
    setAddingToCart,
  ] =
    useState(false);

  /*
   * =======================================================
   * LOAD PRODUCT
   * =======================================================
   */

  const loadFlower =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (!flowerId) {
          setErrorMessage(
            "Flower listing ID was not provided."
          );

          setLoading(false);

          return;
        }

        try {
          if (showLoader) {
            setLoading(true);
          }

          setErrorMessage(
            ""
          );

          const response =
            await apiRequest<FlowerResponse>(
              `/flowers/${flowerId}`
            );

          const nextFlower =
            response.data?.flower;

          if (!nextFlower) {
            throw new Error(
              response.message ||
                "Flower listing was not returned."
            );
          }

          setFlower(
            nextFlower
          );

          setSelectedImageIndex(
            0
          );
        } catch (error) {
          console.error(
            "Load flower details error:",
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load this flower listing."
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [flowerId]
    );

  /*
   * =======================================================
   * INITIAL LOAD
   * =======================================================
   */

  useEffect(() => {
    void loadFlower();
  }, [loadFlower]);

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

          await loadFlower(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [loadFlower]
    );

  /*
   * =======================================================
   * PRODUCT STATE
   * =======================================================
   */

  const isAvailable =
    Boolean(
      flower?.isActive ===
        true &&
        flower?.isAvailable ===
          true
    );

  const images =
    useMemo(
      () =>
        flower?.images ?? [],
      [flower?.images]
    );

  const currentImage =
    getImageUrl(
      images[
        selectedImageIndex
      ]
    );

  const florist =
    flower?.florist &&
    typeof flower.florist ===
      "object"
      ? flower.florist
      : null;

  const totalPrice =
    (flower?.price ?? 0) *
    quantity;

  /*
   * =======================================================
   * QUANTITY
   * =======================================================
   */

  const decreaseQuantity =
    useCallback(() => {
      setQuantity(
        (current) =>
          Math.max(
            1,
            current - 1
          )
      );
    }, []);

  const increaseQuantity =
    useCallback(() => {
      setQuantity(
        (current) =>
          current + 1
      );
    }, []);

  /*
   * =======================================================
   * ADD TO CART
   * =======================================================
   */

  const handleAddToCart =
    useCallback(
      async () => {
        if (
          !flower ||
          !flowerId
        ) {
          return;
        }

        if (!isAvailable) {
          Alert.alert(
            "Unavailable",
            "This bouquet is currently unavailable."
          );

          return;
        }

        try {
          setAddingToCart(
            true
          );

          const response =
            await apiRequest<CartResponse>(
              "/cart/items",
              {
                method: "POST",

                authenticated:
                  true,

                body: JSON.stringify(
                  {
                    flowerId:
                      flower._id,

                    quantity,
                  }
                ),
              }
            );

          Alert.alert(
            "Added to Cart",
            `${flower.name} has been added to your cart.`,
            [
              {
                text:
                  "Continue Shopping",

                style:
                  "cancel",
              },

              {
                text:
                  "View Cart",

                onPress: () => {
                  router.push(
                    "/(customer)/customer-cart" as never
                  );
                },
              },
            ]
          );

          console.log(
            "Cart response:",
            response.data?.cart
          );
        } catch (error) {
          console.error(
            "Add to cart error:",
            error
          );

          Alert.alert(
            "Unable to Add to Cart",
            error instanceof Error
              ? error.message
              : "Please try again."
          );
        } finally {
          setAddingToCart(
            false
          );
        }
      },
      [
        flower,
        flowerId,
        isAvailable,
        quantity,
      ]
    );

  /*
   * =======================================================
   * GO TO CART
   * =======================================================
   */

  const openCart =
    useCallback(() => {
      router.push(
        "/(customer)/customer-cart" as never
      );
    }, []);

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (
    loading &&
    !flower
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
              size={24}
              color="#302B2A"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Bouquet Details
          </Text>

          <View
            style={
              styles.headerButton
            }
          />
        </View>

        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#D85D7A"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading bouquet...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * ERROR
   * =======================================================
   */

  if (
    errorMessage &&
    !flower
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
              size={24}
              color="#302B2A"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Bouquet Details
          </Text>

          <View
            style={
              styles.headerButton
            }
          />
        </View>

        <View
          style={
            styles.errorContainer
          }
        >
          <View
            style={
              styles.errorIcon
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={44}
              color="#D85D7A"
            />
          </View>

          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to load
            bouquet
          </Text>

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
            style={
              styles.retryButton
            }
            onPress={() =>
              void loadFlower()
            }
          >
            <Ionicons
              name="refresh"
              size={18}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.retryText
              }
            >
              Try Again
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!flower) {
    return null;
  }

  /*
   * =======================================================
   * RENDER
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
         * =================================================
         * HEADER
         * =================================================
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
              size={24}
              color="#302B2A"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Bouquet Details
          </Text>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={
              openCart
            }
          >
            <Ionicons
              name="bag-handle-outline"
              size={22}
              color="#D85D7A"
            />
          </Pressable>
        </View>

        {/*
         * =================================================
         * CONTENT
         * =================================================
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
              tintColor="#D85D7A"
              colors={[
                "#D85D7A",
              ]}
            />
          }
        >
          {/*
           * ===============================================
           * MAIN IMAGE
           * ===============================================
           */}

          <View
            style={
              styles.heroContainer
            }
          >
            {currentImage ? (
              <Image
                source={{
                  uri:
                    currentImage,
                }}
                style={
                  styles.heroImage
                }
                resizeMode="cover"
              />
            ) : (
              <View
                style={
                  styles.heroPlaceholder
                }
              >
                <Ionicons
                  name="flower-outline"
                  size={68}
                  color="#D991A5"
                />

                <Text
                  style={
                    styles.noImageText
                  }
                >
                  No image
                  available
                </Text>
              </View>
            )}

            <View
              style={[
                styles.availabilityBadge,

                !isAvailable &&
                  styles.unavailableBadge,
              ]}
            >
              <View
                style={[
                  styles.availabilityDot,

                  !isAvailable &&
                    styles.unavailableDot,
                ]}
              />

              <Text
                style={[
                  styles.availabilityText,

                  !isAvailable &&
                    styles.unavailableText,
                ]}
              >
                {isAvailable
                  ? "Available"
                  : "Unavailable"}
              </Text>
            </View>
          </View>

          {/*
           * ===============================================
           * IMAGE THUMBNAILS
           * ===============================================
           */}

          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.thumbnailList
              }
            >
              {images.map(
                (
                  image,
                  index
                ) => {
                  const imageUrl =
                    getImageUrl(
                      image
                    );

                  return (
                    <Pressable
                      key={`${image}-${index}`}
                      style={[
                        styles.thumbnailContainer,

                        selectedImageIndex ===
                          index &&
                          styles.thumbnailSelected,
                      ]}
                      onPress={() =>
                        setSelectedImageIndex(
                          index
                        )
                      }
                    >
                      {imageUrl ? (
                        <Image
                          source={{
                            uri:
                              imageUrl,
                          }}
                          style={
                            styles.thumbnail
                          }
                        />
                      ) : (
                        <View
                          style={
                            styles.thumbnailPlaceholder
                          }
                        >
                          <Ionicons
                            name="flower-outline"
                            size={19}
                            color="#D991A5"
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          ) : null}

          {/*
           * ===============================================
           * PRODUCT INFORMATION
           * ===============================================
           */}

          <View
            style={
              styles.productCard
            }
          >
            <Text
              style={
                styles.shopName
              }
            >
              {getFloristName(
                flower.florist
              )}
            </Text>

            <Text
              style={
                styles.productName
              }
            >
              {flower.name}
            </Text>

            <View
              style={
                styles.priceRow
              }
            >
              <Text
                style={
                  styles.price
                }
              >
                {formatPrice(
                  flower.price
                )}
              </Text>

              {flower.category ? (
                <View
                  style={
                    styles.categoryBadge
                  }
                >
                  <Text
                    style={
                      styles.categoryText
                    }
                  >
                    {
                      flower.category
                    }
                  </Text>
                </View>
              ) : null}
            </View>

            {flower.description ? (
              <>
                <View
                  style={
                    styles.divider
                  }
                />

                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  Description
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  {
                    flower.description
                  }
                </Text>
              </>
            ) : null}
          </View>

          {/*
           * ===============================================
           * BOUQUET DETAILS
           * ===============================================
           */}

          <View
            style={
              styles.infoCard
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="flower-outline"
                  size={19}
                  color="#D85D7A"
                />
              </View>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Bouquet Details
              </Text>
            </View>

            <DetailRow
              icon="pricetag-outline"
              label="Category"
              value={
                flower.category ||
                "Not specified"
              }
            />

            <DetailRow
              icon="flower-outline"
              label="Flower Type"
              value={
                flower
                  .flowerTypes
                  ?.length
                  ? flower.flowerTypes.join(
                      ", "
                    )
                  : "Not specified"
              }
            />

            <DetailRow
              icon="color-palette-outline"
              label="Color"
              value={
                flower.colors
                  ?.length
                  ? flower.colors.join(
                      ", "
                    )
                  : "Not specified"
              }
            />

            <DetailRow
              icon="gift-outline"
              label="Occasion"
              value={
                flower.occasion
                  ?.length
                  ? flower.occasion.join(
                      ", "
                    )
                  : "Any occasion"
              }
              last
            />
          </View>

          {/*
           * ===============================================
           * FLORIST INFORMATION
           * ===============================================
           */}

          <View
            style={
              styles.infoCard
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="storefront-outline"
                  size={19}
                  color="#D85D7A"
                />
              </View>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Florist
              </Text>
            </View>

            <Text
              style={
                styles.floristTitle
              }
            >
              {getFloristName(
                flower.florist
              )}
            </Text>

            {florist?.description ? (
              <Text
                style={
                  styles.floristDescription
                }
              >
                {
                  florist.description
                }
              </Text>
            ) : null}

            <View
              style={
                styles.floristDivider
              }
            />

            <View
              style={
                styles.floristInfoRow
              }
            >
              <Ionicons
                name="location-outline"
                size={18}
                color="#938987"
              />

              <Text
                style={
                  styles.floristInfoText
                }
              >
                {formatAddress(
                  florist?.address
                )}
              </Text>
            </View>

            {florist?.contactNumber ? (
              <View
                style={
                  styles.floristInfoRow
                }
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color="#938987"
                />

                <Text
                  style={
                    styles.floristInfoText
                  }
                >
                  {
                    florist.contactNumber
                  }
                </Text>
              </View>
            ) : null}

            {florist?.businessEmail ? (
              <View
                style={
                  styles.floristInfoRow
                }
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color="#938987"
                />

                <Text
                  style={
                    styles.floristInfoText
                  }
                >
                  {
                    florist.businessEmail
                  }
                </Text>
              </View>
            ) : null}
          </View>

          {/*
           * ===============================================
           * QUANTITY
           * ===============================================
           */}

          <View
            style={
              styles.quantityCard
            }
          >
            <View>
              <Text
                style={
                  styles.quantityTitle
                }
              >
                Quantity
              </Text>

              <Text
                style={
                  styles.quantitySubtitle
                }
              >
                Choose how many
                bouquets
              </Text>
            </View>

            <View
              style={
                styles.quantityControl
              }
            >
              <Pressable
                style={[
                  styles.quantityButton,

                  quantity <= 1 &&
                    styles.quantityButtonDisabled,
                ]}
                onPress={
                  decreaseQuantity
                }
                disabled={
                  quantity <= 1
                }
              >
                <Ionicons
                  name="remove"
                  size={19}
                  color={
                    quantity <= 1
                      ? "#CFC8C6"
                      : "#554E4C"
                  }
                />
              </Pressable>

              <View
                style={
                  styles.quantityValueContainer
                }
              >
                <Text
                  style={
                    styles.quantityValue
                  }
                >
                  {quantity}
                </Text>
              </View>

              <Pressable
                style={
                  styles.quantityButton
                }
                onPress={
                  increaseQuantity
                }
                disabled={
                  !isAvailable
                }
              >
                <Ionicons
                  name="add"
                  size={19}
                  color={
                    isAvailable
                      ? "#554E4C"
                      : "#CFC8C6"
                  }
                />
              </Pressable>
            </View>
          </View>

          {/*
           * ===============================================
           * IMPORTANT AVAILABILITY NOTE
           * ===============================================
           */}

          <View
            style={
              styles.availabilityNote
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#B37B35"
            />

            <Text
              style={
                styles.availabilityNoteText
              }
            >
              Bouquet availability
              is confirmed through
              the florist listing.
              Arrangements are
              prepared after an
              order is confirmed.
            </Text>
          </View>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/*
         * =================================================
         * BOTTOM PURCHASE BAR
         * =================================================
         */}

        <View
          style={
            styles.purchaseBar
          }
        >
          <View
            style={
              styles.totalContainer
            }
          >
            <Text
              style={
                styles.totalLabel
              }
            >
              Total
            </Text>

            <Text
              style={
                styles.totalPrice
              }
            >
              {formatPrice(
                totalPrice
              )}
            </Text>
          </View>

          <Pressable
            style={[
              styles.addToCartButton,

              !isAvailable &&
                styles.addToCartButtonDisabled,
            ]}
            onPress={
              handleAddToCart
            }
            disabled={
              !isAvailable ||
              addingToCart
            }
          >
            {addingToCart ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="bag-add-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.addToCartText
                  }
                >
                  {isAvailable
                    ? "Add to Cart"
                    : "Unavailable"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
  last = false,
}: {
  icon:
    | "pricetag-outline"
    | "flower-outline"
    | "color-palette-outline"
    | "gift-outline";

  label: string;

  value: string;

  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,

        last &&
          styles.detailRowLast,
      ]}
    >
      <View
        style={
          styles.detailLabelContainer
        }
      >
        <Ionicons
          name={icon}
          size={17}
          color="#A49A98"
        />

        <Text
          style={
            styles.detailLabel
          }
        >
          {label}
        </Text>
      </View>

      <Text
        style={
          styles.detailValue
        }
      >
        {value}
      </Text>
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
      minHeight: 66,

      paddingHorizontal: 12,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#EBE5E3",
    },

    headerButton: {
      width: 44,

      height: 44,

      borderRadius: 22,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerTitle: {
      flex: 1,

      textAlign:
        "center",

      fontSize: 18,

      fontWeight:
        "800",

      color: "#302B2A",
    },

    /*
     * SCROLL
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 15,
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

      backgroundColor:
        "#FAF8F7",
    },

    loadingText: {
      marginTop: 12,

      fontSize: 13,

      color: "#88817F",
    },

    /*
     * ERROR
     */

    errorContainer: {
      flex: 1,

      paddingHorizontal: 30,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FAF8F7",
    },

    errorIcon: {
      width: 90,

      height: 90,

      borderRadius: 45,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    errorTitle: {
      marginTop: 18,

      fontSize: 20,

      fontWeight:
        "800",

      color: "#332E2D",
    },

    errorText: {
      marginTop: 7,

      fontSize: 13,

      lineHeight: 19,

      color: "#8E8684",

      textAlign:
        "center",
    },

    retryButton: {
      marginTop: 21,

      minHeight: 45,

      paddingHorizontal: 20,

      borderRadius: 14,

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

    retryText: {
      fontSize: 13,

      fontWeight:
        "800",

      color: "#FFFFFF",
    },

    /*
     * HERO
     */

    heroContainer: {
      width: "100%",

      height: 330,

      position:
        "relative",

      backgroundColor:
        "#F5EAED",
    },

    heroImage: {
      width: "100%",

      height: "100%",
    },

    heroPlaceholder: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FAEDF0",
    },

    noImageText: {
      marginTop: 8,

      fontSize: 12,

      color: "#A3808B",
    },

    availabilityBadge: {
      position:
        "absolute",

      left: 17,

      bottom: 16,

      minHeight: 30,

      paddingHorizontal: 11,

      borderRadius: 15,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 6,

      backgroundColor:
        "rgba(255,255,255,0.94)",
    },

    unavailableBadge: {
      backgroundColor:
        "rgba(255,240,242,0.96)",
    },

    availabilityDot: {
      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        "#53A96F",
    },

    unavailableDot: {
      backgroundColor:
        "#C35B6B",
    },

    availabilityText: {
      fontSize: 11,

      fontWeight:
        "800",

      color: "#43815A",
    },

    unavailableText: {
      color: "#B35060",
    },

    /*
     * THUMBNAILS
     */

    thumbnailList: {
      paddingHorizontal: 15,

      paddingVertical: 12,

      gap: 9,
    },

    thumbnailContainer: {
      width: 61,

      height: 61,

      borderRadius: 11,

      padding: 2,

      borderWidth: 1,

      borderColor:
        "#E6DDDB",

      overflow: "hidden",

      backgroundColor:
        "#FFFFFF",
    },

    thumbnailSelected: {
      borderWidth: 2,

      borderColor:
        "#D85D7A",
    },

    thumbnail: {
      width: "100%",

      height: "100%",

      borderRadius: 8,
    },

    thumbnailPlaceholder: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderRadius: 8,

      backgroundColor:
        "#FAEDF0",
    },

    /*
     * PRODUCT CARD
     */

    productCard: {
      marginHorizontal: 15,

      marginTop: 15,

      padding: 17,

      borderRadius: 19,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#ECE6E4",
    },

    shopName: {
      fontSize: 11,

      fontWeight:
        "700",

      color: "#D15D78",
    },

    productName: {
      marginTop: 5,

      fontSize: 25,

      lineHeight: 31,

      fontWeight:
        "900",

      color: "#2F2929",
    },

    priceRow: {
      marginTop: 10,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      gap: 10,
    },

    price: {
      fontSize: 22,

      fontWeight:
        "900",

      color: "#D15471",
    },

    categoryBadge: {
      paddingHorizontal: 11,

      paddingVertical: 6,

      borderRadius: 14,

      backgroundColor:
        "#FFF0F4",
    },

    categoryText: {
      fontSize: 10,

      fontWeight:
        "700",

      color: "#C9516D",
    },

    divider: {
      height: 1,

      marginVertical: 15,

      backgroundColor:
        "#EEE8E6",
    },

    sectionLabel: {
      fontSize: 12,

      fontWeight:
        "800",

      color: "#514A48",
    },

    description: {
      marginTop: 7,

      fontSize: 13,

      lineHeight: 20,

      color: "#746C69",
    },

    /*
     * INFORMATION CARDS
     */

    infoCard: {
      marginHorizontal: 15,

      marginTop: 13,

      padding: 16,

      borderRadius: 19,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#ECE6E4",
    },

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 13,
    },

    sectionIcon: {
      width: 35,

      height: 35,

      borderRadius: 11,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    sectionTitle: {
      marginLeft: 9,

      fontSize: 15,

      fontWeight:
        "800",

      color: "#3C3635",
    },

    /*
     * DETAIL ROW
     */

    detailRow: {
      minHeight: 43,

      paddingVertical: 8,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      gap: 15,

      borderBottomWidth: 1,

      borderBottomColor:
        "#F1ECEA",
    },

    detailRowLast: {
      borderBottomWidth:
        0,
    },

    detailLabelContainer: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },

    detailLabel: {
      fontSize: 12,

      color: "#8A8280",
    },

    detailValue: {
      flex: 1,

      textAlign:
        "right",

      fontSize: 12,

      fontWeight:
        "700",

      color: "#4E4745",
    },

    /*
     * FLORIST
     */

    floristTitle: {
      fontSize: 15,

      fontWeight:
        "800",

      color: "#393332",
    },

    floristDescription: {
      marginTop: 5,

      fontSize: 12,

      lineHeight: 18,

      color: "#77706D",
    },

    floristDivider: {
      height: 1,

      marginVertical: 12,

      backgroundColor:
        "#F0EAE8",
    },

    floristInfoRow: {
      marginBottom: 9,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,
    },

    floristInfoText: {
      flex: 1,

      fontSize: 12,

      lineHeight: 18,

      color: "#69615F",
    },

    /*
     * QUANTITY
     */

    quantityCard: {
      marginHorizontal: 15,

      marginTop: 13,

      padding: 16,

      borderRadius: 19,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#ECE6E4",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    quantityTitle: {
      fontSize: 14,

      fontWeight:
        "800",

      color: "#403A38",
    },

    quantitySubtitle: {
      marginTop: 2,

      fontSize: 10,

      color: "#968E8C",
    },

    quantityControl: {
      height: 39,

      borderWidth: 1,

      borderColor:
        "#E4DCDA",

      borderRadius: 12,

      flexDirection:
        "row",

      alignItems:
        "center",

      overflow: "hidden",

      backgroundColor:
        "#FFFFFF",
    },

    quantityButton: {
      width: 40,

      height: "100%",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    quantityButtonDisabled: {
      backgroundColor:
        "#FAF8F8",
    },

    quantityValueContainer: {
      width: 43,

      height: "100%",

      borderLeftWidth: 1,

      borderRightWidth: 1,

      borderColor:
        "#EDE6E4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    quantityValue: {
      fontSize: 14,

      fontWeight:
        "800",

      color: "#403A38",
    },

    /*
     * AVAILABILITY NOTE
     */

    availabilityNote: {
      marginHorizontal: 15,

      marginTop: 13,

      padding: 13,

      borderRadius: 14,

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,

      backgroundColor:
        "#FFF8EB",

      borderWidth: 1,

      borderColor:
        "#F1DFC1",
    },

    availabilityNoteText: {
      flex: 1,

      fontSize: 11,

      lineHeight: 17,

      color: "#8A6C42",
    },

    bottomSpacer: {
      height: 22,
    },

    /*
     * PURCHASE BAR
     */

    purchaseBar: {
      minHeight: 78,

      paddingHorizontal: 16,

      paddingVertical: 11,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 14,

      backgroundColor:
        "#FFFFFF",

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        "#E5DFDD",
    },

    totalContainer: {
      minWidth: 110,
    },

    totalLabel: {
      fontSize: 10,

      color: "#968E8C",
    },

    totalPrice: {
      marginTop: 2,

      fontSize: 19,

      fontWeight:
        "900",

      color: "#D15471",
    },

    addToCartButton: {
      flex: 1,

      height: 51,

      borderRadius: 15,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      backgroundColor:
        "#D85D7A",
    },

    addToCartButtonDisabled: {
      backgroundColor:
        "#D4B9BF",
    },

    addToCartText: {
      fontSize: 14,

      fontWeight:
        "800",

      color: "#FFFFFF",
    },
  });