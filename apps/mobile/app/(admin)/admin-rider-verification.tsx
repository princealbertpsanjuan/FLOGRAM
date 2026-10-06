import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AdminRiderVerification,
  approveAdminRider,
  getAdminRiderById,
  getPendingRiders,
  rejectAdminRider,
} from "../../services/admin";

import RequirementDocumentsView from "../../components/admin/requirement-documents";

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
};

function getRiderId(rider: AdminRiderVerification) {
  return rider._id || rider.id || "";
}

function getOwner(rider: AdminRiderVerification) {
  if (rider.owner && typeof rider.owner === "object") {
    return rider.owner;
  }

  return null;
}

function getRiderName(rider: AdminRiderVerification) {
  const owner = getOwner(rider);

  if (!owner) {
    return "Rider Applicant";
  }

  const firstName = owner.firstName?.trim() || "";
  const lastName = owner.lastName?.trim() || "";
  const name = `${firstName} ${lastName}`.trim();

  return name || owner.email || "Rider Applicant";
}

function getInitials(rider: AdminRiderVerification) {
  const owner = getOwner(rider);

  if (!owner) {
    return "R";
  }

  const first = owner.firstName?.trim().charAt(0) || "";
  const last = owner.lastName?.trim().charAt(0) || "";

  return `${first}${last}`.toUpperCase() || "R";
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

function formatVehicle(value?: string) {
  if (!value) {
    return "Not provided";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAddress(rider: AdminRiderVerification) {
  const address = rider.address;

  if (!address) {
    return "Not provided";
  }

  const parts = [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.postalCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Not provided";
}

export default function AdminRiderVerificationScreen() {
  const router = useRouter();

  const [riders, setRiders] = useState<AdminRiderVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [headerRefreshing, setHeaderRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedRider, setSelectedRider] =
    useState<AdminRiderVerification | null>(null);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRiders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      const data = await getPendingRiders();

      setRiders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load pending riders:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load pending rider applications."
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }

      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchRiders = async () => {
        try {
          const data = await getPendingRiders();

          if (!active) {
            return;
          }

          setRiders(Array.isArray(data) ? data : []);
          setError(null);
        } catch (err) {
          console.error("Failed to load pending riders:", err);

          if (!active) {
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load pending rider applications."
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void fetchRiders();

      return () => {
        active = false;
      };
    }, [])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadRiders(false);
  }, [loadRiders]);

  const handleHeaderRefresh = useCallback(async () => {
    if (headerRefreshing || processingId) {
      return;
    }

    try {
      setHeaderRefreshing(true);
      setError(null);

      const data = await getPendingRiders();

      setRiders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to refresh pending riders:", err);

      Alert.alert(
        "Unable to Refresh",
        err instanceof Error
          ? err.message
          : "The rider applications could not be refreshed."
      );
    } finally {
      setHeaderRefreshing(false);
    }
  }, [headerRefreshing, processingId]);

  const pendingCount = riders.length;

  const motorcycleCount = useMemo(
    () =>
      riders.filter((rider) =>
        rider.vehicleType?.toLowerCase().includes("motorcycle")
      ).length,
    [riders]
  );

  const [documentsLoading, setDocumentsLoading] = useState(false);

  const openDetails = useCallback((rider: AdminRiderVerification) => {
    setSelectedRider(rider);
    setDetailsVisible(true);

    /*
     * Load the full record (with uploaded requirements).
     */
    const riderId = getRiderId(rider);

    if (!riderId) return;

    setDocumentsLoading(true);
    getAdminRiderById(riderId)
      .then(full => setSelectedRider(current => (current && getRiderId(current) === riderId ? { ...current, ...full } : current)))
      .catch(() => undefined)
      .finally(() => setDocumentsLoading(false));
  }, []);

  const approveRider = useCallback((rider: AdminRiderVerification) => {
    const riderId = getRiderId(rider);

    if (!riderId) {
      Alert.alert("Unable to Approve", "The Rider ID is missing.");
      return;
    }

    Alert.alert(
      "Approve Rider",
      `Approve ${getRiderName(rider)} as a verified FLOGRAM rider?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: async () => {
            try {
              setProcessingId(riderId);

              await approveAdminRider(riderId);

              setRiders((current) =>
                current.filter((item) => getRiderId(item) !== riderId)
              );

              setDetailsVisible(false);
              setSelectedRider(null);

              Alert.alert(
                "Rider Approved",
                `${getRiderName(rider)} has been approved successfully.`
              );
            } catch (err) {
              console.error("Failed to approve rider:", err);

              Alert.alert(
                "Unable to Approve",
                err instanceof Error
                  ? err.message
                  : "The rider could not be approved."
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const openReject = useCallback(
    (rider: AdminRiderVerification) => {
      setSelectedRider(rider);
      setRejectionReason("");
      setDetailsVisible(false);
      setRejectVisible(true);
    },
    []
  );

  const confirmReject = useCallback(async () => {
    if (!selectedRider) {
      return;
    }

    const riderId = getRiderId(selectedRider);

    if (!riderId) {
      Alert.alert("Unable to Reject", "The Rider ID is missing.");
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      Alert.alert(
        "Reason Required",
        "Please enter the reason for rejecting this rider application."
      );
      return;
    }

    try {
      setProcessingId(riderId);

      await rejectAdminRider(riderId, reason);

      setRiders((current) =>
        current.filter((item) => getRiderId(item) !== riderId)
      );

      setRejectVisible(false);
      setSelectedRider(null);
      setRejectionReason("");

      Alert.alert(
        "Rider Rejected",
        "The rider application has been rejected."
      );
    } catch (err) {
      console.error("Failed to reject rider:", err);

      Alert.alert(
        "Unable to Reject",
        err instanceof Error
          ? err.message
          : "The rider application could not be rejected."
      );
    } finally {
      setProcessingId(null);
    }
  }, [rejectionReason, selectedRider]);

  if (loading && riders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.purpleAccent} />

        <Text style={styles.loadingText}>
          Loading rider applications...
        </Text>
      </View>
    );
  }

  return (
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

          <View style={styles.headerContent}>
            <Text style={styles.headerEyebrow}>
              VERIFICATIONS
            </Text>

            <Text style={styles.headerTitle}>
              Rider Verification
            </Text>

            <Text style={styles.headerSubtitle}>
              Review rider applications
            </Text>
          </View>

          <Pressable
            style={[
              styles.headerButton,
              (headerRefreshing || Boolean(processingId)) &&
                styles.headerButtonDisabled,
            ]}
            disabled={headerRefreshing || Boolean(processingId)}
            onPress={() => void handleHeaderRefresh()}
          >
            {headerRefreshing ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="refresh"
                size={18}
                color="#FFFFFF"
              />
            )}
          </Pressable>
        </View>

        <View style={styles.headerSummary}>
          <View style={styles.headerSummaryIcon}>
            <Ionicons
              name="bicycle-outline"
              size={20}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerSummaryContent}>
            <Text style={styles.headerSummaryLabel}>
              Pending Rider Applications
            </Text>

            <Text style={styles.headerSummarySubtext}>
              Waiting for Admin review
            </Text>
          </View>

          <Text style={styles.headerSummaryValue}>
            {pendingCount}
          </Text>
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
              name="shield-outline"
              size={20}
              color={COLORS.purpleAccent}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Rider Applications
            </Text>

            <Text style={styles.introText}>
              Review rider and vehicle information before
              allowing applicants to accept FLOGRAM
              deliveries.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                styles.pendingSummaryIcon,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={COLORS.yellow}
              />
            </View>

            <View>
              <Text style={styles.summaryValue}>
                {pendingCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Pending
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                styles.motorcycleSummaryIcon,
              ]}
            >
              <Ionicons
                name="bicycle-outline"
                size={20}
                color={COLORS.purpleAccent}
              />
            </View>

            <View>
              <Text style={styles.summaryValue}>
                {motorcycleCount}
              </Text>

              <Text style={styles.summaryLabel}>
                Motorcycle
              </Text>
            </View>
          </View>
        </View>

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
                Unable to load riders
              </Text>

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>

            <Pressable onPress={() => void loadRiders()}>
              <Text style={styles.retryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              APPLICATIONS
            </Text>

            <Text style={styles.sectionTitle}>
              Pending Riders
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {riders.length}
            </Text>
          </View>
        </View>

        {!error && riders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="checkmark-circle"
                size={34}
                color={COLORS.green}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No pending riders
            </Text>

            <Text style={styles.emptyText}>
              There are currently no rider applications
              waiting for verification.
            </Text>
          </View>
        ) : null}

        {riders.map((rider) => {
          const riderId = getRiderId(rider);
          const owner = getOwner(rider);
          const processing =
            processingId === riderId;

          return (
            <View
              key={
                riderId ||
                `${owner?.email}-${rider.createdAt}`
              }
              style={styles.riderCard}
            >
              <Pressable
                style={styles.riderTop}
                disabled={processing}
                onPress={() => openDetails(rider)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getInitials(rider)}
                  </Text>
                </View>

                <View style={styles.riderInfo}>
                  <Text
                    style={styles.riderName}
                    numberOfLines={1}
                  >
                    {getRiderName(rider)}
                  </Text>

                  <Text
                    style={styles.riderEmail}
                    numberOfLines={1}
                  >
                    {owner?.email ||
                      "No email provided"}
                  </Text>
                </View>

                <View style={styles.pendingBadge}>
                  <View style={styles.pendingDot} />

                  <Text style={styles.pendingText}>
                    Pending
                  </Text>
                </View>
              </Pressable>

              <View style={styles.divider} />

              <View style={styles.details}>
                <DetailRow
                  icon="bicycle-outline"
                  label="Vehicle"
                  value={formatVehicle(
                    rider.vehicleType
                  )}
                />

                <DetailRow
                  icon="card-outline"
                  label="Plate"
                  value={
                    rider.vehiclePlateNumber ||
                    "Not provided"
                  }
                />

                <DetailRow
                  icon="calendar-outline"
                  label="Applied"
                  value={formatDate(
                    rider.createdAt
                  )}
                />
              </View>

              <Pressable
                style={styles.addressBox}
                onPress={() => openDetails(rider)}
              >
                <View style={styles.addressIcon}>
                  <Ionicons
                    name="location-outline"
                    size={17}
                    color={COLORS.purpleAccent}
                  />
                </View>

                <Text
                  style={styles.addressText}
                  numberOfLines={2}
                >
                  {getAddress(rider)}
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={COLORS.mutedText}
                />
              </Pressable>

              <View style={styles.cardActions}>
                <Pressable
                  style={[
                    styles.rejectButton,
                    processing &&
                      styles.disabledButton,
                  ]}
                  disabled={processing}
                  onPress={() => openReject(rider)}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={COLORS.red}
                  />

                  <Text style={styles.rejectText}>
                    Reject
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.approveButton,
                    processing &&
                      styles.disabledButton,
                  ]}
                  disabled={processing}
                  onPress={() =>
                    approveRider(rider)
                  }
                >
                  {processing ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text
                        style={styles.approveText}
                      >
                        Approve
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDetailsVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setDetailsVisible(false)
            }
          />

          {selectedRider ? (
            <View style={styles.detailsModal}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>
                    APPLICATION DETAILS
                  </Text>

                  <Text style={styles.modalTitle}>
                    Rider Details
                  </Text>
                </View>

                <Pressable
                  style={styles.closeButton}
                  onPress={() =>
                    setDetailsVisible(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={COLORS.text}
                  />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalProfile}>
                  <View style={styles.largeAvatar}>
                    <Text
                      style={styles.largeAvatarText}
                    >
                      {getInitials(
                        selectedRider
                      )}
                    </Text>
                  </View>

                  <Text
                    style={styles.modalRiderName}
                  >
                    {getRiderName(
                      selectedRider
                    )}
                  </Text>

                  <Text
                    style={styles.modalRiderEmail}
                  >
                    {getOwner(selectedRider)
                      ?.email ||
                      "No email provided"}
                  </Text>

                  <View
                    style={
                      styles.modalPendingBadge
                    }
                  >
                    <View
                      style={styles.pendingDot}
                    />

                    <Text
                      style={
                        styles.modalPendingText
                      }
                    >
                      Pending Verification
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInfoCard}>
                  <ModalInfoRow
                    icon="call-outline"
                    label="Phone"
                    value={
                      getOwner(selectedRider)
                        ?.phoneNumber ||
                      "Not provided"
                    }
                  />

                  <ModalInfoRow
                    icon="bicycle-outline"
                    label="Vehicle"
                    value={formatVehicle(
                      selectedRider.vehicleType
                    )}
                  />

                  <ModalInfoRow
                    icon="card-outline"
                    label="Plate Number"
                    value={
                      selectedRider.vehiclePlateNumber ||
                      "Not provided"
                    }
                  />

                  <ModalInfoRow
                    icon="location-outline"
                    label="Address"
                    value={getAddress(
                      selectedRider
                    )}
                  />

                  <ModalInfoRow
                    icon="calendar-outline"
                    label="Applied"
                    value={formatDate(
                      selectedRider.createdAt
                    )}
                    last
                  />
                </View>

                <RequirementDocumentsView
                  documents={selectedRider.documents}
                  loading={documentsLoading}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  style={
                    styles.modalRejectButton
                  }
                  onPress={() =>
                    openReject(selectedRider)
                  }
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={COLORS.red}
                  />

                  <Text
                    style={
                      styles.modalRejectText
                    }
                  >
                    Reject
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.modalApproveButton
                  }
                  onPress={() =>
                    approveRider(selectedRider)
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.modalApproveText
                    }
                  >
                    Approve Rider
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={rejectVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingId) {
            setRejectVisible(false);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!processingId) {
                setRejectVisible(false);
              }
            }}
          />

          <View style={styles.rejectModal}>
            <View
              style={styles.rejectModalIcon}
            >
              <Ionicons
                name="close-circle-outline"
                size={30}
                color={COLORS.red}
              />
            </View>

            <Text
              style={styles.rejectModalTitle}
            >
              Reject Rider
            </Text>

            <Text
              style={
                styles.rejectModalDescription
              }
            >
              Enter the reason for rejecting{" "}
              {selectedRider
                ? getRiderName(selectedRider)
                : "this rider"}
              .
            </Text>

            <Text style={styles.inputLabel}>
              Rejection Reason
            </Text>

            <TextInput
              style={styles.reasonInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter the reason for rejection..."
              placeholderTextColor={
                COLORS.mutedText
              }
              multiline
              maxLength={500}
              editable={!processingId}
              textAlignVertical="top"
            />

            <Text
              style={styles.characterCount}
            >
              {rejectionReason.length}/500
            </Text>

            <View
              style={styles.rejectModalActions}
            >
              <Pressable
                style={styles.cancelButton}
                disabled={Boolean(
                  processingId
                )}
                onPress={() => {
                  setRejectVisible(false);
                  setRejectionReason("");
                }}
              >
                <Text
                  style={styles.cancelText}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmRejectButton,
                  processingId &&
                    styles.disabledButton,
                ]}
                disabled={Boolean(
                  processingId
                )}
                onPress={() =>
                  void confirmReject()
                }
              >
                {processingId ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.confirmRejectText
                    }
                  >
                    Reject Rider
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
      <View style={styles.detailIcon}>
        <Ionicons
          name={icon}
          size={15}
          color={COLORS.purpleAccent}
        />
      </View>

      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>
          {label}
        </Text>

        <Text
          style={styles.detailValue}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

type ModalInfoRowProps = {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: string;
  last?: boolean;
};

function ModalInfoRow({
  icon,
  label,
  value,
  last = false,
}: ModalInfoRowProps) {
  return (
    <View
      style={[
        styles.modalInfoRow,
        last && styles.modalInfoRowLast,
      ]}
    >
      <View style={styles.modalInfoLabel}>
        <View style={styles.modalInfoIcon}>
          <Ionicons
            name={icon}
            size={16}
            color={COLORS.purpleAccent}
          />
        </View>

        <Text
          style={styles.modalInfoLabelText}
        >
          {label}
        </Text>
      </View>

      <Text style={styles.modalInfoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.secondaryText,
  },

  header: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 18,
    paddingTop: 54,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  headerButtonDisabled: {
    opacity: 0.75,
  },

  headerContent: {
    flex: 1,
    paddingHorizontal: 13,
  },

  headerEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
    color: "#C8C5F2",
  },

  headerTitle: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#D6D4F4",
  },

  headerSummary: {
    marginTop: 18,
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },

  headerSummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
  },

  headerSummaryContent: {
    flex: 1,
    marginLeft: 11,
  },

  headerSummaryLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  headerSummarySubtext: {
    color: "#C8C5F2",
    fontSize: 9,
    marginTop: 3,
  },

  headerSummaryValue: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
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
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  introText: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.secondaryText,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    minHeight: 72,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  pendingSummaryIcon: {
    backgroundColor: COLORS.yellowBackground,
  },

  motorcycleSummaryIcon: {
    backgroundColor: COLORS.purpleLight,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  summaryLabel: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.secondaryText,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  errorContent: {
    flex: 1,
    marginHorizontal: 10,
  },

  errorTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.red,
  },

  errorText: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.secondaryText,
  },

  retryText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.red,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  sectionEyebrow: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.purpleAccent,
  },

  sectionTitle: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },

  countBadge: {
    minWidth: 31,
    height: 31,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },

  countText: {
    color: COLORS.purpleAccent,
    fontSize: 11,
    fontWeight: "800",
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 35,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.greenBackground,
  },

  emptyTitle: {
    marginTop: 13,
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
  },

  emptyText: {
    marginTop: 6,
    maxWidth: 250,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.secondaryText,
  },

  riderCard: {
    padding: 15,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  riderTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    backgroundColor: COLORS.purpleLight,
  },

  avatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.purpleAccent,
  },

  riderInfo: {
    flex: 1,
    marginRight: 8,
  },

  riderName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  riderEmail: {
    marginTop: 4,
    color: COLORS.secondaryText,
    fontSize: 9,
  },

  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.yellowBackground,
  },

  pendingDot: {
    width: 6,
    height: 6,
    marginRight: 5,
    borderRadius: 3,
    backgroundColor: COLORS.yellow,
  },

  pendingText: {
    color: COLORS.yellow,
    fontSize: 9,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    marginVertical: 13,
    backgroundColor: COLORS.border,
  },

  details: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 12,
  },

  detailRow: {
    flex: 1,
    minHeight: 53,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 11,
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  detailIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },

  detailContent: {
    flex: 1,
    marginLeft: 6,
  },

  detailLabel: {
    color: COLORS.mutedText,
    fontSize: 7,
  },

  detailValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 8,
    fontWeight: "700",
  },

  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 13,
    borderRadius: 11,
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  addressIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },

  addressText: {
    flex: 1,
    marginHorizontal: 8,
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 13,
  },

  cardActions: {
    flexDirection: "row",
    gap: 9,
  },

  rejectButton: {
    flex: 1,
    height: 43,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.redBackground,
    borderWidth: 1,
    borderColor: "#F8D4DC",
  },

  rejectText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "800",
  },

  approveButton: {
    flex: 1.3,
    height: 43,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.purpleAccent,
  },

  approveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.55,
  },

  bottomSpace: {
    height: 30,
  },

  modalOverlay: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18,18,28,0.52)",
  },

  detailsModal: {
    width: "100%",
    maxHeight: "84%",
    padding: 18,
    borderRadius: 22,
    backgroundColor: COLORS.card,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  modalEyebrow: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.purpleAccent,
  },

  modalTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F7",
  },

  modalProfile: {
    alignItems: "center",
    paddingVertical: 7,
    paddingBottom: 18,
  },

  largeAvatar: {
    width: 66,
    height: 66,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },

  largeAvatarText: {
    color: COLORS.purpleAccent,
    fontSize: 20,
    fontWeight: "800",
  },

  modalRiderName: {
    marginTop: 11,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  modalRiderEmail: {
    marginTop: 4,
    color: COLORS.secondaryText,
    fontSize: 10,
  },

  modalPendingBadge: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.yellowBackground,
  },

  modalPendingText: {
    color: COLORS.yellow,
    fontSize: 9,
    fontWeight: "800",
  },

  modalInfoCard: {
    overflow: "hidden",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FAFAFC",
  },

  modalInfoRow: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalInfoRowLast: {
    borderBottomWidth: 0,
  },

  modalInfoLabel: {
    flexDirection: "row",
    alignItems: "center",
  },

  modalInfoIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },

  modalInfoLabelText: {
    marginLeft: 8,
    color: COLORS.secondaryText,
    fontSize: 9,
    fontWeight: "700",
  },

  modalInfoValue: {
    marginTop: 7,
    marginLeft: 36,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },

  modalActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
  },

  modalRejectButton: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.redBackground,
  },

  modalRejectText: {
    color: COLORS.red,
    fontSize: 11,
    fontWeight: "800",
  },

  modalApproveButton: {
    flex: 1.4,
    height: 44,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.purpleAccent,
  },

  modalApproveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  rejectModal: {
    width: "100%",
    padding: 20,
    borderRadius: 22,
    backgroundColor: COLORS.card,
  },

  rejectModalIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.redBackground,
  },

  rejectModalTitle: {
    marginTop: 15,
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "800",
  },

  rejectModalDescription: {
    marginTop: 6,
    color: COLORS.secondaryText,
    fontSize: 11,
    lineHeight: 17,
  },

  inputLabel: {
    marginTop: 18,
    marginBottom: 7,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800",
  },

  reasonInput: {
    minHeight: 105,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FAFAFC",
    color: COLORS.text,
    fontSize: 11,
  },

  characterCount: {
    marginTop: 5,
    textAlign: "right",
    color: COLORS.mutedText,
    fontSize: 9,
  },

  rejectModalActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 16,
  },

  cancelButton: {
    flex: 1,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F3F6",
  },

  cancelText: {
    color: COLORS.secondaryText,
    fontSize: 11,
    fontWeight: "800",
  },

  confirmRejectButton: {
    flex: 1.3,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.red,
  },

  confirmRejectText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});