import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getAdminDashboard,
} from "../../services/admin";

/*
 * =========================================================
 * COLORS
 * =========================================================
 */

const COLORS = {
  purple: "#312E81",
  purpleAccent: "#5B4FCF",
  purpleLight: "#EEEAFE",

  background: "#F7F7FA",
  card: "#FFFFFF",

  text: "#18181B",
  secondaryText: "#777783",
  mutedText: "#A1A1AA",

  border: "#ECECF1",

  green: "#4E9A72",
  greenBackground: "#EAF7EF",

  red: "#D75C73",
  redBackground: "#FDECEF",

  yellow: "#B9892D",
  yellowBackground: "#FFF5D9",

  blue: "#4C7DC0",
  blueBackground: "#EAF2FC",
};

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type VerificationCounts = {
  pendingSellers: number;
  pendingRiders: number;
  totalPending: number;
};

/*
 * =========================================================
 * VERIFICATION CARD
 * =========================================================
 */

type VerificationCardProps = {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];

  title: string;
  description: string;
  count: number;

  type: "seller" | "rider";

  onPress: () => void;
};

function VerificationCard({
  icon,
  title,
  description,
  count,
  type,
  onPress,
}: VerificationCardProps) {
  const isSeller =
    type === "seller";

  const accentColor =
    isSeller
      ? COLORS.purpleAccent
      : COLORS.blue;

  const iconBackground =
    isSeller
      ? COLORS.purpleLight
      : COLORS.blueBackground;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.verificationCard,

        pressed &&
          styles.verificationCardPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.verificationIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={25}
          color={accentColor}
        />
      </View>

      <View
        style={
          styles.verificationContent
        }
      >
        <View
          style={
            styles.verificationTitleRow
          }
        >
          <Text
            style={
              styles.verificationTitle
            }
          >
            {title}
          </Text>

          <View
            style={[
              styles.countBadge,

              count === 0 &&
                styles.countBadgeEmpty,
            ]}
          >
            <Text
              style={[
                styles.countBadgeText,

                count === 0 &&
                  styles.countBadgeTextEmpty,
              ]}
            >
              {count}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.verificationDescription
          }
        >
          {description}
        </Text>

        <View
          style={
            styles.verificationFooter
          }
        >
          <View
            style={
              styles.pendingInfo
            }
          >
            <Ionicons
              name={
                count > 0
                  ? "time-outline"
                  : "checkmark-circle-outline"
              }
              size={14}
              color={
                count > 0
                  ? COLORS.yellow
                  : COLORS.green
              }
            />

            <Text
              style={[
                styles.pendingText,

                {
                  color:
                    count > 0
                      ? COLORS.yellow
                      : COLORS.green,
                },
              ]}
            >
              {count > 0
                ? `${count} pending ${
                    count === 1
                      ? "application"
                      : "applications"
                  }`
                : "No pending applications"}
            </Text>
          </View>

          <View
            style={
              styles.openButton
            }
          >
            <Text
              style={
                styles.openButtonText
              }
            >
              Review
            </Text>

            <Ionicons
              name="chevron-forward"
              size={15}
              color={
                COLORS.purpleAccent
              }
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/*
 * =========================================================
 * MAIN SCREEN
 * =========================================================
 */

export default function AdminVerificationsScreen() {
  const router =
    useRouter();

  const [
    verifications,
    setVerifications,
  ] =
    useState<VerificationCounts>({
      pendingSellers: 0,
      pendingRiders: 0,
      totalPending: 0,
    });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * =======================================================
   * LOAD VERIFICATION COUNTS
   * =======================================================
   */

  const loadVerifications =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const dashboard =
            await getAdminDashboard();

          setVerifications({
            pendingSellers:
              dashboard
                ?.verifications
                ?.pendingSellers ??
              0,

            pendingRiders:
              dashboard
                ?.verifications
                ?.pendingRiders ??
              0,

            totalPending:
              dashboard
                ?.verifications
                ?.totalPending ??
              0,
          });
        } catch (err) {
          console.error(
            "Failed to load verification data:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load verification data."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  /*
   * =======================================================
   * REFRESH WHEN SCREEN IS OPENED
   * =======================================================
   */

  useFocusEffect(
    useCallback(() => {
      void loadVerifications();
    }, [loadVerifications])
  );

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (loading) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <View
          style={
            styles.loadingIcon
          }
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.purpleAccent
            }
          />
        </View>

        <Text
          style={
            styles.loadingTitle
          }
        >
          Verification Center
        </Text>

        <Text
          style={
            styles.loadingText
          }
        >
          Loading pending
          applications...
        </Text>
      </View>
    );
  }

  /*
   * =======================================================
   * SCREEN
   * =======================================================
   */

  return (
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        style={
          styles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() =>
              void loadVerifications(
                true
              )
            }
            tintColor={
              COLORS.purpleAccent
            }
            colors={[
              COLORS.purpleAccent,
            ]}
          />
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
          <View
            style={
              styles.headerTop
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
                name="arrow-back"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              style={
                styles.headerButton
              }
              onPress={() =>
                void loadVerifications(
                  true
                )
              }
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <Text
            style={
              styles.headerEyebrow
            }
          >
            ADMIN REVIEW
          </Text>

          <Text
            style={
              styles.headerTitle
            }
          >
            Verification Center
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Review seller and rider
            applications before
            granting access to their
            platform roles.
          </Text>

          <View
            style={
              styles.headerSummary
            }
          >
            <View
              style={
                styles.headerSummaryIcon
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#FFFFFF"
              />
            </View>

            <View
              style={
                styles.headerSummaryContent
              }
            >
              <Text
                style={
                  styles.headerSummaryLabel
                }
              >
                Pending Verifications
              </Text>

              <Text
                style={
                  styles.headerSummaryDescription
                }
              >
                Applications waiting
                for Admin review
              </Text>
            </View>

            <Text
              style={
                styles.headerSummaryValue
              }
            >
              {
                verifications.totalPending
              }
            </Text>
          </View>
        </View>

        {/*
         * =================================================
         * CONTENT
         * =================================================
         */}

        <View
          style={
            styles.body
          }
        >
          {error ? (
            <View
              style={
                styles.errorCard
              }
            >
              <View
                style={
                  styles.errorIcon
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={
                    COLORS.red
                  }
                />
              </View>

              <View
                style={
                  styles.errorContent
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Unable to refresh
                </Text>

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {error}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  void loadVerifications()
                }
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={
                    COLORS.red
                  }
                />
              </Pressable>
            </View>
          ) : null}

          {/*
           * ===============================================
           * OVERVIEW
           * ===============================================
           */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              APPLICATION REVIEW
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Verification Types
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Select the type of
              application you want to
              review.
            </Text>
          </View>

          {/*
           * ===============================================
           * SELLER
           * ===============================================
           */}

          <VerificationCard
            icon="storefront-outline"
            title="Seller Verification"
            description="Review florist and seller applications, shop information, and submitted verification details."
            count={
              verifications.pendingSellers
            }
            type="seller"
            onPress={() =>
              router.push(
                "/(admin)/admin-seller-verification"
              )
            }
          />

          {/*
           * ===============================================
           * RIDER
           * ===============================================
           */}

          <VerificationCard
            icon="bicycle-outline"
            title="Rider Verification"
            description="Review rider applications and submitted information before approving delivery access."
            count={
              verifications.pendingRiders
            }
            type="rider"
            onPress={() =>
              router.push(
                "/(admin)/admin-rider-verification"
              )
            }
          />

          {/*
           * ===============================================
           * STATUS SUMMARY
           * ===============================================
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
              <View
                style={
                  styles.summaryHeaderIcon
                }
              >
                <Ionicons
                  name="analytics-outline"
                  size={19}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </View>

              <View>
                <Text
                  style={
                    styles.summaryTitle
                  }
                >
                  Review Summary
                </Text>

                <Text
                  style={
                    styles.summarySubtitle
                  }
                >
                  Current pending
                  applications
                </Text>
              </View>
            </View>

            <View
              style={
                styles.summaryDivider
              }
            />

            <View
              style={
                styles.summaryRow
              }
            >
              <View
                style={
                  styles.summaryItem
                }
              >
                <View
                  style={[
                    styles.summaryItemIcon,
                    {
                      backgroundColor:
                        COLORS.purpleLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={18}
                    color={
                      COLORS.purpleAccent
                    }
                  />
                </View>

                <Text
                  style={
                    styles.summaryNumber
                  }
                >
                  {
                    verifications.pendingSellers
                  }
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Sellers
                </Text>
              </View>

              <View
                style={
                  styles.verticalDivider
                }
              />

              <View
                style={
                  styles.summaryItem
                }
              >
                <View
                  style={[
                    styles.summaryItemIcon,
                    {
                      backgroundColor:
                        COLORS.blueBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name="bicycle-outline"
                    size={18}
                    color={
                      COLORS.blue
                    }
                  />
                </View>

                <Text
                  style={
                    styles.summaryNumber
                  }
                >
                  {
                    verifications.pendingRiders
                  }
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Riders
                </Text>
              </View>

              <View
                style={
                  styles.verticalDivider
                }
              />

              <View
                style={
                  styles.summaryItem
                }
              >
                <View
                  style={[
                    styles.summaryItemIcon,
                    {
                      backgroundColor:
                        COLORS.yellowBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={
                      COLORS.yellow
                    }
                  />
                </View>

                <Text
                  style={
                    styles.summaryNumber
                  }
                >
                  {
                    verifications.totalPending
                  }
                </Text>

                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Total
                </Text>
              </View>
            </View>
          </View>

          {/*
           * ===============================================
           * INFORMATION
           * ===============================================
           */}

          <View
            style={
              styles.noticeCard
            }
          >
            <View
              style={
                styles.noticeIcon
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={
                  COLORS.purpleAccent
                }
              />
            </View>

            <View
              style={
                styles.noticeContent
              }
            >
              <Text
                style={
                  styles.noticeTitle
                }
              >
                Verification Review
              </Text>

              <Text
                style={
                  styles.noticeText
                }
              >
                Open an application
                type to review its
                pending applicants.
                Approval or rejection
                is completed inside
                the corresponding
                verification page.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    container: {
      flex: 1,

      backgroundColor:
        COLORS.background,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 30,
    },

    /*
     * =====================================================
     * LOADING
     * =====================================================
     */

    centerScreen: {
      flex: 1,

      alignItems: "center",
      justifyContent:
        "center",

      paddingHorizontal: 30,

      backgroundColor:
        COLORS.background,
    },

    loadingIcon: {
      width: 70,
      height: 70,

      borderRadius: 22,

      alignItems: "center",
      justifyContent:
        "center",

      backgroundColor:
        COLORS.purpleLight,
    },

    loadingTitle: {
      marginTop: 17,

      fontSize: 18,
      fontWeight: "800",

      color: COLORS.text,
    },

    loadingText: {
      marginTop: 6,

      fontSize: 12,

      color:
        COLORS.secondaryText,
    },

    /*
     * =====================================================
     * HEADER
     * =====================================================
     */

    header: {
      paddingTop: 52,
      paddingHorizontal: 19,
      paddingBottom: 23,

      borderBottomLeftRadius:
        26,
      borderBottomRightRadius:
        26,

      backgroundColor:
        COLORS.purple,
    },

    headerTop: {
      marginBottom: 21,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    headerButton: {
      width: 40,
      height: 40,

      borderRadius: 13,

      alignItems: "center",
      justifyContent:
        "center",

      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    headerEyebrow: {
      fontSize: 9,
      fontWeight: "800",

      letterSpacing: 1.2,

      color: "#C8C5F2",
    },

    headerTitle: {
      marginTop: 5,

      fontSize: 27,
      fontWeight: "800",

      color: "#FFFFFF",
    },

    headerSubtitle: {
      marginTop: 6,

      maxWidth: 330,

      fontSize: 11,
      lineHeight: 17,

      color: "#D6D4F4",
    },

    headerSummary: {
      marginTop: 18,

      padding: 14,

      borderRadius: 17,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    headerSummaryIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      alignItems: "center",
      justifyContent:
        "center",

      marginRight: 11,

      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    headerSummaryContent: {
      flex: 1,
    },

    headerSummaryLabel: {
      fontSize: 11,
      fontWeight: "800",

      color: "#FFFFFF",
    },

    headerSummaryDescription: {
      marginTop: 3,

      fontSize: 9,

      color: "#C8C5F2",
    },

    headerSummaryValue: {
      marginLeft: 10,

      fontSize: 26,
      fontWeight: "800",

      color: "#FFFFFF",
    },

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    body: {
      paddingTop: 21,
      paddingHorizontal: 17,
    },

    sectionHeader: {
      marginBottom: 14,
    },

    sectionEyebrow: {
      fontSize: 8,
      fontWeight: "800",

      letterSpacing: 1.1,

      color:
        COLORS.purpleAccent,
    },

    sectionTitle: {
      marginTop: 4,

      fontSize: 20,
      fontWeight: "800",

      color: COLORS.text,
    },

    sectionSubtitle: {
      marginTop: 5,

      fontSize: 11,
      lineHeight: 16,

      color:
        COLORS.secondaryText,
    },

    /*
     * =====================================================
     * ERROR
     * =====================================================
     */

    errorCard: {
      marginBottom: 16,

      padding: 13,

      borderRadius: 15,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor:
        COLORS.redBackground,
    },

    errorIcon: {
      width: 37,
      height: 37,

      borderRadius: 12,

      alignItems: "center",
      justifyContent:
        "center",

      marginRight: 10,

      backgroundColor:
        "#FFFFFF",
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      fontSize: 11,
      fontWeight: "800",

      color: COLORS.red,
    },

    errorText: {
      marginTop: 2,

      fontSize: 9,
      lineHeight: 13,

      color:
        COLORS.secondaryText,
    },

    /*
     * =====================================================
     * VERIFICATION CARD
     * =====================================================
     */

    verificationCard: {
      marginBottom: 13,

      padding: 15,

      borderRadius: 18,

      flexDirection: "row",
      alignItems:
        "flex-start",

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    verificationCardPressed: {
      opacity: 0.82,
    },

    verificationIcon: {
      width: 49,
      height: 49,

      borderRadius: 15,

      alignItems: "center",
      justifyContent:
        "center",

      marginRight: 13,
    },

    verificationContent: {
      flex: 1,
    },

    verificationTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      gap: 8,
    },

    verificationTitle: {
      flex: 1,

      fontSize: 14,
      fontWeight: "800",

      color: COLORS.text,
    },

    verificationDescription: {
      marginTop: 5,

      fontSize: 9,
      lineHeight: 14,

      color:
        COLORS.secondaryText,
    },

    countBadge: {
      minWidth: 30,
      height: 30,

      paddingHorizontal: 7,

      borderRadius: 10,

      alignItems: "center",
      justifyContent:
        "center",

      backgroundColor:
        COLORS.yellowBackground,
    },

    countBadgeEmpty: {
      backgroundColor:
        COLORS.greenBackground,
    },

    countBadgeText: {
      fontSize: 11,
      fontWeight: "800",

      color: COLORS.yellow,
    },

    countBadgeTextEmpty: {
      color: COLORS.green,
    },

    verificationFooter: {
      marginTop: 13,
      paddingTop: 11,

      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,

      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      gap: 8,
    },

    pendingInfo: {
      flex: 1,

      flexDirection: "row",
      alignItems: "center",

      gap: 5,
    },

    pendingText: {
      flex: 1,

      fontSize: 9,
      fontWeight: "700",
    },

    openButton: {
      flexDirection: "row",
      alignItems: "center",

      gap: 2,
    },

    openButtonText: {
      fontSize: 9,
      fontWeight: "800",

      color:
        COLORS.purpleAccent,
    },

    /*
     * =====================================================
     * SUMMARY
     * =====================================================
     */

    summaryCard: {
      marginTop: 5,
      marginBottom: 14,

      padding: 16,

      borderRadius: 18,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    summaryHeaderIcon: {
      width: 38,
      height: 38,

      borderRadius: 12,

      alignItems: "center",
      justifyContent:
        "center",

      marginRight: 10,

      backgroundColor:
        COLORS.purpleLight,
    },

    summaryTitle: {
      fontSize: 12,
      fontWeight: "800",

      color: COLORS.text,
    },

    summarySubtitle: {
      marginTop: 2,

      fontSize: 9,

      color:
        COLORS.secondaryText,
    },

    summaryDivider: {
      height: 1,

      marginVertical: 15,

      backgroundColor:
        COLORS.border,
    },

    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    summaryItem: {
      flex: 1,

      alignItems: "center",
    },

    summaryItemIcon: {
      width: 35,
      height: 35,

      borderRadius: 11,

      alignItems: "center",
      justifyContent:
        "center",

      marginBottom: 7,
    },

    summaryNumber: {
      fontSize: 18,
      fontWeight: "800",

      color: COLORS.text,
    },

    summaryLabel: {
      marginTop: 2,

      fontSize: 9,

      color:
        COLORS.secondaryText,
    },

    verticalDivider: {
      width: 1,
      height: 62,

      backgroundColor:
        COLORS.border,
    },

    /*
     * =====================================================
     * NOTICE
     * =====================================================
     */

    noticeCard: {
      padding: 14,

      borderRadius: 16,

      flexDirection: "row",
      alignItems:
        "flex-start",

      backgroundColor:
        COLORS.purpleLight,
    },

    noticeIcon: {
      width: 37,
      height: 37,

      borderRadius: 12,

      alignItems: "center",
      justifyContent:
        "center",

      marginRight: 10,

      backgroundColor:
        "#FFFFFF",
    },

    noticeContent: {
      flex: 1,
    },

    noticeTitle: {
      fontSize: 11,
      fontWeight: "800",

      color: COLORS.purple,
    },

    noticeText: {
      marginTop: 4,

      fontSize: 9,
      lineHeight: 14,

      color:
        COLORS.secondaryText,
    },
  });