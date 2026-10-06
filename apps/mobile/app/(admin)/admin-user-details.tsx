import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, {
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AdminManagedUser,
  AdminUserAccountStatus,
  getAdminDisplayStatus,
  getAdminUserById,
  updateAdminUserStatus,
} from "../../services/admin";

import { ScreenLoader } from '../../components/ui/state-views';

const COLORS = {
  purple: "#312E81",
  purpleDark: "#29266D",
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
};

/* =========================================================
 * HELPERS
 * =======================================================*/

function getFullName(
  user: AdminManagedUser
) {
  return (
    `${user.firstName || ""} ${
      user.lastName || ""
    }`.trim() || "Unnamed User"
  );
}

function getInitials(
  user: AdminManagedUser
) {
  const first =
    user.firstName
      ?.trim()
      .charAt(0) || "";

  const last =
    user.lastName
      ?.trim()
      .charAt(0) || "";

  return (
    `${first}${last}`.toUpperCase() ||
    "U"
  );
}

function formatText(
  value?: string | null
) {
  if (!value) {
    return "Not available";
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

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
}

function getStatusStyle(
  status: AdminUserAccountStatus
) {
  switch (status) {
    case "active":
      return {
        backgroundColor:
          COLORS.greenBackground,
        textColor: COLORS.green,
        icon:
          "checkmark-circle-outline" as const,
      };

    case "suspended":
    case "banned":
      return {
        backgroundColor:
          COLORS.redBackground,
        textColor: COLORS.red,
        icon: "ban-outline" as const,
      };

    default:
      return {
        backgroundColor: "#F1F1F4",
        textColor: "#777783",
        icon:
          "pause-circle-outline" as const,
      };
  }
}

function getRoleStyle(
  role: AdminManagedUser["role"]
) {
  switch (role) {
    case "seller":
      return {
        backgroundColor: "#EAF7EF",
        color: "#4E9A72",
        icon:
          "storefront-outline" as const,
      };

    case "rider":
      return {
        backgroundColor: "#FFF5D9",
        color: "#B9892D",
        icon:
          "bicycle-outline" as const,
      };

    case "admin":
      return {
        backgroundColor: "#FCEAF1",
        color: "#D65A8A",
        icon:
          "shield-outline" as const,
      };

    default:
      return {
        backgroundColor:
          COLORS.purpleLight,
        color:
          COLORS.purpleAccent,
        icon:
          "person-outline" as const,
      };
  }
}

/* =========================================================
 * SCREEN
 * =======================================================*/

export default function AdminUserDetailsScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      userId?: string | string[];
    }>();

  const userId =
    Array.isArray(params.userId)
      ? params.userId[0]
      : params.userId;

  const [
    user,
    setUser,
  ] =
    useState<AdminManagedUser | null>(
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
    error,
    setError,
  ] =
    useState<string | null>(null);

  const [
    updating,
    setUpdating,
  ] = useState(false);

  /* =======================================================
   * LOAD USER
   * =====================================================*/

  const loadUser =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (!userId) {
          setError(
            "User ID is missing."
          );

          setLoading(false);
          setRefreshing(false);
          return;
        }

        try {
          if (showLoader) {
            setLoading(true);
          }

          setError(null);

          const data =
            await getAdminUserById(
              userId
            );

          setUser(data);
        } catch (err) {
          console.error(
            "Failed to load user:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load user details."
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }

          setRefreshing(false);
        }
      },
      [userId]
    );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchUser =
        async () => {
          if (!userId) {
            if (active) {
              setError(
                "User ID is missing."
              );

              setLoading(false);
            }

            return;
          }

          try {
            const data =
              await getAdminUserById(
                userId
              );

            if (!active) {
              return;
            }

            setUser(data);
            setError(null);
          } catch (err) {
            console.error(
              "Failed to load user:",
              err
            );

            if (!active) {
              return;
            }

            setError(
              err instanceof Error
                ? err.message
                : "Unable to load user details."
            );
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        };

      void fetchUser();

      return () => {
        active = false;
      };
    }, [userId])
  );

  const handleRefresh =
    useCallback(() => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);
      void loadUser(false);
    }, [
      loadUser,
      refreshing,
    ]);

  /* =======================================================
   * UPDATE STATUS
   * =====================================================*/

  const updateStatus =
    useCallback(
      async (
        status:
          AdminUserAccountStatus
      ) => {
        if (
          !userId ||
          !user ||
          updating
        ) {
          return;
        }

        try {
          setUpdating(true);

          const updated =
            await updateAdminUserStatus(
              userId,
              status
            );

          setUser(updated);

          Alert.alert(
            "Account Updated",
            `The account is now ${status}.`
          );
        } catch (err) {
          console.error(
            "Failed to update user status:",
            err
          );

          Alert.alert(
            "Unable to Update Account",
            err instanceof Error
              ? err.message
              : "The account status could not be updated."
          );
        } finally {
          setUpdating(false);
        }
      },
      [
        userId,
        user,
        updating,
      ]
    );

  /* =======================================================
   * ACTION CONFIRMATIONS
   * =====================================================*/

  const confirmSuspend =
    useCallback(() => {
      if (
        !user ||
        updating
      ) {
        return;
      }

      Alert.alert(
        "Suspend Account",
        `Suspend ${getFullName(
          user
        )}'s account? They will not be able to log in while the account is suspended.`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Suspend",
            style: "destructive",
            onPress: () =>
              void updateStatus(
                "suspended"
              ),
          },
        ]
      );
    }, [
      user,
      updating,
      updateStatus,
    ]);

  const confirmInactive =
    useCallback(() => {
      if (
        !user ||
        updating
      ) {
        return;
      }

      Alert.alert(
        "Deactivate Account",
        `Set ${getFullName(
          user
        )}'s account to inactive?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Set Inactive",
            onPress: () =>
              void updateStatus(
                "inactive"
              ),
          },
        ]
      );
    }, [
      user,
      updating,
      updateStatus,
    ]);

  const confirmActivate =
    useCallback(() => {
      if (
        !user ||
        updating
      ) {
        return;
      }

      Alert.alert(
        "Activate Account",
        `Reactivate ${getFullName(
          user
        )}'s account?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Activate",
            onPress: () =>
              void updateStatus(
                "active"
              ),
          },
        ]
      );
    }, [
      user,
      updating,
      updateStatus,
    ]);

  /* =======================================================
   * LOADING
   * =====================================================*/

  if (loading) {
    return (
      <ScreenLoader
        role="admin"
        message="Loading user..."
      />
    );
  }

  /* =======================================================
   * ERROR
   * =====================================================*/

  if (error || !user) {
    return (
      <View
        style={
          styles.errorPage
        }
      >
        <View
          style={
            styles.errorIcon
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={
              COLORS.red
            }
          />
        </View>

        <Text
          style={
            styles.errorPageTitle
          }
        >
          Unable to load user
        </Text>

        <Text
          style={
            styles.errorPageText
          }
        >
          {error ||
            "User information is unavailable."}
        </Text>

        <Pressable
          style={
            styles.retryButton
          }
          onPress={() =>
            void loadUser()
          }
        >
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
        >
          <Text
            style={
              styles.backText
            }
          >
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * Same status as the Users list (unapproved Sellers /
   * Riders show as pending).
   */
  const displayStatus =
    getAdminDisplayStatus(user);

  const statusStyle =
    displayStatus === "pending" || displayStatus === "rejected"
      ? {
          backgroundColor: "#FFF4DA",
          textColor: "#B7801E",
          icon: "time-outline" as const,
        }
      : getStatusStyle(
          user.accountStatus
        );

  const roleStyle =
    getRoleStyle(
      user.role
    );

  const isAdmin =
    user.role === "admin";

  /* =======================================================
   * UI
   * =====================================================*/

  return (
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        style={
          styles.mainScroll
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* PURPLE HEADER */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerDecoration
            }
          />

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
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            <View
              style={
                styles.headerContent
              }
            >
              <Text
                style={
                  styles.headerEyebrow
                }
              >
                USER MANAGEMENT
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                User Details
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Account information
                and controls
              </Text>
            </View>

            <Pressable
              style={[
                styles.headerButton,
                refreshing &&
                  styles.headerButtonDisabled,
              ]}
              onPress={
                handleRefresh
              }
              disabled={
                refreshing
              }
            >
              {refreshing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="refresh"
                  size={19}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          </View>

          {/* PROFILE */}

          <View
            style={
              styles.profileHeader
            }
          >
            <View
              style={
                styles.avatar
              }
            >
              <Text
                style={
                  styles.avatarText
                }
              >
                {getInitials(
                  user
                )}
              </Text>
            </View>

            <View
              style={
                styles.profileInfo
              }
            >
              <Text
                style={
                  styles.userName
                }
                numberOfLines={1}
              >
                {getFullName(
                  user
                )}
              </Text>

              <Text
                style={
                  styles.userEmail
                }
                numberOfLines={1}
              >
                {user.email}
              </Text>

              <View
                style={
                  styles.badges
                }
              >
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        roleStyle.backgroundColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      roleStyle.icon
                    }
                    size={11}
                    color={
                      roleStyle.color
                    }
                  />

                  <Text
                    style={[
                      styles.roleText,
                      {
                        color:
                          roleStyle.color,
                      },
                    ]}
                  >
                    {formatText(
                      user.role
                    )}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        statusStyle.backgroundColor,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      statusStyle.icon
                    }
                    size={11}
                    color={
                      statusStyle.textColor
                    }
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          statusStyle.textColor,
                      },
                    ]}
                  >
                    {formatText(
                      displayStatus
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* LIGHT BODY */}

        <View
          style={
            styles.body
          }
        >
          {/* ACCOUNT INFO */}

          <SectionHeading
            title="Account Information"
            subtitle="Personal and account details"
          />

          <View
            style={
              styles.infoCard
            }
          >
            <InfoRow
              icon="person-outline"
              label="Full Name"
              value={getFullName(
                user
              )}
            />

            <InfoRow
              icon="mail-outline"
              label="Email Address"
              value={
                user.email
              }
            />

            <InfoRow
              icon="call-outline"
              label="Phone Number"
              value={
                user.phoneNumber ||
                "Not available"
              }
            />

            <InfoRow
              icon="people-outline"
              label="Role"
              value={formatText(
                user.role
              )}
              last
            />
          </View>

          {/* VERIFICATION */}

          <SectionHeading
            title="Verification"
            subtitle="Account verification status"
          />

          <View
            style={
              styles.infoCard
            }
          >
            <InfoRow
              icon="shield-checkmark-outline"
              label="Verification Status"
              value={formatText(
                user.verificationStatus
              )}
              last
            />
          </View>

          {/* ACTIVITY */}

          <SectionHeading
            title="Account Activity"
            subtitle="Recent account information"
          />

          <View
            style={
              styles.infoCard
            }
          >
            <InfoRow
              icon="calendar-outline"
              label="Account Created"
              value={formatDateTime(
                user.createdAt
              )}
            />

            <InfoRow
              icon="time-outline"
              label="Last Login"
              value={
                user.lastLoginAt
                  ? formatDateTime(
                      user.lastLoginAt
                    )
                  : "Never"
              }
            />

            <InfoRow
              icon="refresh-outline"
              label="Last Updated"
              value={formatDateTime(
                user.updatedAt
              )}
              last
            />
          </View>

          {/* ACCOUNT CONTROL */}

          <SectionHeading
            title="Account Control"
            subtitle="Manage account access"
          />

          {isAdmin ? (
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
                  name="shield-outline"
                  size={20}
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
                  Admin Account
                </Text>

                <Text
                  style={
                    styles.noticeText
                  }
                >
                  Admin accounts
                  cannot be suspended
                  or deactivated from
                  User Management.
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={
                styles.controlCard
              }
            >
              <Text
                style={
                  styles.controlDescription
                }
              >
                Changing the account
                status controls whether
                this user can sign in
                to FLOGRAM.
              </Text>

              {user.accountStatus !==
              "active" ? (
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.activateButton,
                    updating &&
                      styles.actionButtonDisabled,
                  ]}
                  disabled={
                    updating
                  }
                  onPress={
                    confirmActivate
                  }
                >
                  {updating ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={17}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.activateButtonText
                        }
                      >
                        Activate
                        Account
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              {user.accountStatus !==
              "inactive" ? (
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.inactiveButton,
                    updating &&
                      styles.actionButtonDisabled,
                  ]}
                  disabled={
                    updating
                  }
                  onPress={
                    confirmInactive
                  }
                >
                  <Ionicons
                    name="pause-circle-outline"
                    size={17}
                    color={
                      COLORS.yellow
                    }
                  />

                  <Text
                    style={
                      styles.inactiveButtonText
                    }
                  >
                    Set as Inactive
                  </Text>
                </Pressable>
              ) : null}

              {user.accountStatus !==
              "suspended" ? (
                <Pressable
                  style={[
                    styles.actionButton,
                    styles.suspendButton,
                    updating &&
                      styles.actionButtonDisabled,
                  ]}
                  disabled={
                    updating
                  }
                  onPress={
                    confirmSuspend
                  }
                >
                  <Ionicons
                    name="ban-outline"
                    size={17}
                    color={
                      COLORS.red
                    }
                  />

                  <Text
                    style={
                      styles.suspendButtonText
                    }
                  >
                    Suspend Account
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {user.role !== "admin" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/(admin)/admin-violations",
                  params: {
                    userId,
                    userName: getFullName(user),
                    userRole: user.role,
                  },
                } as never)
              }
              style={styles.violationButton}
            >
              <Ionicons
                name="warning-outline"
                size={17}
                color="#B45309"
              />

              <Text style={styles.violationButtonText}>
                Policy Violations & Penalties
              </Text>
            </Pressable>
          ) : null}

          <View
            style={
              styles.bottomSpace
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* =========================================================
 * COMPONENTS
 * =======================================================*/

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View
      style={
        styles.sectionHeading
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last &&
          styles.infoRowLast,
      ]}
    >
      <View
        style={
          styles.infoLeft
        }
      >
        <View
          style={
            styles.infoIcon
          }
        >
          <Ionicons
            name={icon}
            size={16}
            color={
              COLORS.purpleAccent
            }
          />
        </View>

        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>
      </View>

      <Text
        style={
          styles.infoValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
 * STYLES
 * =======================================================*/

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    mainScroll: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 0,
    },

    /* HEADER */

    header: {
      backgroundColor:
        COLORS.purple,
      paddingHorizontal: 18,
      paddingTop: 54,
      paddingBottom: 22,
      overflow: "hidden",
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
    },

    headerDecoration: {
      position: "absolute",
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor:
        "rgba(255,255,255,0.035)",
      right: -75,
      top: -90,
    },

    headerTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    headerButton: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor:
        "rgba(255,255,255,0.09)",
      alignItems: "center",
      justifyContent:
        "center",
    },

    headerButtonDisabled: {
      opacity: 0.8,
    },

    headerContent: {
      flex: 1,
      paddingHorizontal: 12,
    },

    headerEyebrow: {
      color: "#C9C5F5",
      fontSize: 8,
      fontWeight: "700",
      letterSpacing: 1,
    },

    headerTitle: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "800",
      marginTop: 2,
    },

    headerSubtitle: {
      color: "#D4D2EC",
      fontSize: 8,
      marginTop: 2,
    },

    /* PROFILE HEADER */

    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      backgroundColor:
        "rgba(255,255,255,0.10)",
      borderRadius: 14,
      padding: 13,
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 17,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    avatarText: {
      color:
        COLORS.purpleAccent,
      fontSize: 17,
      fontWeight: "800",
    },

    profileInfo: {
      flex: 1,
    },

    userName: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800",
    },

    userEmail: {
      color: "#D7D5EC",
      fontSize: 9,
      marginTop: 3,
    },

    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 8,
    },

    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      gap: 4,
    },

    roleText: {
      fontSize: 8,
      fontWeight: "800",
    },

    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      gap: 4,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "800",
    },

    /* BODY */

    body: {
      backgroundColor:
        COLORS.background,
      paddingHorizontal: 15,
      paddingTop: 17,
    },

    sectionHeading: {
      marginBottom: 8,
      marginLeft: 2,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: "800",
    },

    sectionSubtitle: {
      color:
        COLORS.mutedText,
      fontSize: 8,
      marginTop: 2,
    },

    /* INFO CARD */

    infoCard: {
      backgroundColor:
        COLORS.card,
      borderRadius: 14,
      paddingHorizontal: 13,
      marginBottom: 18,
      borderWidth: 1,
      borderColor:
        "#F0F0F3",

      shadowColor:
        "#000000",
      shadowOpacity: 0.035,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 1,
    },

    infoRow: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,
      paddingVertical: 9,
    },

    infoRowLast: {
      borderBottomWidth: 0,
    },

    infoLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 10,
    },

    infoIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor:
        COLORS.purpleLight,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 9,
    },

    infoLabel: {
      color:
        COLORS.secondaryText,
      fontSize: 9,
    },

    infoValue: {
      color: COLORS.text,
      fontSize: 9,
      fontWeight: "600",
      textAlign: "right",
      maxWidth: "55%",
    },

    /* ADMIN NOTICE */

    noticeCard: {
      flexDirection: "row",
      backgroundColor:
        COLORS.purpleLight,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor:
        "#DDD7FB",
    },

    noticeIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    noticeContent: {
      flex: 1,
      marginLeft: 10,
    },

    noticeTitle: {
      color:
        COLORS.purpleAccent,
      fontSize: 10,
      fontWeight: "800",
    },

    noticeText: {
      color: "#716B8E",
      fontSize: 9,
      lineHeight: 15,
      marginTop: 3,
    },

    /* ACCOUNT CONTROL */

    controlCard: {
      backgroundColor:
        COLORS.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor:
        "#F0F0F3",

      shadowColor:
        "#000000",
      shadowOpacity: 0.035,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 1,
    },

    controlDescription: {
      color:
        COLORS.secondaryText,
      fontSize: 9,
      lineHeight: 15,
      marginBottom: 12,
    },

    actionButton: {
      height: 43,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
      marginBottom: 8,
    },

    actionButtonDisabled: {
      opacity: 0.65,
    },

    activateButton: {
      backgroundColor:
        COLORS.green,
    },

    activateButtonText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
    },

    inactiveButton: {
      backgroundColor:
        COLORS.yellowBackground,
      borderWidth: 1,
      borderColor:
        "#F2E4B5",
    },

    inactiveButtonText: {
      color:
        COLORS.yellow,
      fontSize: 10,
      fontWeight: "800",
    },

    suspendButton: {
      backgroundColor:
        COLORS.redBackground,
      borderWidth: 1,
      borderColor:
        "#F5D4DC",
    },

    suspendButtonText: {
      color: COLORS.red,
      fontSize: 10,
      fontWeight: "800",
    },

    /* LOADING */

    loadingContainer: {
      flex: 1,
      backgroundColor:
        COLORS.background,
      justifyContent:
        "center",
      alignItems: "center",
    },

    loadingText: {
      color:
        COLORS.secondaryText,
      fontSize: 10,
      marginTop: 10,
    },

    /* ERROR */

    errorPage: {
      flex: 1,
      backgroundColor:
        COLORS.background,
      justifyContent:
        "center",
      alignItems: "center",
      paddingHorizontal: 30,
    },

    errorIcon: {
      width: 62,
      height: 62,
      borderRadius: 20,
      backgroundColor:
        COLORS.redBackground,
      alignItems: "center",
      justifyContent:
        "center",
    },

    errorPageTitle: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 13,
    },

    errorPageText: {
      color:
        COLORS.secondaryText,
      fontSize: 10,
      lineHeight: 16,
      textAlign: "center",
      marginTop: 5,
    },

    retryButton: {
      backgroundColor:
        COLORS.purpleAccent,
      borderRadius: 11,
      paddingHorizontal: 21,
      paddingVertical: 11,
      marginTop: 17,
    },

    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
    },

    backText: {
      color:
        COLORS.purpleAccent,
      fontSize: 10,
      fontWeight: "700",
      marginTop: 14,
    },

    violationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F2C27B",
    backgroundColor: "#FFF8EC",
  },

  violationButtonText: {
    color: "#B45309",
    fontSize: 14,
    fontWeight: "800",
  },

  bottomSpace: {
      height: 35,
    },
  });