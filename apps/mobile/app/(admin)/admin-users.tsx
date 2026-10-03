import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AdminManagedUser,
  AdminUserRole,
  getAdminUsers,
} from "../../services/admin";

import AdminBottomNav from '../../components/admin/admin-bottom-nav';

type RoleFilter = "all" | AdminUserRole;

type RegistrationPeriod =
  | "today"
  | "7d"
  | "30d"
  | "6m"
  | "1y"
  | "all";

const VALID_ROLES: AdminUserRole[] = [
  "customer",
  "seller",
  "rider",
  "admin",
];

const VALID_REGISTRATION_PERIODS: RegistrationPeriod[] = [
  "today",
  "7d",
  "30d",
  "6m",
  "1y",
  "all",
];

const COLORS = {
  purple: "#312E81",
  purpleDark: "#29266D",
  purpleAccent: "#5B4FCF",
  purpleLight: "#EEEAFE",

  background: "#F7F7FA",
  card: "#FFFFFF",

  text: "#18181B",
  secondaryText: "#7A7A86",
  mutedText: "#A1A1AA",

  border: "#ECECF1",

  green: "#4E9A72",
  greenBackground: "#EAF7EF",

  red: "#D75C73",
  redBackground: "#FDECEF",

  yellow: "#B9892D",
  yellowBackground: "#FFF5D9",

  pink: "#D65A8A",
  pinkBackground: "#FCEAF1",
};

/* =========================================================
 * HELPERS
 * =======================================================*/

function getSingleParam(
  value?: string | string[]
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function isAdminUserRole(
  value?: string
): value is AdminUserRole {
  return (
    !!value &&
    VALID_ROLES.includes(
      value as AdminUserRole
    )
  );
}

function isRegistrationPeriod(
  value?: string
): value is RegistrationPeriod {
  return (
    !!value &&
    VALID_REGISTRATION_PERIODS.includes(
      value as RegistrationPeriod
    )
  );
}

function getRegistrationPeriodLabel(
  period: RegistrationPeriod
) {
  switch (period) {
    case "today":
      return "Today";

    case "7d":
      return "7 Days";

    case "30d":
      return "30 Days";

    case "6m":
      return "6 Months";

    case "1y":
      return "1 Year";

    case "all":
    default:
      return "All Time";
  }
}

function isUserRegisteredInPeriod(
  createdAt: string | undefined,
  period: RegistrationPeriod | null
) {
  if (!period || period === "all") {
    return true;
  }

  if (!createdAt) {
    return false;
  }

  const createdDate =
    new Date(createdAt);

  if (
    Number.isNaN(
      createdDate.getTime()
    )
  ) {
    return false;
  }

  const now = new Date();

  const start = new Date(now);
  start.setHours(
    0,
    0,
    0,
    0
  );

  const end = new Date(now);
  end.setHours(
    23,
    59,
    59,
    999
  );

  switch (period) {
    case "today":
      break;

    case "7d":
      start.setDate(
        start.getDate() - 6
      );
      break;

    case "30d":
      start.setDate(
        start.getDate() - 29
      );
      break;

    case "6m":
      start.setMonth(
        start.getMonth() - 6
      );
      break;

    case "1y":
      start.setFullYear(
        start.getFullYear() - 1
      );
      break;
  }

  return (
    createdDate >= start &&
    createdDate <= end
  );
}

function getUserId(
  user: AdminManagedUser
) {
  return user._id || user.id || "";
}

function getFullName(
  user: AdminManagedUser
) {
  const name =
    `${user.firstName || ""} ${
      user.lastName || ""
    }`.trim();

  return name || "Unnamed User";
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

function formatRole(
  role: AdminUserRole
) {
  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getRoleIcon(
  role: AdminUserRole
): React.ComponentProps<
  typeof Ionicons
>["name"] {
  switch (role) {
    case "seller":
      return "storefront-outline";

    case "rider":
      return "bicycle-outline";

    case "admin":
      return "shield-outline";

    default:
      return "person-outline";
  }
}

function getRoleStyle(
  role: AdminUserRole
) {
  switch (role) {
    case "seller":
      return {
        backgroundColor:
          "#EAF7EF",
        color: "#4E9A72",
      };

    case "rider":
      return {
        backgroundColor:
          "#FFF5D9",
        color: "#B9892D",
      };

    case "admin":
      return {
        backgroundColor:
          "#FCEAF1",
        color: "#D65A8A",
      };

    default:
      return {
        backgroundColor:
          "#EEEAFE",
        color: "#5B4FCF",
      };
  }
}

function getStatusStyle(
  status: AdminManagedUser["accountStatus"]
) {
  switch (status) {
    case "active":
      return {
        backgroundColor:
          COLORS.greenBackground,
        textColor:
          COLORS.green,
        dotColor:
          COLORS.green,
      };

    case "suspended":
      return {
        backgroundColor:
          COLORS.redBackground,
        textColor:
          COLORS.red,
        dotColor:
          COLORS.red,
      };

    default:
      return {
        backgroundColor:
          "#F1F1F4",
        textColor:
          "#777783",
        dotColor:
          "#9A9AA5",
      };
  }
}

/* =========================================================
 * SCREEN
 * =======================================================*/

export default function AdminUsersScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      role?:
        | string
        | string[];
      registrationPeriod?:
        | string
        | string[];
    }>();

  const requestedRole =
    getSingleParam(
      params.role
    );

  const requestedRegistrationPeriod =
    getSingleParam(
      params.registrationPeriod
    );

  const initialRoleFilter: RoleFilter =
    isAdminUserRole(
      requestedRole
    )
      ? requestedRole
      : "all";

  const registrationPeriod:
    | RegistrationPeriod
    | null =
    isRegistrationPeriod(
      requestedRegistrationPeriod
    )
      ? requestedRegistrationPeriod
      : null;

  const [
    users,
    setUsers,
  ] = useState<
    AdminManagedUser[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

const [refreshing, setRefreshing] = useState(false);

const [headerRefreshing, setHeaderRefreshing] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState<RoleFilter>(
      initialRoleFilter
    );

  /* =======================================================
   * LOAD USERS
   * =====================================================*/

  const loadUsers =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          setError(null);

          const data =
            await getAdminUsers();

          setUsers(
            Array.isArray(
              data
            )
              ? data
              : []
          );
        } catch (err) {
          console.error(
            "Failed to load users:",
            err
          );

          setError(
            err instanceof
              Error
              ? err.message
              : "Unable to load users."
          );
        } finally {
          if (
            showLoader
          ) {
            setLoading(
              false
            );
          }

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      let active =
        true;

      const fetchUsers =
        async () => {
          try {
            const data =
              await getAdminUsers();

            if (
              !active
            ) {
              return;
            }

            setUsers(
              Array.isArray(
                data
              )
                ? data
                : []
            );

            setError(
              null
            );
          } catch (err) {
            console.error(
              "Failed to load users:",
              err
            );

            if (
              !active
            ) {
              return;
            }

            setError(
              err instanceof
                Error
                ? err.message
                : "Unable to load users."
            );
          } finally {
            if (
              active
            ) {
              setLoading(
                false
              );
            }
          }
        };

      void fetchUsers();

      return () => {
        active =
          false;
      };
    }, [])
  );

const handleRefresh = useCallback(() => {
  if (refreshing) {
    return;
  }

  setRefreshing(true);
  void loadUsers(false);
}, [loadUsers, refreshing]);

const handleHeaderRefresh = useCallback(async () => {
  if (headerRefreshing) {
    return;
  }

  setHeaderRefreshing(true);

  try {
    const data = await getAdminUsers();

    setUsers(
      Array.isArray(data)
        ? data
        : []
    );

    setError(null);
  } catch (err) {
    console.error(
      "Failed to refresh users:",
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : "Unable to load users."
    );
  } finally {
    setHeaderRefreshing(false);
  }
}, [headerRefreshing]);

  /* =======================================================
   * FILTERS
   * =====================================================*/

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          if (
            !isUserRegisteredInPeriod(
              user.createdAt,
              registrationPeriod
            )
          ) {
            return false;
          }

          if (
            roleFilter !==
              "all" &&
            user.role !==
              roleFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack =
            [
              user.firstName,
              user.lastName,
              user.email,
              user.phoneNumber,
              user.role,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase();

          return haystack.includes(
            query
          );
        }
      );
    }, [
      users,
      search,
      roleFilter,
      registrationPeriod,
    ]);

  /* =======================================================
   * COUNTS
   * =====================================================*/

  const customerCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.role ===
            "customer"
        ).length,
      [users]
    );

  const sellerCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.role ===
            "seller"
        ).length,
      [users]
    );

  const riderCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.role ===
            "rider"
        ).length,
      [users]
    );

  const adminCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.role ===
            "admin"
        ).length,
      [users]
    );

  const activeCount =
    useMemo(
      () =>
        users.filter(
          (user) =>
            user.accountStatus ===
            "active"
        ).length,
      [users]
    );

  /* =======================================================
   * NAVIGATION
   * =====================================================*/

  const openUser =
    useCallback(
      (
        user: AdminManagedUser
      ) => {
        const userId =
          getUserId(
            user
          );

        if (!userId) {
          return;
        }

        router.push({
          pathname:
            "/(admin)/admin-user-details",
          params: {
            userId,
          },
        });
      },
      [router]
    );

  /* =======================================================
   * LOADING
   * =====================================================*/

  if (
    loading &&
    users.length === 0
  ) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.purpleAccent
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading users...
        </Text>
      </View>
    );
  }

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
        refreshControl={
          <RefreshControl
  refreshing={refreshing}
  onRefresh={handleRefresh}
  tintColor={COLORS.purpleAccent}
  colors={[COLORS.purpleAccent]}
/>
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* PURPLE HEADER */}

        <View
          style={styles.header}
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
            <View>
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
                Users
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage platform
                accounts
              </Text>
            </View>

<Pressable
  style={[
    styles.refreshButton,
    headerRefreshing && styles.refreshButtonDisabled,
  ]}
  onPress={handleHeaderRefresh}
  disabled={headerRefreshing}
>
  {headerRefreshing ? (
    <ActivityIndicator
      size="small"
      color="#FFFFFF"
    />
  ) : (
    <Ionicons
      name="refresh"
      size={20}
      color="#FFFFFF"
    />
  )}
</Pressable>
          </View>

          <View
            style={
              styles.headerStats
            }
          >
            <HeaderStatCard
              label="Total Users"
              value={
                users.length
              }
            />

            <HeaderStatCard
              label="Active"
              value={
                activeCount
              }
            />
          </View>
        </View>

        {/* MAIN CONTENT */}

        <View
          style={styles.body}
        >
          {/* ROLE SUMMARY */}

          <View
            style={
              styles.roleSummaryCard
            }
          >
            <RoleSummaryItem
              icon="person-outline"
              label="Customers"
              value={
                customerCount
              }
              backgroundColor="#FCEAF1"
              iconColor="#D65A8A"
            />

            <View
              style={
                styles.summaryDivider
              }
            />

            <RoleSummaryItem
              icon="storefront-outline"
              label="Sellers"
              value={
                sellerCount
              }
              backgroundColor="#EAF7EF"
              iconColor="#4E9A72"
            />

            <View
              style={
                styles.summaryDivider
              }
            />

            <RoleSummaryItem
              icon="bicycle-outline"
              label="Riders"
              value={
                riderCount
              }
              backgroundColor="#FFF5D9"
              iconColor="#B9892D"
            />
          </View>

          {/* SEARCH */}

          <View
            style={
              styles.searchContainer
            }
          >
            <Ionicons
              name="search-outline"
              size={18}
              color="#92929E"
            />

            <TextInput
              style={
                styles.searchInput
              }
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search users..."
              placeholderTextColor="#A1A1AA"
              autoCapitalize="none"
            />

            {search.length >
            0 ? (
              <Pressable
                onPress={() =>
                  setSearch(
                    ""
                  )
                }
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="#A1A1AA"
                />
              </Pressable>
            ) : null}
          </View>

          {/* FILTERS */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            <FilterButton
              label="All"
              active={
                roleFilter ===
                "all"
              }
              onPress={() =>
                setRoleFilter(
                  "all"
                )
              }
            />

            <FilterButton
              label={`Customers (${customerCount})`}
              active={
                roleFilter ===
                "customer"
              }
              onPress={() =>
                setRoleFilter(
                  "customer"
                )
              }
            />

            <FilterButton
              label={`Sellers (${sellerCount})`}
              active={
                roleFilter ===
                "seller"
              }
              onPress={() =>
                setRoleFilter(
                  "seller"
                )
              }
            />

            <FilterButton
              label={`Riders (${riderCount})`}
              active={
                roleFilter ===
                "rider"
              }
              onPress={() =>
                setRoleFilter(
                  "rider"
                )
              }
            />

            <FilterButton
              label={`Admins (${adminCount})`}
              active={
                roleFilter ===
                "admin"
              }
              onPress={() =>
                setRoleFilter(
                  "admin"
                )
              }
            />
          </ScrollView>

          {/* ERROR */}

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
                  Unable to load
                  users
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
                  void loadUsers()
                }
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* SECTION */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {registrationPeriod
                  ? "New Registrations"
                  : "User Accounts"}
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                {registrationPeriod
                  ? `Registered during ${getRegistrationPeriodLabel(
                      registrationPeriod
                    )}`
                  : "Platform registered users"}
              </Text>
            </View>

            <Text
              style={
                styles.resultCount
              }
            >
              {
                filteredUsers.length
              }{" "}
              {filteredUsers.length ===
              1
                ? "result"
                : "results"}
            </Text>
          </View>

          {/* EMPTY */}

          {!error &&
          filteredUsers.length ===
            0 ? (
            <View
              style={
                styles.emptyCard
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="people-outline"
                  size={27}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No users found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Try changing your
                search or filter.
              </Text>
            </View>
          ) : null}

          {/* USER CARDS */}

          {filteredUsers.map(
            (user) => {
              const statusStyle =
                getStatusStyle(
                  user.accountStatus
                );

              const roleStyle =
                getRoleStyle(
                  user.role
                );

              return (
                <Pressable
                  key={
                    getUserId(
                      user
                    ) ||
                    user.email
                  }
                  style={
                    styles.userCard
                  }
                  onPress={() =>
                    openUser(
                      user
                    )
                  }
                >
                  <View
                    style={
                      styles.userTop
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
                        styles.userInfo
                      }
                    >
                      <Text
                        style={
                          styles.userName
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {getFullName(
                          user
                        )}
                      </Text>

                      <Text
                        style={
                          styles.userEmail
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {
                          user.email
                        }
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#A1A1AA"
                    />
                  </View>

                  <View
                    style={
                      styles.divider
                    }
                  />

                  <View
                    style={
                      styles.userMeta
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
                        name={getRoleIcon(
                          user.role
                        )}
                        size={12}
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
                        {formatRole(
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
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              statusStyle.dotColor,
                          },
                        ]}
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
                        {
                          user.accountStatus
                        }
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.userBottom
                    }
                  >
                    <View
                      style={
                        styles.metaItem
                      }
                    >
                      <Ionicons
                        name="call-outline"
                        size={13}
                        color="#9999A5"
                      />

                      <Text
                        style={
                          styles.metaText
                        }
                      >
                        {user.phoneNumber ||
                          "No phone"}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.metaItem
                      }
                    >
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color="#9999A5"
                      />

                      <Text
                        style={
                          styles.metaText
                        }
                      >
                        Last login:{" "}
                        {formatDate(
                          user.lastLoginAt
                        )}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }
          )}
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}

      <AdminBottomNav active="users" />
    </View>
  );
}

/* =========================================================
 * COMPONENTS
 * =======================================================*/

function HeaderStatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View
      style={
        styles.headerStatCard
      }
    >
      <Text
        style={
          styles.headerStatLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.headerStatValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function RoleSummaryItem({
  icon,
  label,
  value,
  backgroundColor,
  iconColor,
}: {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: number;
  backgroundColor: string;
  iconColor: string;
}) {
  return (
    <View
      style={
        styles.roleSummaryItem
      }
    >
      <View
        style={[
          styles.roleSummaryIcon,
          {
            backgroundColor,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={iconColor}
        />
      </View>

      <Text
        style={
          styles.roleSummaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.roleSummaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterButton,
        active &&
          styles.filterButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
      paddingBottom: 30,
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
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor:
        "rgba(255,255,255,0.035)",
      right: -65,
      top: -90,
    },

    headerTop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between",
    },

    headerEyebrow: {
      color: "#C9C5F5",
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1.1,
    },

    headerTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "800",
      marginTop: 3,
    },

    headerSubtitle: {
      color: "#D4D2EC",
      fontSize: 9,
      marginTop: 2,
    },

    refreshButton: {
      width: 37,
      height: 37,
      borderRadius: 11,
      backgroundColor:
        "rgba(255,255,255,0.09)",
      alignItems: "center",
      justifyContent:
        "center",
    },
    refreshButtonDisabled: {
  opacity: 0.8,
},

    headerStats: {
      flexDirection: "row",
      gap: 9,
      marginTop: 17,
    },

    headerStatCard: {
      flex: 1,
      minHeight: 67,
      borderRadius: 11,
      backgroundColor:
        "rgba(255,255,255,0.11)",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    headerStatLabel: {
      color: "#D6D4EF",
      fontSize: 9,
    },

    headerStatValue: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "800",
      marginTop: 4,
    },

    /* BODY */

    body: {
      backgroundColor:
        COLORS.background,
      paddingHorizontal: 15,
      paddingTop: 14,
    },

    roleSummaryCard: {
      flexDirection: "row",
      backgroundColor:
        COLORS.card,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 8,
      marginBottom: 13,

      shadowColor:
        "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 2,
    },

    roleSummaryItem: {
      flex: 1,
      alignItems: "center",
    },

    roleSummaryIcon: {
      width: 31,
      height: 31,
      borderRadius: 9,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 5,
    },

    roleSummaryValue: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: "800",
    },

    roleSummaryLabel: {
      color:
        COLORS.secondaryText,
      fontSize: 8,
      marginTop: 2,
    },

    summaryDivider: {
      width: 1,
      height: 43,
      backgroundColor:
        COLORS.border,
      alignSelf: "center",
    },

    /* SEARCH */

    searchContainer: {
      height: 45,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
    },

    searchInput: {
      flex: 1,
      color: COLORS.text,
      fontSize: 11,
      marginHorizontal: 8,
    },

    /* FILTERS */

    filters: {
      gap: 7,
      paddingBottom: 17,
    },

    filterButton: {
      minHeight: 33,
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems: "center",
      justifyContent:
        "center",
    },

    filterButtonActive: {
      backgroundColor:
        COLORS.purpleAccent,
      borderColor:
        COLORS.purpleAccent,
    },

    filterText: {
      color: "#777783",
      fontSize: 9,
      fontWeight: "700",
    },

    filterTextActive: {
      color: "#FFFFFF",
    },

    /* SECTION */

    sectionHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-end",
      marginBottom: 10,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: "800",
    },

    sectionSubtitle: {
      color:
        COLORS.mutedText,
      fontSize: 8,
      marginTop: 2,
    },

    resultCount: {
      color:
        COLORS.mutedText,
      fontSize: 8,
    },

    /* USER CARD */

    userCard: {
      backgroundColor:
        COLORS.card,
      borderRadius: 14,
      padding: 13,
      marginBottom: 9,
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

    userTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        COLORS.purpleLight,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    avatarText: {
      color:
        COLORS.purpleAccent,
      fontSize: 12,
      fontWeight: "800",
    },

    userInfo: {
      flex: 1,
    },

    userName: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: "800",
    },

    userEmail: {
      color:
        COLORS.secondaryText,
      fontSize: 9,
      marginTop: 3,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 10,
    },

    userMeta: {
      flexDirection: "row",
      gap: 6,
      marginBottom: 10,
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

    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "800",
      textTransform:
        "capitalize",
    },

    userBottom: {
      gap: 6,
    },

    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    metaText: {
      color:
        COLORS.secondaryText,
      fontSize: 8,
    },

    /* ERROR */

    errorCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        COLORS.redBackground,
      borderRadius: 12,
      padding: 11,
      marginBottom: 15,
    },

    errorIcon: {
      width: 31,
      height: 31,
      borderRadius: 9,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    errorContent: {
      flex: 1,
      marginHorizontal: 9,
    },

    errorTitle: {
      color: COLORS.text,
      fontSize: 10,
      fontWeight: "700",
    },

    errorText: {
      color: "#A66A76",
      fontSize: 8,
      marginTop: 2,
    },

    retryText: {
      color: COLORS.red,
      fontSize: 9,
      fontWeight: "800",
    },

    /* EMPTY */

    emptyCard: {
      alignItems: "center",
      backgroundColor:
        COLORS.card,
      borderRadius: 14,
      paddingVertical: 35,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor:
        COLORS.purpleLight,
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 10,
    },

    emptyText: {
      color:
        COLORS.secondaryText,
      fontSize: 9,
      marginTop: 4,
    },

    /* LOADING */

    loadingContainer: {
      flex: 1,
      backgroundColor:
        COLORS.background,
      alignItems: "center",
      justifyContent:
        "center",
    },

    loadingText: {
      color:
        COLORS.secondaryText,
      fontSize: 10,
      marginTop: 10,
    },

    /* BOTTOM NAVIGATION */

    bottomNavigation: {
      minHeight: 76,
      paddingTop: 7,
      paddingBottom: 9,
      paddingHorizontal: 6,
      flexDirection: "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-around",
      backgroundColor:
        "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    bottomNavItem: {
      flex: 1,
      minHeight: 57,
      alignItems: "center",
      justifyContent:
        "flex-start",
    },

    bottomNavIconWrap: {
      width: 36,
      height: 31,
      borderRadius: 16,
      alignItems: "center",
      justifyContent:
        "center",
    },

    bottomNavIconWrapActive: {
      backgroundColor:
        COLORS.purpleLight,
    },

    bottomNavLabel: {
      marginTop: 2,
      fontSize: 9,
      lineHeight: 13,
      fontWeight: "500",
      color:
        COLORS.mutedText,
      textAlign: "center",
    },

    bottomNavLabelActive: {
      fontWeight: "700",
      color:
        COLORS.purpleAccent,
    },
  });