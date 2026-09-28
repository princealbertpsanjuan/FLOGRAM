import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AdminRemittanceStatus,
  AdminRiderRemittance,
  getAdminRemittances,
} from "../../services/admin";

type FilterStatus = "all" | AdminRemittanceStatus;

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

function formatCurrency(value?: number | null) {
  const amount = Number(value || 0);

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not submitted";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not submitted";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(status: AdminRemittanceStatus | string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "submitted":
      return "For Verification";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    default:
      return status || "Unknown";
  }
}

function getRiderName(remittance: AdminRiderRemittance) {
  const firstName =
    remittance.riderUser?.firstName?.trim() || "";

  const lastName =
    remittance.riderUser?.lastName?.trim() || "";

  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  if (remittance.riderUser?.email) {
    return remittance.riderUser.email;
  }

  return "Rider";
}

function getInitials(remittance: AdminRiderRemittance) {
  const firstName =
    remittance.riderUser?.firstName?.trim() || "";

  const lastName =
    remittance.riderUser?.lastName?.trim() || "";

  const firstInitial = firstName.charAt(0);
  const lastInitial = lastName.charAt(0);

  return `${firstInitial}${lastInitial}`.toUpperCase() || "R";
}

function getStatusStyle(status: AdminRemittanceStatus) {
  switch (status) {
    case "verified":
      return {
        background: COLORS.greenBackground,
        text: COLORS.green,
        icon: "checkmark-circle" as const,
      };

    case "rejected":
      return {
        background: COLORS.redBackground,
        text: COLORS.red,
        icon: "close-circle" as const,
      };

    case "submitted":
      return {
        background: COLORS.yellowBackground,
        text: COLORS.yellow,
        icon: "time" as const,
      };

    default:
      return {
        background: COLORS.purpleLight,
        text: COLORS.purpleAccent,
        icon: "hourglass" as const,
      };
  }
}

const FILTERS: {
  key: FilterStatus;
  label: string;
}[] = [
  {
    key: "all",
    label: "All",
  },
  {
    key: "submitted",
    label: "For Verification",
  },
  {
    key: "verified",
    label: "Verified",
  },
  {
    key: "rejected",
    label: "Rejected",
  },
];

export default function AdminRemittancesScreen() {
  const router = useRouter();

  const [remittances, setRemittances] = useState<
    AdminRiderRemittance[]
  >([]);

  const [selectedFilter, setSelectedFilter] =
    useState<FilterStatus>("submitted");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRemittances = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const data = await getAdminRemittances();

        setRemittances(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(
          "Failed to load Admin remittances:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load rider remittances."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }

        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadRemittances();
      return undefined;
    }, [loadRemittances])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadRemittances(false);
  }, [loadRemittances]);

  const filteredRemittances = useMemo(() => {
    if (selectedFilter === "all") {
      return remittances;
    }

    return remittances.filter(
      (item) => item.status === selectedFilter
    );
  }, [remittances, selectedFilter]);

  const submittedCount = useMemo(
    () =>
      remittances.filter(
        (item) => item.status === "submitted"
      ).length,
    [remittances]
  );

  const verifiedCount = useMemo(
    () =>
      remittances.filter(
        (item) => item.status === "verified"
      ).length,
    [remittances]
  );

  const rejectedCount = useMemo(
    () =>
      remittances.filter(
        (item) => item.status === "rejected"
      ).length,
    [remittances]
  );

  const awaitingAmount = useMemo(
    () =>
      remittances
        .filter((item) => item.status === "submitted")
        .reduce(
          (total, item) =>
            total + Number(item.totalAmount || 0),
          0
        ),
    [remittances]
  );

  const handleOpenRemittance = useCallback(
    (remittance: AdminRiderRemittance) => {
      router.push({
        pathname: "/(admin)/admin-remittance-details",
        params: {
          remittanceId: remittance.id,
        },
      });
    },
    [router]
  );

  if (loading && remittances.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.purpleAccent}
          />

          <Text style={styles.loadingText}>
            Loading remittances...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sectionTitle =
    selectedFilter === "all"
      ? "All Remittances"
      : selectedFilter === "submitted"
        ? "For Verification"
        : selectedFilter === "verified"
          ? "Verified Remittances"
          : selectedFilter === "rejected"
            ? "Rejected Remittances"
            : "Pending Remittances";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={19}
                color="#FFFFFF"
              />
            </Pressable>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerEyebrow}>
                FINANCIAL MANAGEMENT
              </Text>

              <Text style={styles.headerTitle}>
                COD Remittances
              </Text>

              <Text style={styles.headerSubtitle}>
                Review rider cash collections
              </Text>
            </View>

            <Pressable
              style={styles.headerButton}
              onPress={() => void loadRemittances()}
            >
              <Ionicons
                name="refresh"
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <View style={styles.highlightCard}>
            <View style={styles.highlightIcon}>
              <Ionicons
                name="wallet-outline"
                size={21}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.highlightContent}>
              <Text style={styles.highlightLabel}>
                Awaiting Verification
              </Text>

              <Text style={styles.highlightAmount}>
                {formatCurrency(awaitingAmount)}
              </Text>

              <Text style={styles.highlightSubtext}>
                {submittedCount}{" "}
                {submittedCount === 1
                  ? "submission"
                  : "submissions"}{" "}
                waiting for review
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.purpleAccent}
              colors={[COLORS.purpleAccent]}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons
                name="cash-outline"
                size={20}
                color={COLORS.purpleAccent}
              />
            </View>

            <View style={styles.introContent}>
              <Text style={styles.introTitle}>
                Rider Remittances
              </Text>

              <Text style={styles.introDescription}>
                Verify Cash on Delivery collections submitted
                by riders before they are included in the
                platform&apos;s verified COD sales.
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      COLORS.yellowBackground,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={19}
                  color={COLORS.yellow}
                />
              </View>

              <Text style={styles.summaryValue}>
                {submittedCount}
              </Text>

              <Text style={styles.summaryLabel}>
                For Review
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      COLORS.greenBackground,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={COLORS.green}
                />
              </View>

              <Text style={styles.summaryValue}>
                {verifiedCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Verified
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      COLORS.redBackground,
                  },
                ]}
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={COLORS.red}
                />
              </View>

              <Text style={styles.summaryValue}>
                {rejectedCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Rejected
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {FILTERS.map((filter) => {
              const active =
                selectedFilter === filter.key;

              return (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    active &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() =>
                    setSelectedFilter(filter.key)
                  }
                >
                  <Text
                    style={[
                      styles.filterText,
                      active &&
                        styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? (
            <View style={styles.errorCard}>
              <View style={styles.errorIcon}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={COLORS.red}
                />
              </View>

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Unable to load remittances
                </Text>

                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  void loadRemittances()
                }
              >
                <Text style={styles.retryText}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>
                REMITTANCE RECORDS
              </Text>

              <Text style={styles.sectionTitle}>
                {sectionTitle}
              </Text>
            </View>

            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>
                {filteredRemittances.length}
              </Text>
            </View>
          </View>

          {!error &&
          filteredRemittances.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={32}
                  color={COLORS.purpleAccent}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No remittances
              </Text>

              <Text style={styles.emptyText}>
                {selectedFilter === "submitted"
                  ? "There are no rider COD remittances waiting for verification."
                  : "There are no remittances under this status."}
              </Text>
            </View>
          ) : null}

          {filteredRemittances.map(
            (remittance) => {
              const statusStyle =
                getStatusStyle(remittance.status);

              return (
                <Pressable
                  key={remittance.id}
                  style={({ pressed }) => [
                    styles.remittanceCard,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() =>
                    handleOpenRemittance(
                      remittance
                    )
                  }
                >
                  <View style={styles.cardTop}>
                    <View
                      style={
                        styles.riderContainer
                      }
                    >
                      <View style={styles.avatar}>
                        <Text
                          style={styles.avatarText}
                        >
                          {getInitials(
                            remittance
                          )}
                        </Text>
                      </View>

                      <View
                        style={styles.riderInfo}
                      >
                        <Text
                          style={styles.riderName}
                          numberOfLines={1}
                        >
                          {getRiderName(
                            remittance
                          )}
                        </Text>

                        <Text
                          style={
                            styles.riderVehicle
                          }
                          numberOfLines={1}
                        >
                          {remittance.rider
                            ?.vehicleType ||
                            "Rider"}

                          {remittance.rider
                            ?.vehiclePlateNumber
                            ? ` • ${remittance.rider.vehiclePlateNumber}`
                            : ""}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            statusStyle.background,
                        },
                      ]}
                    >
                      <Ionicons
                        name={statusStyle.icon}
                        size={13}
                        color={statusStyle.text}
                      />

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              statusStyle.text,
                          },
                        ]}
                      >
                        {formatStatus(
                          remittance.status
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.amountRow}>
                    <View>
                      <Text
                        style={styles.amountLabel}
                      >
                        Remittance Amount
                      </Text>

                      <Text
                        style={styles.amountValue}
                      >
                        {formatCurrency(
                          remittance.totalAmount
                        )}
                      </Text>
                    </View>

                    <View
                      style={styles.deliveryBox}
                    >
                      <View
                        style={
                          styles.deliveryIcon
                        }
                      >
                        <Ionicons
                          name="bicycle-outline"
                          size={16}
                          color={
                            COLORS.purpleAccent
                          }
                        />
                      </View>

                      <View>
                        <Text
                          style={
                            styles.deliveryCount
                          }
                        >
                          {
                            remittance.deliveryCount
                          }
                        </Text>

                        <Text
                          style={
                            styles.deliveryLabel
                          }
                        >
                          {remittance.deliveryCount ===
                          1
                            ? "delivery"
                            : "deliveries"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={styles.detailsContainer}
                  >
                    <DetailRow
                      icon="calendar-outline"
                      label="Shift Date"
                      value={formatDate(
                        remittance.shiftDate
                      )}
                    />

                    <DetailRow
                      icon="document-text-outline"
                      label="Reference"
                      value={
                        remittance.referenceNumber ||
                        "—"
                      }
                    />

                    <DetailRow
                      icon="time-outline"
                      label="Submitted"
                      value={formatDateTime(
                        remittance.submittedAt
                      )}
                    />
                  </View>

                  {remittance.status ===
                    "rejected" &&
                  remittance.adminRemarks ? (
                    <View
                      style={styles.rejectionBox}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={COLORS.red}
                      />

                      <Text
                        style={styles.rejectionText}
                        numberOfLines={2}
                      >
                        {remittance.adminRemarks}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={styles.viewDetailsRow}
                  >
                    <Text
                      style={
                        styles.viewDetailsText
                      }
                    >
                      {remittance.status ===
                      "submitted"
                        ? "Review Remittance"
                        : "View Details"}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={COLORS.purpleAccent}
                    />
                  </View>
                </Pressable>
              );
            }
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

type DetailRowProps = {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: string;
};

function DetailRow({
  icon,
  label,
  value,
}: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <View style={styles.detailIcon}>
          <Ionicons
            name={icon}
            size={15}
            color={COLORS.purpleAccent}
          />
        </View>

        <Text style={styles.detailLabel}>
          {label}
        </Text>
      </View>

      <Text
        style={styles.detailValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.purple,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    color: COLORS.secondaryText,
    fontSize: 13,
    marginTop: 12,
  },

  header: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 13,
  },

  headerEyebrow: {
    color: "#C8C5F2",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },

  headerSubtitle: {
    color: "#D6D4F4",
    fontSize: 11,
    marginTop: 2,
  },

  highlightCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },

  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.13)",
  },

  highlightContent: {
    flex: 1,
  },

  highlightLabel: {
    color: "#D6D4F4",
    fontSize: 9,
    fontWeight: "700",
  },

  highlightAmount: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },

  highlightSubtext: {
    color: "#C8C5F2",
    fontSize: 9,
    marginTop: 3,
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 18,
  },

  introCard: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 17,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 13,
  },

  introIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },

  introContent: {
    flex: 1,
    marginLeft: 11,
  },

  introTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  introDescription: {
    color: COLORS.secondaryText,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
  },

  summaryValue: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },

  summaryLabel: {
    color: COLORS.secondaryText,
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },

  filterContainer: {
    gap: 7,
    paddingBottom: 18,
  },

  filterButton: {
    minHeight: 37,
    paddingHorizontal: 14,
    borderRadius: 11,
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  filterButtonActive: {
    backgroundColor: COLORS.purpleAccent,
    borderColor: COLORS.purpleAccent,
  },

  filterText: {
    color: COLORS.secondaryText,
    fontSize: 10,
    fontWeight: "700",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    marginBottom: 17,
    borderRadius: 15,
    backgroundColor: COLORS.redBackground,
    borderWidth: 1,
    borderColor: "#F8D4DC",
  },

  errorIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  errorContent: {
    flex: 1,
    marginHorizontal: 10,
  },

  errorTitle: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "800",
  },

  errorText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    marginTop: 2,
  },

  retryText: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: "800",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  sectionEyebrow: {
    color: COLORS.purpleAccent,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },

  sectionCount: {
    minWidth: 31,
    height: 31,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },

  sectionCountText: {
    color: COLORS.purpleAccent,
    fontSize: 11,
    fontWeight: "800",
  },

  emptyContainer: {
    paddingVertical: 35,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: COLORS.purpleLight,
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  emptyText: {
    color: COLORS.secondaryText,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 260,
  },

  remittanceCard: {
    padding: 15,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardPressed: {
    opacity: 0.82,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  riderContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  avatarText: {
    color: COLORS.purpleAccent,
    fontSize: 13,
    fontWeight: "800",
  },

  riderInfo: {
    flex: 1,
  },

  riderName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  riderVehicle: {
    color: COLORS.secondaryText,
    fontSize: 9,
    marginTop: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },

  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  amountLabel: {
    color: COLORS.secondaryText,
    fontSize: 9,
    fontWeight: "600",
  },

  amountValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },

  deliveryBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: COLORS.purpleLight,
  },

  deliveryIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 7,
    backgroundColor: "#FFFFFF",
  },

  deliveryCount: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },

  deliveryLabel: {
    color: COLORS.secondaryText,
    fontSize: 8,
    marginTop: 1,
  },

  detailsContainer: {
    gap: 7,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 29,
  },

  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  detailIcon: {
    width: 27,
    height: 27,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    backgroundColor: COLORS.purpleLight,
  },

  detailLabel: {
    color: COLORS.secondaryText,
    fontSize: 9,
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: "700",
    maxWidth: "52%",
    textAlign: "right",
  },

  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    marginTop: 11,
    borderRadius: 11,
    backgroundColor: COLORS.redBackground,
  },

  rejectionText: {
    flex: 1,
    color: COLORS.red,
    fontSize: 9,
    lineHeight: 14,
    marginLeft: 7,
  },

  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  viewDetailsText: {
    color: COLORS.purpleAccent,
    fontSize: 10,
    fontWeight: "800",
    marginRight: 3,
  },

  bottomSpace: {
    height: 30,
  },
});