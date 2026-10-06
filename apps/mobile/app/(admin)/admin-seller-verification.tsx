import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
  AdminFlorist,
  approveFlorist,
  getAdminFloristById,
  getPendingFlorists,
  rejectFlorist,
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

/* =========================================================
 * HELPERS
 * =======================================================*/

function getFloristId(florist: AdminFlorist) {
  return florist._id || florist.id || "";
}

function getOwner(florist: AdminFlorist) {
  if (florist.owner && typeof florist.owner === "object") {
    return florist.owner;
  }

  return null;
}

function getOwnerName(florist: AdminFlorist) {
  const owner = getOwner(florist);

  if (!owner) {
    return "Seller";
  }

  const firstName = owner.firstName?.trim() || "";
  const lastName = owner.lastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || owner.email || "Seller";
}

function getInitials(florist: AdminFlorist) {
  const shopName = florist.shopName?.trim();

  if (shopName) {
    const words = shopName.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      return (
        words[0].charAt(0) + words[1].charAt(0)
      ).toUpperCase();
    }

    return shopName.slice(0, 2).toUpperCase();
  }

  const owner = getOwner(florist);

  const first = owner?.firstName?.trim().charAt(0) || "";
  const last = owner?.lastName?.trim().charAt(0) || "";

  return `${first}${last}`.toUpperCase() || "S";
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

/* =========================================================
 * SCREEN
 * =======================================================*/

export default function AdminSellerVerificationScreen() {
  const router = useRouter();

  const [florists, setFlorists] = useState<AdminFlorist[]>([]);
  const [loading, setLoading] = useState(true);

  // Pull-to-refresh and header refresh are intentionally separate.
  const [refreshing, setRefreshing] = useState(false);
  const [headerRefreshing, setHeaderRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(
    null
  );

  const [selectedFlorist, setSelectedFlorist] =
    useState<AdminFlorist | null>(null);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  /* =======================================================
   * LOAD SELLERS
   * =======================================================*/

  const loadFlorists = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const data = await getPendingFlorists();

        setFlorists(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load pending sellers:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load pending seller applications."
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
      let active = true;

      const fetchFlorists = async () => {
        try {
          const data = await getPendingFlorists();

          if (!active) {
            return;
          }

          setFlorists(Array.isArray(data) ? data : []);
          setError(null);
        } catch (err) {
          console.error("Failed to load pending sellers:", err);

          if (!active) {
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load pending seller applications."
          );
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void fetchFlorists();

      return () => {
        active = false;
      };
    }, [])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadFlorists(false);
  }, [loadFlorists]);

  const handleHeaderRefresh = useCallback(async () => {
    if (headerRefreshing || processingId) {
      return;
    }

    try {
      setHeaderRefreshing(true);
      setError(null);

      const data = await getPendingFlorists();

      setFlorists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to refresh pending sellers:", err);

      Alert.alert(
        "Unable to Refresh",
        err instanceof Error
          ? err.message
          : "The seller applications could not be refreshed."
      );
    } finally {
      setHeaderRefreshing(false);
    }
  }, [headerRefreshing, processingId]);

  /* =======================================================
   * DETAILS
   * =======================================================*/

  const openDetails = useCallback(
    async (florist: AdminFlorist) => {
      const floristId = getFloristId(florist);

      if (!floristId) {
        Alert.alert(
          "Unable to Open",
          "The seller profile ID is missing."
        );
        return;
      }

      setSelectedFlorist(florist);
      setDetailsVisible(true);
      setDetailsLoading(true);

      try {
        const fullFlorist = await getAdminFloristById(floristId);
        setSelectedFlorist(fullFlorist);
      } catch (err) {
        console.error("Failed to load seller details:", err);

        Alert.alert(
          "Unable to Load Details",
          err instanceof Error
            ? err.message
            : "Seller details could not be loaded."
        );
      } finally {
        setDetailsLoading(false);
      }
    },
    []
  );

  /* =======================================================
   * APPROVE
   * =======================================================*/

  const handleApprove = useCallback((florist: AdminFlorist) => {
    const floristId = getFloristId(florist);

    if (!floristId) {
      Alert.alert(
        "Unable to Approve",
        "The seller profile ID is missing."
      );
      return;
    }

    Alert.alert(
      "Approve Seller",
      `Approve ${
        florist.shopName || getOwnerName(florist)
      } as a verified FLOGRAM seller?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: async () => {
            try {
              setProcessingId(floristId);

              await approveFlorist(floristId);

              setFlorists((current) =>
                current.filter(
                  (item) => getFloristId(item) !== floristId
                )
              );

              setDetailsVisible(false);
              setSelectedFlorist(null);

              Alert.alert(
                "Seller Approved",
                `${
                  florist.shopName || getOwnerName(florist)
                } has been approved successfully.`
              );
            } catch (err) {
              console.error("Failed to approve seller:", err);

              Alert.alert(
                "Unable to Approve",
                err instanceof Error
                  ? err.message
                  : "The seller could not be approved."
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  }, []);

  /* =======================================================
   * REJECT
   * =======================================================*/

  const openReject = useCallback((florist: AdminFlorist) => {
    setSelectedFlorist(florist);
    setRejectionReason("");
    setDetailsVisible(false);
    setRejectVisible(true);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!selectedFlorist) {
      return;
    }

    const floristId = getFloristId(selectedFlorist);

    if (!floristId) {
      Alert.alert(
        "Unable to Reject",
        "The seller profile ID is missing."
      );
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      Alert.alert(
        "Reason Required",
        "Please enter the reason for rejecting this seller application."
      );
      return;
    }

    try {
      setProcessingId(floristId);

      await rejectFlorist(floristId, reason);

      setFlorists((current) =>
        current.filter(
          (item) => getFloristId(item) !== floristId
        )
      );

      setRejectVisible(false);
      setSelectedFlorist(null);
      setRejectionReason("");

      Alert.alert(
        "Seller Rejected",
        "The seller application has been rejected."
      );
    } catch (err) {
      console.error("Failed to reject seller:", err);

      Alert.alert(
        "Unable to Reject",
        err instanceof Error
          ? err.message
          : "The seller application could not be rejected."
      );
    } finally {
      setProcessingId(null);
    }
  }, [rejectionReason, selectedFlorist]);

  /* =======================================================
   * LOADING
   * =======================================================*/

  if (loading && florists.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.purpleAccent}
        />

        <Text style={styles.loadingText}>
          Loading seller applications...
        </Text>
      </View>
    );
  }

  /* =======================================================
   * UI
   * =======================================================*/

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerDecoration} />

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
              Seller Verification
            </Text>

            <Text style={styles.headerSubtitle}>
              Review florist applications
            </Text>
          </View>

          <Pressable
            style={[
              styles.headerButton,
              (headerRefreshing || Boolean(processingId)) &&
                styles.headerButtonDisabled,
            ]}
            disabled={
              headerRefreshing || Boolean(processingId)
            }
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
              name="storefront-outline"
              size={20}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.headerSummaryContent}>
            <Text style={styles.headerSummaryLabel}>
              Pending Seller Applications
            </Text>

            <Text style={styles.headerSummarySubtext}>
              Waiting for Admin review
            </Text>
          </View>

          <Text style={styles.headerSummaryValue}>
            {florists.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
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
        <View style={styles.body}>
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
                Seller Applications
              </Text>

              <Text style={styles.introText}>
                Review florist shop information before allowing
                sellers to operate on FLOGRAM.
              </Text>
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
                  Unable to load sellers
                </Text>

                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>

              <Pressable
                onPress={() => void loadFlorists()}
              >
                <Text style={styles.retryText}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Pending Applications
              </Text>

              <Text style={styles.sectionSubtitle}>
                Florists awaiting verification
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {florists.length}
              </Text>
            </View>
          </View>

          {!error && florists.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={29}
                  color={COLORS.green}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No pending sellers
              </Text>

              <Text style={styles.emptyText}>
                There are currently no florist applications
                waiting for verification.
              </Text>
            </View>
          ) : null}

          {florists.map((florist) => {
            const floristId = getFloristId(florist);
            const owner = getOwner(florist);
            const processing =
              processingId === floristId;

            return (
              <View
                key={
                  floristId ||
                  `${florist.shopName}-${florist.createdAt}`
                }
                style={styles.sellerCard}
              >
                <Pressable
                  style={styles.sellerTop}
                  disabled={processing}
                  onPress={() =>
                    void openDetails(florist)
                  }
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(florist)}
                    </Text>
                  </View>

                  <View style={styles.sellerInfo}>
                    <Text
                      style={styles.shopName}
                      numberOfLines={1}
                    >
                      {florist.shopName ||
                        "Unnamed Shop"}
                    </Text>

                    <Text
                      style={styles.ownerName}
                      numberOfLines={1}
                    >
                      {getOwnerName(florist)}
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

                <View style={styles.contactContainer}>
                  <ContactRow
                    icon="mail-outline"
                    value={
                      florist.businessEmail ||
                      owner?.email ||
                      "Not provided"
                    }
                  />

                  <ContactRow
                    icon="call-outline"
                    value={
                      florist.contactNumber ||
                      owner?.phoneNumber ||
                      "Not provided"
                    }
                  />

                  <ContactRow
                    icon="calendar-outline"
                    value={`Applied ${formatDate(
                      florist.createdAt
                    )}`}
                  />
                </View>

                {florist.description ? (
                  <Pressable
                    style={styles.descriptionBox}
                    onPress={() =>
                      void openDetails(florist)
                    }
                  >
                    <Text
                      style={styles.descriptionText}
                      numberOfLines={2}
                    >
                      {florist.description}
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.mutedText}
                    />
                  </Pressable>
                ) : null}

                <View style={styles.cardActions}>
                  <Pressable
                    style={[
                      styles.rejectButton,
                      processing &&
                        styles.disabledButton,
                    ]}
                    disabled={processing}
                    onPress={() =>
                      openReject(florist)
                    }
                  >
                    <Ionicons
                      name="close"
                      size={17}
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
                      handleApprove(florist)
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
                          size={17}
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
        </View>
      </ScrollView>

      {/* DETAILS MODAL */}

      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processingId) {
            setDetailsVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!processingId) {
                setDetailsVisible(false);
              }
            }}
          />

          {selectedFlorist ? (
            <View style={styles.detailsModal}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>
                    SELLER VERIFICATION
                  </Text>

                  <Text style={styles.modalTitle}>
                    Seller Details
                  </Text>

                  <Text style={styles.modalSubtitle}>
                    Review florist application
                  </Text>
                </View>

                <Pressable
                  style={styles.closeButton}
                  disabled={Boolean(processingId)}
                  onPress={() =>
                    setDetailsVisible(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={19}
                    color={COLORS.text}
                  />
                </Pressable>
              </View>

              {detailsLoading ? (
                <View style={styles.detailsLoading}>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.purpleAccent}
                  />

                  <Text
                    style={styles.detailsLoadingText}
                  >
                    Loading seller details...
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.modalProfile}>
                    <View style={styles.largeAvatar}>
                      <Text
                        style={
                          styles.largeAvatarText
                        }
                      >
                        {getInitials(
                          selectedFlorist
                        )}
                      </Text>
                    </View>

                    <Text
                      style={styles.modalShopName}
                    >
                      {selectedFlorist.shopName ||
                        "Unnamed Shop"}
                    </Text>

                    <Text
                      style={styles.modalOwnerName}
                    >
                      Owned by{" "}
                      {getOwnerName(
                        selectedFlorist
                      )}
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

                  <Text
                    style={
                      styles.modalSectionTitle
                    }
                  >
                    Shop Information
                  </Text>

                  <View
                    style={styles.modalInfoCard}
                  >
                    <ModalInfoRow
                      icon="storefront-outline"
                      label="Shop Name"
                      value={
                        selectedFlorist.shopName ||
                        "Not provided"
                      }
                    />

                    <ModalInfoRow
                      icon="mail-outline"
                      label="Business Email"
                      value={
                        selectedFlorist.businessEmail ||
                        "Not provided"
                      }
                    />

                    <ModalInfoRow
                      icon="call-outline"
                      label="Contact Number"
                      value={
                        selectedFlorist.contactNumber ||
                        "Not provided"
                      }
                    />

                    <ModalInfoRow
                      icon="calendar-outline"
                      label="Application Date"
                      value={formatDate(
                        selectedFlorist.createdAt
                      )}
                      last
                    />
                  </View>

                  <Text
                    style={
                      styles.modalSectionTitle
                    }
                  >
                    Seller Information
                  </Text>

                  <View
                    style={styles.modalInfoCard}
                  >
                    <ModalInfoRow
                      icon="person-outline"
                      label="Seller"
                      value={getOwnerName(
                        selectedFlorist
                      )}
                    />

                    <ModalInfoRow
                      icon="mail-outline"
                      label="Email"
                      value={
                        getOwner(selectedFlorist)
                          ?.email ||
                        "Not provided"
                      }
                    />

                    <ModalInfoRow
                      icon="call-outline"
                      label="Phone"
                      value={
                        getOwner(selectedFlorist)
                          ?.phoneNumber ||
                        "Not provided"
                      }
                      last
                    />
                  </View>

                  <Text
                    style={
                      styles.modalSectionTitle
                    }
                  >
                    Shop Description
                  </Text>

                  <View
                    style={
                      styles.descriptionModalCard
                    }
                  >
                    <Text
                      style={
                        styles.descriptionModalText
                      }
                    >
                      {selectedFlorist.description ||
                        "No shop description was provided."}
                    </Text>
                  </View>

                  <RequirementDocumentsView
                    documents={selectedFlorist.documents}
                    loading={detailsLoading}
                  />
                </ScrollView>
              )}

              {!detailsLoading ? (
                <View style={styles.modalActions}>
                  <Pressable
                    style={[
                      styles.modalRejectButton,
                      processingId &&
                        styles.disabledButton,
                    ]}
                    disabled={Boolean(
                      processingId
                    )}
                    onPress={() =>
                      openReject(selectedFlorist)
                    }
                  >
                    <Ionicons
                      name="close"
                      size={17}
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
                    style={[
                      styles.modalApproveButton,
                      processingId &&
                        styles.disabledButton,
                    ]}
                    disabled={Boolean(
                      processingId
                    )}
                    onPress={() =>
                      handleApprove(
                        selectedFlorist
                      )
                    }
                  >
                    {processingId ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark"
                          size={17}
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.modalApproveText
                          }
                        >
                          Approve Seller
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>

      {/* REJECTION MODAL */}

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
            <View style={styles.rejectModalIcon}>
              <Ionicons
                name="close-circle-outline"
                size={29}
                color={COLORS.red}
              />
            </View>

            <Text style={styles.rejectModalTitle}>
              Reject Seller
            </Text>

            <Text
              style={
                styles.rejectModalDescription
              }
            >
              Enter the reason for rejecting{" "}
              {selectedFlorist?.shopName ||
                "this seller"}
              . This reason will be saved with the
              verification result.
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

            <Text style={styles.characterCount}>
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
                <Text style={styles.cancelText}>
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
                    Reject Seller
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

/* =========================================================
 * COMPONENTS
 * =======================================================*/

type ContactRowProps = {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  value: string;
};

function ContactRow({
  icon,
  value,
}: ContactRowProps) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>
        <Ionicons
          name={icon}
          size={14}
          color={COLORS.purpleAccent}
        />
      </View>

      <Text
        style={styles.contactText}
        numberOfLines={1}
      >
        {value}
      </Text>
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
      <View
        style={
          styles.modalInfoLabelContainer
        }
      >
        <View style={styles.modalInfoIcon}>
          <Ionicons
            name={icon}
            size={15}
            color={COLORS.purpleAccent}
          />
        </View>

        <Text style={styles.modalInfoLabel}>
          {label}
        </Text>
      </View>

      <Text style={styles.modalInfoValue}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
 * STYLES
 * =======================================================*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  /* HEADER */

  header: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 21,
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
    right: -70,
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
    justifyContent: "center",
  },

  headerButtonDisabled: {
    opacity: 0.7,
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

  headerSummary: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    padding: 12,
    borderRadius: 13,
    backgroundColor:
      "rgba(255,255,255,0.10)",
  },

  headerSummaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerSummaryContent: {
    flex: 1,
    marginLeft: 10,
  },

  headerSummaryLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  headerSummarySubtext: {
    color: "#D6D4EF",
    fontSize: 8,
    marginTop: 2,
  },

  headerSummaryValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  /* BODY */

  body: {
    paddingHorizontal: 15,
    paddingTop: 14,
    backgroundColor: COLORS.background,
  },

  introCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0F0F3",
    padding: 13,
    marginBottom: 16,

    shadowColor: "#000000",
    shadowOpacity: 0.035,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  introIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
  },

  introContent: {
    flex: 1,
    marginLeft: 10,
  },

  introTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },

  introText: {
    color: COLORS.secondaryText,
    fontSize: 8,
    lineHeight: 13,
    marginTop: 3,
  },

  /* ERROR */

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.redBackground,
    borderRadius: 12,
    padding: 11,
    marginBottom: 15,
  },

  errorIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
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

  /* SECTION */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: COLORS.mutedText,
    fontSize: 8,
    marginTop: 2,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  countText: {
    color: COLORS.purpleAccent,
    fontSize: 10,
    fontWeight: "800",
  },

  /* SELLER CARD */

  sellerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F3",

    shadowColor: "#000000",
    shadowOpacity: 0.035,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  sellerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  avatarText: {
    color: COLORS.purpleAccent,
    fontSize: 12,
    fontWeight: "800",
  },

  sellerInfo: {
    flex: 1,
    marginRight: 7,
  },

  shopName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  ownerName: {
    color: COLORS.secondaryText,
    fontSize: 8,
    marginTop: 3,
  },

  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      COLORS.yellowBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.yellow,
    marginRight: 4,
  },

  pendingText: {
    color: COLORS.yellow,
    fontSize: 7,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },

  contactContainer: {
    gap: 7,
    marginBottom: 11,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  contactIcon: {
    width: 25,
    height: 25,
    borderRadius: 7,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
  },

  contactText: {
    flex: 1,
    color: COLORS.secondaryText,
    fontSize: 8,
    marginLeft: 8,
  },

  descriptionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8FB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 11,
  },

  descriptionText: {
    flex: 1,
    color: COLORS.secondaryText,
    fontSize: 8,
    lineHeight: 13,
    marginRight: 7,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  rejectButton: {
    flex: 1,
    height: 39,
    borderRadius: 10,
    backgroundColor: COLORS.redBackground,
    borderWidth: 1,
    borderColor: "#F5D4DC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  rejectText: {
    color: COLORS.red,
    fontSize: 9,
    fontWeight: "800",
  },

  approveButton: {
    flex: 1.15,
    height: 39,
    borderRadius: 10,
    backgroundColor: COLORS.purpleAccent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  approveText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.5,
  },

  /* EMPTY */

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.greenBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },

  emptyText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 4,
  },

  /* MODALS */

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor:
      "rgba(24,24,27,0.55)",
  },

  detailsModal: {
    maxHeight: "88%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 17,

    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 10,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  modalEyebrow: {
    color: COLORS.purpleAccent,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },

  modalSubtitle: {
    color: COLORS.mutedText,
    fontSize: 8,
    marginTop: 2,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F3F6",
    alignItems: "center",
    justifyContent: "center",
  },

  detailsLoading: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
  },

  detailsLoadingText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    marginTop: 8,
  },

  modalProfile: {
    alignItems: "center",
    marginBottom: 19,
  },

  largeAvatar: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  largeAvatarText: {
    color: COLORS.purpleAccent,
    fontSize: 18,
    fontWeight: "800",
  },

  modalShopName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  modalOwnerName: {
    color: COLORS.secondaryText,
    fontSize: 9,
    marginTop: 3,
  },

  modalPendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      COLORS.yellowBackground,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
  },

  modalPendingText: {
    color: COLORS.yellow,
    fontSize: 8,
    fontWeight: "800",
  },

  modalSectionTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 3,
  },

  modalInfoCard: {
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 11,
    marginBottom: 15,
  },

  modalInfoRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },

  modalInfoRowLast: {
    borderBottomWidth: 0,
  },

  modalInfoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },

  modalInfoIcon: {
    width: 29,
    height: 29,
    borderRadius: 8,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  modalInfoLabel: {
    color: COLORS.secondaryText,
    fontSize: 8,
  },

  modalInfoValue: {
    color: COLORS.text,
    fontSize: 8,
    fontWeight: "600",
    textAlign: "right",
    maxWidth: "53%",
  },

  descriptionModalCard: {
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  descriptionModalText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 15,
  },

  modalActions: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 13,
    marginTop: 3,
  },

  modalRejectButton: {
    flex: 1,
    height: 41,
    borderRadius: 10,
    backgroundColor: COLORS.redBackground,
    borderWidth: 1,
    borderColor: "#F5D4DC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  modalRejectText: {
    color: COLORS.red,
    fontSize: 9,
    fontWeight: "800",
  },

  modalApproveButton: {
    flex: 1.3,
    height: 41,
    borderRadius: 10,
    backgroundColor: COLORS.purpleAccent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  modalApproveText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  /* REJECT MODAL */

  rejectModal: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,

    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 10,
  },

  rejectModalIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.redBackground,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },

  rejectModalTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 11,
  },

  rejectModalDescription: {
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 15,
  },

  inputLabel: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 6,
  },

  reasonInput: {
    minHeight: 105,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: "#FAFAFC",
    color: COLORS.text,
    fontSize: 10,
    padding: 11,
  },

  characterCount: {
    color: COLORS.mutedText,
    fontSize: 8,
    textAlign: "right",
    marginTop: 5,
  },

  rejectModalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },

  cancelButton: {
    flex: 1,
    height: 41,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F7F7FA",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    fontWeight: "800",
  },

  confirmRejectButton: {
    flex: 1.2,
    height: 41,
    borderRadius: 10,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmRejectText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: COLORS.secondaryText,
    fontSize: 10,
    marginTop: 10,
  },

  bottomSpace: {
    height: 30,
  },
});