import {
  Ionicons,
} from "@expo/vector-icons";
import {
  useCallback,
  useEffect,
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
  router,
} from "expo-router";

import {
  apiRequest,
} from "../../services/api";

/*
 * =========================================================
 * CONFIGURATION
 * =========================================================
 */

const API_URL =
  process.env
    .EXPO_PUBLIC_API_URL || "";

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

type Florist = {
  _id?: string;

  shopName?: string;

  shopLogo?: string | null;

  verificationStatus?: string;

  isActive?: boolean;
};

type Flower = {
  _id: string;

  seller?: string;

  florist?:
    | Florist
    | string
    | null;

  name?: string;

  description?:
    | string
    | null;

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
    | Flower
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
  _id: string | null;

  customer:
    | string
    | null;

  items: CartItem[];

  createdAt?: string;

  updatedAt?: string;

  itemCount: number;

  totalQuantity: number;

  availableItemCount: number;

  unavailableItemCount: number;

  estimatedSubtotal: number;
};

type CartApiResponse = {
  success: boolean;

  message?: string;

  data?: {
    cart?: Cart;
  };
};

type BottomTab = {
  label: string;

  icon:
    | "home-outline"
    | "search-outline"
    | "flower-outline"
    | "cart"
    | "sparkles-outline"
    | "person-outline";

  route: string;
};

/*
 * =========================================================
 * BOTTOM NAVIGATION
 * =========================================================
 */

const BOTTOM_TABS: BottomTab[] =
  [
    {
      label: "Home",
      icon: "home-outline",
      route:
        "/(customer)/customer-dashboard",
    },

    {
      label: "Discover",
      icon: "search-outline",
      route:
        "/(customer)/customer-discover",
    },

    {
      label: "Bloom",
      icon: "flower-outline",
      route:
        "/(customer)/customer-bloomboard",
    },

    {
      label: "Cart",
      icon: "cart",
      route:
        "/(customer)/customer-cart",
    },

    {
      label: "AI",
      icon: "sparkles-outline",
      route:
        "/(customer)/customer-ai",
    },

    {
      label: "Me",
      icon: "person-outline",
      route:
        "/(customer)/customer-profile",
    },
  ];

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const formatCurrency = (
  value:
    | number
    | null
    | undefined
) => {
  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue
    )
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

const resolveImageUrl = (
  image:
    | string
    | null
    | undefined
) => {
  if (!image) {
    return null;
  }

  const trimmed =
    String(image).trim();

  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith(
      "http://"
    ) ||
    trimmed.startsWith(
      "https://"
    )
  ) {
    return trimmed;
  }

  if (!API_ORIGIN) {
    return trimmed;
  }

  const normalized =
    trimmed.replace(
      /^\/+/,
      ""
    );

  return `${API_ORIGIN}/${normalized}`;
};

const getFloristName = (
  flower:
    | Flower
    | null
) => {
  if (!flower) {
    return "Florist";
  }

  if (
    flower.florist &&
    typeof flower.florist ===
      "object"
  ) {
    return (
      flower.florist
        .shopName ||
      "Florist"
    );
  }

  return "Florist";
};

const getItemPurchasableState = (
  item: CartItem
) => {
  if (
    typeof item
      .isPurchasable ===
    "boolean"
  ) {
    return item.isPurchasable;
  }

  return Boolean(
    item.flower &&
      item.flower
        .isActive ===
        true &&
      item.flower
        .isAvailable ===
        true
  );
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerCartScreen() {
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
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    updatingItemId,
    setUpdatingItemId,
  ] =
    useState<
      string | null
    >(null);

  const [
    removingItemId,
    setRemovingItemId,
  ] =
    useState<
      string | null
    >(null);

  const [
    clearingCart,
    setClearingCart,
  ] =
    useState(false);

  /*
   * =======================================================
   * APPLY CART RESPONSE
   * =======================================================
   */

  const applyCartResponse =
    useCallback(
      (
        response:
          CartApiResponse
      ) => {
        const nextCart =
          response.data
            ?.cart;

        if (!nextCart) {
          throw new Error(
            response.message ||
              "Shopping cart data was not returned."
          );
        }

        setCart(
          nextCart
        );

        setErrorMessage(
          ""
        );
      },
      []
    );

  /*
   * =======================================================
   * LOAD CART
   * =======================================================
   */

  const loadCart =
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

          setErrorMessage(
            ""
          );

          const response =
            await apiRequest<CartApiResponse>(
              "/cart",
              {
                authenticated:
                  true,
              }
            );

          applyCartResponse(
            response
          );
        } catch (error) {
          console.error(
            "Failed to load cart:",
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load your shopping cart."
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
        applyCartResponse,
      ]
    );

  /*
   * =======================================================
   * INITIAL LOAD
   * =======================================================
   */

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

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

          await loadCart(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [loadCart]
    );

  /*
   * =======================================================
   * UPDATE QUANTITY
   * =======================================================
   */

  const updateQuantity =
    useCallback(
      async (
        item: CartItem,
        nextQuantity: number
      ) => {
        if (
          nextQuantity < 1
        ) {
          return;
        }

        const isPurchasable =
          getItemPurchasableState(
            item
          );

        if (
          !isPurchasable
        ) {
          Alert.alert(
            "Product unavailable",
            "This flower listing is no longer available. Please remove it from your cart."
          );

          return;
        }

        try {
          setUpdatingItemId(
            item._id
          );

          const response =
            await apiRequest<CartApiResponse>(
              `/cart/items/${item._id}`,
              {
                method:
                  "PATCH",

                authenticated:
                  true,

                body: JSON.stringify(
                  {
                    quantity:
                      nextQuantity,
                  }
                ),
              }
            );

          applyCartResponse(
            response
          );
        } catch (error) {
          console.error(
            "Failed to update cart quantity:",
            error
          );

          Alert.alert(
            "Unable to update cart",
            error instanceof
              Error
              ? error.message
              : "Please try again."
          );

          /*
           * Refresh in case product availability changed.
           */

          void loadCart(
            false
          );
        } finally {
          setUpdatingItemId(
            null
          );
        }
      },
      [
        applyCartResponse,
        loadCart,
      ]
    );

  /*
   * =======================================================
   * REMOVE ITEM
   * =======================================================
   */

  const performRemoveItem =
    useCallback(
      async (
        cartItemId: string
      ) => {
        try {
          setRemovingItemId(
            cartItemId
          );

          const response =
            await apiRequest<CartApiResponse>(
              `/cart/items/${cartItemId}`,
              {
                method:
                  "DELETE",

                authenticated:
                  true,
              }
            );

          applyCartResponse(
            response
          );
        } catch (error) {
          console.error(
            "Failed to remove cart item:",
            error
          );

          Alert.alert(
            "Unable to remove item",
            error instanceof
              Error
              ? error.message
              : "Please try again."
          );
        } finally {
          setRemovingItemId(
            null
          );
        }
      },
      [
        applyCartResponse,
      ]
    );

  const handleRemoveItem =
    useCallback(
      (
        item: CartItem
      ) => {
        const flowerName =
          item.flower
            ?.name ||
          "this item";

        Alert.alert(
          "Remove item?",
          `Remove ${flowerName} from your cart?`,
          [
            {
              text:
                "Cancel",

              style:
                "cancel",
            },

            {
              text:
                "Remove",

              style:
                "destructive",

              onPress: () => {
                void performRemoveItem(
                  item._id
                );
              },
            },
          ]
        );
      },
      [
        performRemoveItem,
      ]
    );

  /*
   * =======================================================
   * CLEAR CART
   * =======================================================
   */

  const performClearCart =
    useCallback(
      async () => {
        try {
          setClearingCart(
            true
          );

          const response =
            await apiRequest<CartApiResponse>(
              "/cart",
              {
                method:
                  "DELETE",

                authenticated:
                  true,
              }
            );

          applyCartResponse(
            response
          );
        } catch (error) {
          console.error(
            "Failed to clear cart:",
            error
          );

          Alert.alert(
            "Unable to clear cart",
            error instanceof
              Error
              ? error.message
              : "Please try again."
          );
        } finally {
          setClearingCart(
            false
          );
        }
      },
      [
        applyCartResponse,
      ]
    );

  const handleClearCart =
    useCallback(() => {
      if (
        !cart ||
        cart.items.length ===
          0
      ) {
        return;
      }

      Alert.alert(
        "Clear cart?",
        "This will remove all flower listings from your shopping cart.",
        [
          {
            text:
              "Cancel",

            style:
              "cancel",
          },

          {
            text:
              "Clear Cart",

            style:
              "destructive",

            onPress: () => {
              void performClearCart();
            },
          },
        ]
      );
    }, [
      cart,
      performClearCart,
    ]);

  /*
   * =======================================================
   * CHECKOUT
   * =======================================================
   *
   * We deliberately DO NOT send the customer to the
   * custom-bouquet checkout flow here.
   *
   * The current normal order backend uses:
   *
   * sourceType: "flower_listing"
   * flowerId
   * quantity
   *
   * We will connect that to customer-checkout.tsx next.
   * =======================================================
   */

const handleCheckout =
  useCallback(() => {
    if (
      !cart ||
      cart.items.length === 0
    ) {
      return;
    }

    if (
      cart.availableItemCount ===
      0
    ) {
      Alert.alert(
        "No available items",
        "There are no available flower listings in your cart to checkout."
      );

      return;
    }

    if (
      cart.unavailableItemCount >
      0
    ) {
      Alert.alert(
        "Unavailable items",
        "Please remove unavailable flower listings before proceeding to checkout."
      );

      return;
    }

    router.push({
      pathname:
        "/(customer)/customer-checkout",

      params: {
        mode: "cart",
      },
    } as never);
  }, [cart]);

  /*
   * =======================================================
   * NAVIGATION
   * =======================================================
   */

  const navigateToTab =
    useCallback(
      (
        route: string
      ) => {
        if (
          route ===
          "/(customer)/customer-cart"
        ) {
          return;
        }

        router.replace(
          route as never
        );
      },
      []
    );

  const goShopping =
    useCallback(() => {
      router.push(
        "/(customer)/customer-discover" as never
      );
    }, []);

  /*
   * =======================================================
   * LOADING SCREEN
   * =======================================================
   */

  if (
    loading &&
    !cart
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
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingIconContainer
            }
          >
            <Ionicons
              name="cart-outline"
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
            Loading your
            cart
          </Text>

          <Text
            style={
              styles.loadingDescription
            }
          >
            Getting your
            flower selections...
          </Text>
        </View>

        <BottomNavigation
          onNavigate={
            navigateToTab
          }
        />
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * ERROR SCREEN
   * =======================================================
   */

  if (
    errorMessage &&
    !cart
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
            styles.errorContainer
          }
        >
          <View
            style={
              styles.errorIconContainer
            }
          >
            <Ionicons
              name="cloud-offline-outline"
              size={36}
              color="#D85D7A"
            />
          </View>

          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to load
            your cart
          </Text>

          <Text
            style={
              styles.errorDescription
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
            onPress={() => {
              void loadCart();
            }}
          >
            <Ionicons
              name="refresh"
              size={18}
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
        </View>

        <BottomNavigation
          onNavigate={
            navigateToTab
          }
        />
      </SafeAreaView>
    );
  }

  const items =
    cart?.items || [];

  const hasItems =
    items.length > 0;

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
          <View>
            <Text
              style={
                styles.headerTitle
              }
            >
              My Cart
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {cart
                ?.totalQuantity ||
                0}{" "}
              {cart
                ?.totalQuantity ===
              1
                ? "item"
                : "items"}
            </Text>
          </View>

          {hasItems ? (
            <Pressable
              style={
                styles.clearButton
              }
              onPress={
                handleClearCart
              }
              disabled={
                clearingCart
              }
            >
              {clearingCart ? (
                <ActivityIndicator
                  size="small"
                  color="#C84E69"
                />
              ) : (
                <>
                  <Ionicons
                    name="trash-outline"
                    size={17}
                    color="#C84E69"
                  />

                  <Text
                    style={
                      styles.clearButtonText
                    }
                  >
                    Clear
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
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
          contentContainerStyle={[
            styles.scrollContent,

            !hasItems &&
              styles.emptyScrollContent,
          ]}
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
          {!hasItems ? (
            /*
             * =============================================
             * EMPTY CART
             * =============================================
             */

            <View
              style={
                styles.emptyContainer
              }
            >
              <View
                style={
                  styles.emptyIllustration
                }
              >
                <View
                  style={
                    styles.emptyCircleLarge
                  }
                />

                <View
                  style={
                    styles.emptyCircleSmall
                  }
                />

                <Ionicons
                  name="cart-outline"
                  size={72}
                  color="#D85D7A"
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Your cart is
                empty
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }
              >
                Discover beautiful
                bouquets and add
                your favorites to
                your cart.
              </Text>

              <Pressable
                style={
                  styles.shopButton
                }
                onPress={
                  goShopping
                }
              >
                <Ionicons
                  name="flower-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.shopButtonText
                  }
                >
                  Discover Flowers
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/*
               * ===========================================
               * WARNING
               * ===========================================
               */}

              {(cart
                ?.unavailableItemCount ||
                0) > 0 ? (
                <View
                  style={
                    styles.warningCard
                  }
                >
                  <View
                    style={
                      styles.warningIcon
                    }
                  >
                    <Ionicons
                      name="warning-outline"
                      size={21}
                      color="#AA7428"
                    />
                  </View>

                  <View
                    style={
                      styles.warningContent
                    }
                  >
                    <Text
                      style={
                        styles.warningTitle
                      }
                    >
                      Some items
                      are unavailable
                    </Text>

                    <Text
                      style={
                        styles.warningText
                      }
                    >
                      Remove
                      unavailable
                      products before
                      checkout.
                    </Text>
                  </View>
                </View>
              ) : null}

              {/*
               * ===========================================
               * CART ITEMS
               * ===========================================
               */}

              <View
                style={
                  styles.itemsContainer
                }
              >
                {items.map(
                  (item) => (
                    <CartItemCard
                      key={
                        item._id
                      }
                      item={
                        item
                      }
                      updating={
                        updatingItemId ===
                        item._id
                      }
                      removing={
                        removingItemId ===
                        item._id
                      }
                      onDecrease={() => {
                        if (
                          item.quantity >
                          1
                        ) {
                          void updateQuantity(
                            item,
                            item.quantity -
                              1
                          );

                          return;
                        }

                        handleRemoveItem(
                          item
                        );
                      }}
                      onIncrease={() => {
                        void updateQuantity(
                          item,
                          item.quantity +
                            1
                        );
                      }}
                      onRemove={() =>
                        handleRemoveItem(
                          item
                        )
                      }
                    />
                  )
                )}
              </View>

              {/*
               * ===========================================
               * CONTINUE SHOPPING
               * ===========================================
               */}

              <Pressable
                style={
                  styles.continueShoppingButton
                }
                onPress={
                  goShopping
                }
              >
                <Ionicons
                  name="add-circle-outline"
                  size={19}
                  color="#D85D7A"
                />

                <Text
                  style={
                    styles.continueShoppingText
                  }
                >
                  Continue Shopping
                </Text>
              </Pressable>

              {/*
               * ===========================================
               * ORDER SUMMARY
               * ===========================================
               */}

              <View
                style={
                  styles.summaryCard
                }
              >
                <View
                  style={
                    styles.summaryHeader
                  }
                >
                  <Ionicons
                    name="receipt-outline"
                    size={21}
                    color="#393939"
                  />

                  <Text
                    style={
                      styles.summaryTitle
                    }
                  >
                    Order Summary
                  </Text>
                </View>

                <View
                  style={
                    styles.summaryRow
                  }
                >
                  <Text
                    style={
                      styles.summaryLabel
                    }
                  >
                    Products
                  </Text>

                  <Text
                    style={
                      styles.summaryValue
                    }
                  >
                    {
                      cart
                        ?.itemCount
                    }
                  </Text>
                </View>

                <View
                  style={
                    styles.summaryRow
                  }
                >
                  <Text
                    style={
                      styles.summaryLabel
                    }
                  >
                    Total quantity
                  </Text>

                  <Text
                    style={
                      styles.summaryValue
                    }
                  >
                    {
                      cart
                        ?.totalQuantity
                    }
                  </Text>
                </View>

                {(cart
                  ?.unavailableItemCount ||
                  0) > 0 ? (
                  <View
                    style={
                      styles.summaryRow
                    }
                  >
                    <Text
                      style={
                        styles.unavailableSummaryLabel
                      }
                    >
                      Unavailable
                    </Text>

                    <Text
                      style={
                        styles.unavailableSummaryValue
                      }
                    >
                      {
                        cart
                          ?.unavailableItemCount
                      }
                    </Text>
                  </View>
                ) : null}

                <View
                  style={
                    styles.summaryDivider
                  }
                />

                <View
                  style={
                    styles.totalRow
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.totalLabel
                      }
                    >
                      Estimated
                      subtotal
                    </Text>

                    <Text
                      style={
                        styles.totalNote
                      }
                    >
                      Current product
                      prices
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.totalValue
                    }
                  >
                    {formatCurrency(
                      cart
                        ?.estimatedSubtotal
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.bottomSpacer
                }
              />
            </>
          )}
        </ScrollView>

        {/*
         * =================================================
         * CHECKOUT BAR
         * =================================================
         */}

        {hasItems ? (
          <View
            style={
              styles.checkoutContainer
            }
          >
            <View
              style={
                styles.checkoutPriceContainer
              }
            >
              <Text
                style={
                  styles.checkoutPriceLabel
                }
              >
                Subtotal
              </Text>

              <Text
                style={
                  styles.checkoutPrice
                }
              >
                {formatCurrency(
                  cart
                    ?.estimatedSubtotal
                )}
              </Text>
            </View>

            <Pressable
              style={[
                styles.checkoutButton,

                (cart
                  ?.availableItemCount ||
                  0) === 0 &&
                  styles.checkoutButtonDisabled,
              ]}
              onPress={
                handleCheckout
              }
              disabled={
                (cart
                  ?.availableItemCount ||
                  0) === 0
              }
            >
              <Text
                style={
                  styles.checkoutButtonText
                }
              >
                Checkout
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        ) : null}

        {/*
         * =================================================
         * BOTTOM NAV
         * =================================================
         */}

        <BottomNavigation
          onNavigate={
            navigateToTab
          }
        />
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * CART ITEM CARD
 * =========================================================
 */

type CartItemCardProps = {
  item: CartItem;

  updating: boolean;

  removing: boolean;

  onDecrease: () => void;

  onIncrease: () => void;

  onRemove: () => void;
};

function CartItemCard({
  item,
  updating,
  removing,
  onDecrease,
  onIncrease,
  onRemove,
}: CartItemCardProps) {
  const flower =
    item.flower;

  const isPurchasable =
    getItemPurchasableState(
      item
    );

  const imageUrl =
    resolveImageUrl(
      flower?.images?.[0]
    );

  const floristName =
    getFloristName(
      flower
    );

  const price =
    item.currentPrice ??
    flower?.price ??
    0;

  const lineSubtotal =
    item.lineSubtotal ??
    (isPurchasable
      ? Number(price) *
        item.quantity
      : null);

  const disabled =
    updating ||
    removing;

  return (
    <View
      style={[
        styles.itemCard,

        !isPurchasable &&
          styles.itemCardUnavailable,
      ]}
    >
      {/*
       * ===================================================
       * PRODUCT IMAGE
       * ===================================================
       */}

      <View
        style={
          styles.productImageContainer
        }
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
              color="#D8A4B1"
            />
          </View>
        )}

        {!isPurchasable ? (
          <View
            style={
              styles.unavailableOverlay
            }
          >
            <Ionicons
              name="close-circle"
              size={25}
              color="#FFFFFF"
            />
          </View>
        ) : null}
      </View>

      {/*
       * ===================================================
       * DETAILS
       * ===================================================
       */}

      <View
        style={
          styles.itemContent
        }
      >
        <View
          style={
            styles.itemTopRow
          }
        >
          <View
            style={
              styles.itemNameContainer
            }
          >
            <Text
              style={
                styles.floristName
              }
              numberOfLines={
                1
              }
            >
              {
                floristName
              }
            </Text>

            <Text
              style={
                styles.productName
              }
              numberOfLines={
                2
              }
            >
              {flower
                ?.name ||
                "Flower listing unavailable"}
            </Text>
          </View>

          <Pressable
            style={
              styles.removeIconButton
            }
            onPress={
              onRemove
            }
            disabled={
              disabled
            }
            hitSlop={
              8
            }
          >
            {removing ? (
              <ActivityIndicator
                size="small"
                color="#C84E69"
              />
            ) : (
              <Ionicons
                name="trash-outline"
                size={19}
                color="#A36D79"
              />
            )}
          </Pressable>
        </View>

        {!isPurchasable ? (
          <View
            style={
              styles.unavailableBadge
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={14}
              color="#B64F63"
            />

            <Text
              style={
                styles.unavailableBadgeText
              }
            >
              Currently
              unavailable
            </Text>
          </View>
        ) : (
          <Text
            style={
              styles.unitPrice
            }
          >
            {formatCurrency(
              price
            )}{" "}
            each
          </Text>
        )}

        <View
          style={
            styles.itemBottomRow
          }
        >
          {/*
           * =================================================
           * QUANTITY
           * =================================================
           */}

          <View
            style={[
              styles.quantityControl,

              !isPurchasable &&
                styles.quantityControlDisabled,
            ]}
          >
            <Pressable
              style={
                styles.quantityButton
              }
              onPress={
                onDecrease
              }
              disabled={
                disabled
              }
            >
              <Ionicons
                name={
                  item.quantity ===
                  1
                    ? "trash-outline"
                    : "remove"
                }
                size={17}
                color={
                  disabled
                    ? "#CFCFCF"
                    : "#555555"
                }
              />
            </Pressable>

            <View
              style={
                styles.quantityValueContainer
              }
            >
              {updating ? (
                <ActivityIndicator
                  size="small"
                  color="#D85D7A"
                />
              ) : (
                <Text
                  style={
                    styles.quantityValue
                  }
                >
                  {
                    item.quantity
                  }
                </Text>
              )}
            </View>

            <Pressable
              style={
                styles.quantityButton
              }
              onPress={
                onIncrease
              }
              disabled={
                disabled ||
                !isPurchasable
              }
            >
              <Ionicons
                name="add"
                size={18}
                color={
                  disabled ||
                  !isPurchasable
                    ? "#CFCFCF"
                    : "#555555"
                }
              />
            </Pressable>
          </View>

          {/*
           * =================================================
           * LINE SUBTOTAL
           * =================================================
           */}

          <View
            style={
              styles.lineSubtotalContainer
            }
          >
            <Text
              style={
                styles.lineSubtotalLabel
              }
            >
              Subtotal
            </Text>

            <Text
              style={[
                styles.lineSubtotal,

                !isPurchasable &&
                  styles.lineSubtotalUnavailable,
              ]}
            >
              {isPurchasable
                ? formatCurrency(
                    lineSubtotal
                  )
                : "Unavailable"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/*
 * =========================================================
 * BOTTOM NAVIGATION
 * =========================================================
 */

type BottomNavigationProps = {
  onNavigate: (
    route: string
  ) => void;
};

function BottomNavigation({
  onNavigate,
}: BottomNavigationProps) {
  return (
    <View
      style={
        styles.bottomNavigation
      }
    >
      {BOTTOM_TABS.map(
        (tab) => {
          const active =
            tab.label ===
            "Cart";

          return (
            <Pressable
              key={
                tab.label
              }
              style={
                styles.bottomTab
              }
              onPress={() =>
                onNavigate(
                  tab.route
                )
              }
            >
              <View
                style={[
                  styles.bottomIconContainer,

                  active &&
                    styles.bottomIconContainerActive,
                ]}
              >
                <Ionicons
                  name={
                    tab.icon
                  }
                  size={21}
                  color={
                    active
                      ? "#D85D7A"
                      : "#8F8F8F"
                  }
                />
              </View>

              <Text
                style={[
                  styles.bottomTabLabel,

                  active &&
                    styles.bottomTabLabelActive,
                ]}
              >
                {
                  tab.label
                }
              </Text>
            </Pressable>
          );
        }
      )}
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
      minHeight: 74,

      paddingHorizontal: 20,

      paddingTop: 13,

      paddingBottom: 12,

      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#EBE6E4",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    headerTitle: {
      fontSize: 24,

      lineHeight: 30,

      fontWeight: "800",

      color: "#292525",
    },

    headerSubtitle: {
      marginTop: 2,

      fontSize: 13,

      color: "#8C8583",
    },

    clearButton: {
      minHeight: 38,

      paddingHorizontal: 13,

      borderRadius: 12,

      backgroundColor:
        "#FFF2F5",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },

    clearButtonText: {
      fontSize: 13,

      fontWeight: "700",

      color: "#C84E69",
    },

    /*
     * SCROLL
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 16,

      paddingTop: 16,

      paddingBottom: 32,
    },

    emptyScrollContent: {
      flexGrow: 1,

      justifyContent:
        "center",
    },

    bottomSpacer: {
      height: 12,
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

      paddingHorizontal: 32,

      backgroundColor:
        "#FAF8F7",
    },

    loadingIconContainer: {
      width: 70,

      height: 70,

      borderRadius: 35,

      backgroundColor:
        "#FFF0F4",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 20,
    },

    loadingTitle: {
      marginTop: 14,

      fontSize: 18,

      fontWeight: "800",

      color: "#333030",
    },

    loadingDescription: {
      marginTop: 5,

      fontSize: 13,

      color: "#918A88",

      textAlign: "center",
    },

    /*
     * ERROR
     */

    errorContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 30,

      backgroundColor:
        "#FAF8F7",
    },

    errorIconContainer: {
      width: 78,

      height: 78,

      borderRadius: 39,

      backgroundColor:
        "#FFF0F4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    errorTitle: {
      marginTop: 18,

      fontSize: 20,

      fontWeight: "800",

      color: "#333030",

      textAlign: "center",
    },

    errorDescription: {
      marginTop: 8,

      maxWidth: 320,

      fontSize: 13,

      lineHeight: 20,

      color: "#8F8583",

      textAlign: "center",
    },

    retryButton: {
      marginTop: 22,

      height: 46,

      paddingHorizontal: 23,

      borderRadius: 14,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },

    retryButtonText: {
      fontSize: 14,

      fontWeight: "800",

      color: "#FFFFFF",
    },

    /*
     * EMPTY CART
     */

    emptyContainer: {
      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 22,

      paddingBottom: 40,
    },

    emptyIllustration: {
      width: 150,

      height: 135,

      alignItems:
        "center",

      justifyContent:
        "center",

      position:
        "relative",
    },

    emptyCircleLarge: {
      position:
        "absolute",

      width: 130,

      height: 130,

      borderRadius: 65,

      backgroundColor:
        "#FFF0F4",
    },

    emptyCircleSmall: {
      position:
        "absolute",

      right: 2,

      top: 11,

      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        "#F8D8E1",
    },

    emptyTitle: {
      marginTop: 18,

      fontSize: 22,

      fontWeight: "800",

      color: "#302C2C",
    },

    emptyDescription: {
      marginTop: 9,

      maxWidth: 290,

      fontSize: 14,

      lineHeight: 21,

      color: "#8D8583",

      textAlign: "center",
    },

    shopButton: {
      marginTop: 24,

      height: 48,

      paddingHorizontal: 22,

      borderRadius: 15,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },

    shopButtonText: {
      fontSize: 14,

      fontWeight: "800",

      color: "#FFFFFF",
    },

    /*
     * WARNING
     */

    warningCard: {
      padding: 13,

      marginBottom: 14,

      borderRadius: 14,

      backgroundColor:
        "#FFF7E9",

      borderWidth: 1,

      borderColor:
        "#F1DDBA",

      flexDirection:
        "row",

      alignItems:
        "flex-start",
    },

    warningIcon: {
      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        "#FFE9C5",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    warningContent: {
      flex: 1,

      paddingLeft: 10,
    },

    warningTitle: {
      fontSize: 13,

      fontWeight: "800",

      color: "#7C5720",
    },

    warningText: {
      marginTop: 2,

      fontSize: 12,

      lineHeight: 17,

      color: "#9B7644",
    },

    /*
     * ITEMS
     */

    itemsContainer: {
      gap: 12,
    },

    itemCard: {
      padding: 12,

      minHeight: 145,

      borderRadius: 18,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#EEE8E6",

      flexDirection:
        "row",

      shadowColor:
        "#000000",

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity:
        0.035,

      shadowRadius: 7,

      elevation: 1,
    },

    itemCardUnavailable: {
      backgroundColor:
        "#FCFAFA",

      borderColor:
        "#E9DDDF",
    },

    productImageContainer: {
      width: 108,

      height: 121,

      borderRadius: 15,

      overflow: "hidden",

      backgroundColor:
        "#F6EFEF",

      position:
        "relative",
    },

    productImage: {
      width: "100%",

      height: "100%",
    },

    productImagePlaceholder: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FAECEF",
    },

    unavailableOverlay: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        "rgba(70, 55, 58, 0.38)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    itemContent: {
      flex: 1,

      paddingLeft: 12,

      justifyContent:
        "space-between",
    },

    itemTopRow: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",
    },

    itemNameContainer: {
      flex: 1,

      paddingRight: 4,
    },

    floristName: {
      fontSize: 11,

      fontWeight: "700",

      color: "#D0627C",

      marginBottom: 3,
    },

    productName: {
      fontSize: 15,

      lineHeight: 19,

      fontWeight: "800",

      color: "#352F30",
    },

    removeIconButton: {
      width: 32,

      height: 32,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    unitPrice: {
      marginTop: 5,

      fontSize: 12,

      fontWeight: "600",

      color: "#796F6E",
    },

    unavailableBadge: {
      alignSelf:
        "flex-start",

      marginTop: 5,

      paddingVertical: 4,

      paddingHorizontal: 7,

      borderRadius: 7,

      backgroundColor:
        "#FFF0F2",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,
    },

    unavailableBadgeText: {
      fontSize: 10,

      fontWeight: "700",

      color: "#B64F63",
    },

    itemBottomRow: {
      marginTop: 10,

      flexDirection:
        "row",

      alignItems:
        "flex-end",

      justifyContent:
        "space-between",

      gap: 10,
    },

    quantityControl: {
      height: 34,

      minWidth: 103,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        "#E5DEDC",

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",
    },

    quantityControlDisabled: {
      backgroundColor:
        "#FAF8F8",
    },

    quantityButton: {
      width: 33,

      height: "100%",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    quantityValueContainer: {
      width: 35,

      height: "100%",

      borderLeftWidth: 1,

      borderRightWidth: 1,

      borderColor:
        "#EEE7E5",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    quantityValue: {
      fontSize: 13,

      fontWeight: "800",

      color: "#3B3736",
    },

    lineSubtotalContainer: {
      flex: 1,

      alignItems:
        "flex-end",
    },

    lineSubtotalLabel: {
      fontSize: 9,

      color: "#A29A98",
    },

    lineSubtotal: {
      marginTop: 1,

      fontSize: 14,

      fontWeight: "800",

      color: "#D15471",
    },

    lineSubtotalUnavailable: {
      fontSize: 11,

      color: "#B06070",
    },

    /*
     * CONTINUE SHOPPING
     */

    continueShoppingButton: {
      height: 47,

      marginTop: 14,

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        "#EBCBD3",

      backgroundColor:
        "#FFF9FA",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,
    },

    continueShoppingText: {
      fontSize: 13,

      fontWeight: "800",

      color: "#D85D7A",
    },

    /*
     * SUMMARY
     */

    summaryCard: {
      marginTop: 16,

      padding: 17,

      borderRadius: 18,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#EEE8E6",
    },

    summaryHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      marginBottom: 16,
    },

    summaryTitle: {
      fontSize: 15,

      fontWeight: "800",

      color: "#373131",
    },

    summaryRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingVertical: 5,
    },

    summaryLabel: {
      fontSize: 13,

      color: "#817876",
    },

    summaryValue: {
      fontSize: 13,

      fontWeight: "700",

      color: "#554F4D",
    },

    unavailableSummaryLabel: {
      fontSize: 13,

      color: "#B35B6B",
    },

    unavailableSummaryValue: {
      fontSize: 13,

      fontWeight: "800",

      color: "#B35B6B",
    },

    summaryDivider: {
      height: 1,

      backgroundColor:
        "#EEE8E6",

      marginVertical: 12,
    },

    totalRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },

    totalLabel: {
      fontSize: 14,

      fontWeight: "800",

      color: "#403A39",
    },

    totalNote: {
      marginTop: 2,

      fontSize: 10,

      color: "#9A9391",
    },

    totalValue: {
      fontSize: 20,

      fontWeight: "900",

      color: "#D15471",
    },

    /*
     * CHECKOUT BAR
     */

    checkoutContainer: {
      minHeight: 76,

      paddingHorizontal: 17,

      paddingVertical: 10,

      backgroundColor:
        "#FFFFFF",

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        "#E8E1DF",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 15,
    },

    checkoutPriceContainer: {
      minWidth: 105,
    },

    checkoutPriceLabel: {
      fontSize: 10,

      color: "#978F8D",
    },

    checkoutPrice: {
      marginTop: 1,

      fontSize: 18,

      fontWeight: "900",

      color: "#D15471",
    },

    checkoutButton: {
      flex: 1,

      height: 49,

      borderRadius: 15,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,
    },

    checkoutButtonDisabled: {
      backgroundColor:
        "#D5B7BF",
    },

    checkoutButtonText: {
      fontSize: 14,

      fontWeight: "800",

      color: "#FFFFFF",
    },

    /*
     * BOTTOM NAVIGATION
     */

    bottomNavigation: {
      minHeight: 66,

      paddingHorizontal: 7,

      paddingTop: 6,

      paddingBottom: 6,

      backgroundColor:
        "#FFFFFF",

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        "#E7E1DF",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-around",
    },

    bottomTab: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    bottomIconContainer: {
      width: 32,

      height: 28,

      borderRadius: 12,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    bottomIconContainerActive: {
      backgroundColor:
        "#FFF0F4",
    },

    bottomTabLabel: {
      marginTop: 1,

      fontSize: 9,

      fontWeight: "600",

      color: "#8F8F8F",
    },

    bottomTabLabelActive: {
      color: "#D85D7A",

      fontWeight: "800",
    },
  });