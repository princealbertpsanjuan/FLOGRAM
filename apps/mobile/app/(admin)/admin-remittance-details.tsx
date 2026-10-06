import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AdminRiderRemittance,
  getAdminRemittanceById,
  rejectAdminRemittance,
  verifyAdminRemittance,
} from "../../services/admin";

import { ScreenLoader } from '../../components/ui/state-views';

import { getUploadUrl } from '../../utils/media';

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
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const first =
    remittance.riderUser?.firstName?.trim()?.charAt(0) || "";

  const last =
    remittance.riderUser?.lastName?.trim()?.charAt(0) || "";

  return `${first}${last}`.toUpperCase() || "R";
}

function getStatusData(status?: string) {
  switch (status) {
    case "verified":
      return {
        label: "Verified",
        background: COLORS.greenBackground,
        color: COLORS.green,
        icon: "checkmark-circle" as const,
      };

    case "rejected":
      return {
        label: "Rejected",
        background: COLORS.redBackground,
        color: COLORS.red,
        icon: "close-circle" as const,
      };

    case "submitted":
      return {
        label: "For Verification",
        background: COLORS.yellowBackground,
        color: COLORS.yellow,
        icon: "time" as const,
      };

    default:
      return {
        label: "Pending",
        background: COLORS.purpleLight,
        color: COLORS.purpleAccent,
        icon: "hourglass" as const,
      };
  }
}

export default function AdminRemittanceDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    remittanceId?: string;
  }>();

  const remittanceId = Array.isArray(params.remittanceId)
    ? params.remittanceId[0]
    : params.remittanceId;

  const [remittance, setRemittance] =
    useState<AdminRiderRemittance | null>(null);

  const [loading, setLoading] = useState(true);
  const [headerRefreshing, setHeaderRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rejectModalVisible, setRejectModalVisible] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const loadRemittance = useCallback(
    async (showLoader = true) => {
      if (!remittanceId) {
        setError("Remittance ID is missing.");

        if (showLoader) {
          setLoading(false);
        }

        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const data =
          await getAdminRemittanceById(remittanceId);

        setRemittance(data);
      } catch (err) {
        console.error(
          "Failed to load remittance:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load remittance details."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [remittanceId]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchRemittance = async () => {
        if (!remittanceId) {
          if (active) {
            setError("Remittance ID is missing.");
            setLoading(false);
          }

          return;
        }

        try {
          if (active) {
            setLoading(true);
            setError(null);
          }

          const data =
            await getAdminRemittanceById(remittanceId);

          if (active) {
            setRemittance(data);
          }
        } catch (err) {
          console.error(
            "Failed to load remittance:",
            err
          );

          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load remittance details."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void fetchRemittance();

      return () => {
        active = false;
      };
    }, [remittanceId])
  );

  const handleHeaderRefresh = useCallback(async () => {
    if (!remittanceId || headerRefreshing || processing) {
      return;
    }

    try {
      setHeaderRefreshing(true);
      setError(null);

      const data =
        await getAdminRemittanceById(remittanceId);

      setRemittance(data);
    } catch (err) {
      console.error(
        "Failed to refresh remittance:",
        err
      );

      Alert.alert(
        "Unable to Refresh",
        err instanceof Error
          ? err.message
          : "The remittance details could not be refreshed."
      );
    } finally {
      setHeaderRefreshing(false);
    }
  }, [headerRefreshing, processing, remittanceId]);

  const handleVerify = useCallback(() => {
    if (!remittance || processing) {
      return;
    }

    Alert.alert(
      "Verify Remittance",
      `Confirm that you have reviewed the proof and COD amount of ${formatCurrency(
        remittance.totalAmount
      )}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Verify",
          onPress: async () => {
            try {
              setProcessing(true);

              const updated =
                await verifyAdminRemittance(
                  remittance.id,
                  "COD remittance verified by Admin."
                );

              setRemittance(updated);

              Alert.alert(
                "Remittance Verified",
                "The rider's COD remittance has been verified successfully.",
                [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (err) {
              console.error(
                "Failed to verify remittance:",
                err
              );

              Alert.alert(
                "Unable to Verify",
                err instanceof Error
                  ? err.message
                  : "The remittance could not be verified."
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [processing, remittance, router]);

  const handleReject = useCallback(async () => {
    if (!remittance || processing) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      Alert.alert(
        "Reason Required",
        "Please enter a reason for rejecting this remittance."
      );

      return;
    }

    try {
      setProcessing(true);

      const updated =
        await rejectAdminRemittance(
          remittance.id,
          reason
        );

      setRemittance(updated);
      setRejectModalVisible(false);
      setRejectionReason("");

      Alert.alert(
        "Remittance Rejected",
        "The rider's COD remittance has been rejected. The rider can correct the submission and submit it again.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      console.error(
        "Failed to reject remittance:",
        err
      );

      Alert.alert(
        "Unable to Reject",
        err instanceof Error
          ? err.message
          : "The remittance could not be rejected."
      );
    } finally {
      setProcessing(false);
    }
  }, [
    processing,
    rejectionReason,
    remittance,
    router,
  ]);

  if (loading) {
    return (
      <ScreenLoader
        role="admin"
        message="Loading remittance..."
      />
    );
  }

  if (error || !remittance) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerEyebrow}>
              COD REMITTANCES
            </Text>

            <Text style={styles.headerTitle}>
              Remittance Details
            </Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={COLORS.red}
            />
          </View>

          <Text style={styles.errorTitle}>
            Unable to load remittance
          </Text>

          <Text style={styles.errorMessage}>
            {error || "Remittance was not found."}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadRemittance()}
          >
            <Text style={styles.retryButtonText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const status = getStatusData(remittance.status);

  const canReview =
    remittance.status === "submitted";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerEyebrow}>
            COD REMITTANCES
          </Text>

          <Text style={styles.headerTitle}>
            Remittance Details
          </Text>

          <Text style={styles.headerSubtitle}>
            Review rider COD submission
          </Text>
        </View>

        <Pressable
          style={[
            styles.headerButton,
            (headerRefreshing || processing) &&
              styles.headerButtonDisabled,
          ]}
          disabled={headerRefreshing || processing}
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
              size={19}
              color="#FFFFFF"
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          canReview && styles.scrollContentWithActions,
        ]}
      >
        <View style={styles.pageHeading}>
          <View style={styles.pageHeadingText}>
            <Text style={styles.pageEyebrow}>
              REMITTANCE RECORD
            </Text>

            <Text style={styles.pageTitle}>
              COD Remittance
            </Text>

            <Text style={styles.pageSubtitle}>
              Rider cash collection submission
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: status.background,
              },
            ]}
          >
            <Ionicons
              name={status.icon}
              size={14}
              color={status.color}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: status.color,
                },
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.amountCard}>
          <View style={styles.amountIcon}>
            <Ionicons
              name="wallet-outline"
              size={24}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.amountContent}>
            <Text style={styles.amountLabel}>
              Total COD Remittance
            </Text>

            <Text style={styles.amountValue}>
              {formatCurrency(remittance.totalAmount)}
            </Text>

            <Text style={styles.amountSubtext}>
              {remittance.deliveryCount}{" "}
              {remittance.deliveryCount === 1
                ? "delivery"
                : "deliveries"}{" "}
              included
            </Text>
          </View>
        </View>

        <SectionHeading
          eyebrow="RIDER"
          title="Rider Information"
        />

        <View style={styles.card}>
          <View style={styles.riderHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(remittance)}
              </Text>
            </View>

            <View style={styles.riderInfo}>
              <Text style={styles.riderName}>
                {getRiderName(remittance)}
              </Text>

              <Text style={styles.riderEmail}>
                {remittance.riderUser?.email ||
                  "No email available"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <InfoRow
            icon="call-outline"
            label="Contact"
            value={
              remittance.riderUser?.phoneNumber ||
              "Not provided"
            }
          />

          <InfoRow
            icon="bicycle-outline"
            label="Vehicle"
            value={
              remittance.rider?.vehicleType ||
              "Not provided"
            }
          />

          <InfoRow
            icon="card-outline"
            label="Plate Number"
            value={
              remittance.rider?.vehiclePlateNumber ||
              "Not provided"
            }
            last
          />
        </View>

        <SectionHeading
          eyebrow="SUBMISSION"
          title="Remittance Information"
        />

        <View style={styles.card}>
          <InfoRow
            icon="calendar-outline"
            label="Shift Date"
            value={formatDate(remittance.shiftDate)}
          />

          <InfoRow
            icon="document-text-outline"
            label="Reference Number"
            value={
              remittance.referenceNumber ||
              "Not provided"
            }
          />

          <InfoRow
            icon="time-outline"
            label="Submitted"
            value={formatDateTime(
              remittance.submittedAt
            )}
          />

          {remittance.verifiedAt ? (
            <InfoRow
              icon="checkmark-circle-outline"
              label="Verified"
              value={formatDateTime(
                remittance.verifiedAt
              )}
              last={!remittance.riderRemarks}
            />
          ) : null}

          {remittance.riderRemarks ? (
            <View style={styles.remarksSection}>
              <Text style={styles.remarksLabel}>
                Rider Remarks
              </Text>

              <Text style={styles.remarksText}>
                {remittance.riderRemarks}
              </Text>
            </View>
          ) : null}
        </View>

        <SectionHeading
          eyebrow="PAYMENT PROOF"
          title="Proof of Remittance"
        />

        <View style={styles.card}>
          {remittance.proofImageUrl ? (
            <>
              <View style={styles.proofHeader}>
                <View style={styles.proofIcon}>
                  <Ionicons
                    name="image-outline"
                    size={19}
                    color={COLORS.purpleAccent}
                  />
                </View>

                <View style={styles.proofHeaderText}>
                  <Text style={styles.proofTitle}>
                    Uploaded Proof
                  </Text>

                  <Text style={styles.proofSubtitle}>
                    Review the receipt before
                    verification.
                  </Text>
                </View>
              </View>

              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri:
                      getUploadUrl(
                        remittance.proofImageUrl
                      ) || undefined,
                  }}
                  style={styles.proofImage}
                  resizeMode="contain"
                />
              </View>
            </>
          ) : (
            <View style={styles.noProof}>
              <View style={styles.noProofIcon}>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={COLORS.purpleAccent}
                />
              </View>

              <Text style={styles.noProofTitle}>
                No proof available
              </Text>

              <Text style={styles.noProofText}>
                No proof image was attached to this
                remittance.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              COLLECTIONS
            </Text>

            <Text style={styles.sectionHeaderTitle}>
              COD Transactions
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {remittance.items?.length ||
                remittance.deliveryCount}
            </Text>
          </View>
        </View>

        {remittance.items &&
        remittance.items.length > 0 ? (
          <View style={styles.card}>
            {remittance.items.map((item, index) => {
              const order =
                typeof item.order === "object"
                  ? item.order
                  : null;

              const delivery =
                typeof item.delivery === "object"
                  ? item.delivery
                  : null;

              const orderId =
                order?._id ||
                order?.id ||
                item.orderId ||
                "Unknown";

              return (
                <View
                  key={
                    item.orderId ||
                    `${orderId}-${index}`
                  }
                  style={[
                    styles.transaction,
                    index ===
                      remittance.items!.length - 1 &&
                      styles.transactionLast,
                  ]}
                >
                  <View style={styles.transactionTop}>
                    <View
                      style={styles.transactionIcon}
                    >
                      <Ionicons
                        name="cube-outline"
                        size={17}
                        color={COLORS.purpleAccent}
                      />
                    </View>

                    <View
                      style={styles.transactionInfo}
                    >
                      <Text
                        style={styles.transactionTitle}
                      >
                        COD Order
                      </Text>

                      <Text
                        style={styles.transactionId}
                        numberOfLines={1}
                      >
                        {orderId}
                      </Text>
                    </View>

                    <Text
                      style={styles.transactionAmount}
                    >
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>

                  <View style={styles.transactionMeta}>
                    <View
                      style={
                        styles.transactionMetaItem
                      }
                    >
                      <Text
                        style={
                          styles.transactionMetaLabel
                        }
                      >
                        Payment
                      </Text>

                      <Text
                        style={
                          styles.transactionMetaValue
                        }
                      >
                        {order?.paymentStatus ||
                          "paid"}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.transactionMetaDivider
                      }
                    />

                    <View
                      style={
                        styles.transactionMetaItem
                      }
                    >
                      <Text
                        style={
                          styles.transactionMetaLabel
                        }
                      >
                        Delivery
                      </Text>

                      <Text
                        style={
                          styles.transactionMetaValue
                        }
                      >
                        {delivery?.status ||
                          order?.orderStatus ||
                          "delivered"}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.noTransactions}>
              <View
                style={styles.noTransactionsIcon}
              >
                <Ionicons
                  name="receipt-outline"
                  size={27}
                  color={COLORS.purpleAccent}
                />
              </View>

              <Text
                style={styles.noTransactionsTitle}
              >
                No transaction details
              </Text>

              <Text
                style={styles.noTransactionsText}
              >
                Transaction information is not
                available for this remittance.
              </Text>
            </View>
          </View>
        )}

        {remittance.adminRemarks ? (
          <>
            <SectionHeading
              eyebrow="ADMIN DECISION"
              title="Admin Remarks"
            />

            <View
              style={[
                styles.adminRemarksCard,
                remittance.status === "rejected"
                  ? styles.rejectedRemarks
                  : styles.verifiedRemarks,
              ]}
            >
              <View
                style={[
                  styles.adminRemarksIcon,
                  remittance.status === "rejected"
                    ? styles.adminRemarksIconRejected
                    : styles.adminRemarksIconVerified,
                ]}
              >
                <Ionicons
                  name={
                    remittance.status === "rejected"
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={20}
                  color={
                    remittance.status === "rejected"
                      ? COLORS.red
                      : COLORS.green
                  }
                />
              </View>

              <Text
                style={styles.adminRemarksText}
              >
                {remittance.adminRemarks}
              </Text>
            </View>
          </>
        ) : null}

        {canReview ? (
          <View style={styles.reviewNotice}>
            <View style={styles.reviewNoticeIcon}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={COLORS.yellow}
              />
            </View>

            <View style={styles.reviewNoticeContent}>
              <Text style={styles.reviewNoticeTitle}>
                Before verifying
              </Text>

              <Text style={styles.reviewNoticeText}>
                Check the reference number, uploaded
                proof, transaction count, and total
                amount before approving this
                remittance.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {canReview ? (
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.rejectButton,
              pressed &&
                !processing && {
                  opacity: 0.8,
                },
              processing && styles.disabledButton,
            ]}
            disabled={processing}
            onPress={() =>
              setRejectModalVisible(true)
            }
          >
            <Ionicons
              name="close"
              size={19}
              color={COLORS.red}
            />

            <Text style={styles.rejectButtonText}>
              Reject
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.verifyButton,
              pressed &&
                !processing && {
                  opacity: 0.85,
                },
              processing && styles.disabledButton,
            ]}
            disabled={processing}
            onPress={handleVerify}
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
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.verifyButtonText}
                >
                  Verify
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!processing) {
            setRejectModalVisible(false);
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
              if (!processing) {
                setRejectModalVisible(false);
              }
            }}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <View style={styles.modalIcon}>
                <Ionicons
                  name="close-circle-outline"
                  size={27}
                  color={COLORS.red}
                />
              </View>

              <Pressable
                style={styles.modalClose}
                disabled={processing}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason("");
                }}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={COLORS.secondaryText}
                />
              </Pressable>
            </View>

            <Text style={styles.modalTitle}>
              Reject Remittance
            </Text>

            <Text style={styles.modalDescription}>
              Enter the reason for rejecting this COD
              remittance. The rider will be able to
              correct and resubmit it.
            </Text>

            <Text style={styles.inputLabel}>
              Rejection Reason
            </Text>

            <TextInput
              style={styles.reasonInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Example: The reference number does not match the uploaded proof."
              placeholderTextColor={COLORS.mutedText}
              multiline
              maxLength={500}
              editable={!processing}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>
              {rejectionReason.length}/500
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                disabled={processing}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason("");
                }}
              >
                <Text
                  style={styles.cancelButtonText}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmRejectButton,
                  processing &&
                    styles.disabledButton,
                ]}
                disabled={processing}
                onPress={() =>
                  void handleReject()
                }
              >
                {processing ? (
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
                    Reject
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

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
};

function SectionHeading({
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionEyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.sectionHeadingTitle}>
        {title}
      </Text>
    </View>
  );
}

type InfoRowProps = {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: string;
  last?: boolean;
};

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: InfoRowProps) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.infoRowLast,
      ]}
    >
      <View style={styles.infoLabelContainer}>
        <View style={styles.infoIcon}>
          <Ionicons
            name={icon}
            size={15}
            color={COLORS.purpleAccent}
          />
        </View>

        <Text style={styles.infoLabel}>
          {label}
        </Text>
      </View>

      <Text
        style={styles.infoValue}
        numberOfLines={2}
      >
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    color: COLORS.secondaryText,
    fontSize: 12,
    marginTop: 12,
  },

  header: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 17,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: COLORS.purple,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerButtonDisabled: {
    opacity: 0.75,
  },

  headerPlaceholder: {
    width: 40,
    height: 40,
  },

  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },

  headerEyebrow: {
    color: "#C8C5F2",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },

  headerSubtitle: {
    color: "#D6D4F4",
    fontSize: 10,
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 18,
  },

  scrollContentWithActions: {
    paddingBottom: 100,
  },

  pageHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  pageHeadingText: {
    flex: 1,
    paddingRight: 10,
  },

  pageEyebrow: {
    color: COLORS.purpleAccent,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  pageTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "800",
    marginTop: 3,
  },

  pageSubtitle: {
    color: COLORS.secondaryText,
    fontSize: 10,
    marginTop: 3,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "800",
  },

  amountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.purple,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
  },

  amountIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.13)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  amountContent: {
    flex: 1,
  },

  amountLabel: {
    color: "#D6D4F4",
    fontSize: 10,
    fontWeight: "600",
  },

  amountValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 2,
  },

  amountSubtext: {
    color: "#C8C5F2",
    fontSize: 9,
    marginTop: 3,
  },

  sectionHeading: {
    marginBottom: 9,
    marginTop: 1,
  },

  sectionEyebrow: {
    color: COLORS.purpleAccent,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  sectionHeadingTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 20,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 13,
  },

  riderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  avatarText: {
    color: COLORS.purpleAccent,
    fontSize: 14,
    fontWeight: "800",
  },

  riderInfo: {
    flex: 1,
  },

  riderName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  riderEmail: {
    color: COLORS.secondaryText,
    fontSize: 10,
    marginTop: 3,
  },

  infoRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
  },

  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },

  infoLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  infoIcon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  infoLabel: {
    color: COLORS.secondaryText,
    fontSize: 10,
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
    maxWidth: "53%",
    textAlign: "right",
  },

  remarksSection: {
    paddingTop: 13,
  },

  remarksLabel: {
    color: COLORS.secondaryText,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 5,
  },

  remarksText: {
    color: COLORS.text,
    fontSize: 10,
    lineHeight: 16,
  },

  proofHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  proofIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  proofHeaderText: {
    flex: 1,
  },

  proofTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  proofSubtitle: {
    color: COLORS.secondaryText,
    fontSize: 9,
    marginTop: 2,
  },

  imageContainer: {
    width: "100%",
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#F5F5F8",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  proofImage: {
    width: "100%",
    height: 300,
  },

  noProof: {
    alignItems: "center",
    paddingVertical: 25,
  },

  noProofIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  noProofTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  noProofText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    marginTop: 5,
    textAlign: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
  },

  countText: {
    color: COLORS.purpleAccent,
    fontSize: 10,
    fontWeight: "800",
  },

  transaction: {
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  transactionLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },

  transactionTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  transactionIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  transactionInfo: {
    flex: 1,
  },

  transactionTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },

  transactionId: {
    color: COLORS.secondaryText,
    fontSize: 8,
    marginTop: 3,
    maxWidth: "90%",
  },

  transactionAmount: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    padding: 9,
    borderRadius: 11,
    backgroundColor: "#FAFAFC",
  },

  transactionMetaItem: {
    flex: 1,
  },

  transactionMetaDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },

  transactionMetaLabel: {
    color: COLORS.mutedText,
    fontSize: 8,
  },

  transactionMetaValue: {
    color: COLORS.secondaryText,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "capitalize",
  },

  noTransactions: {
    alignItems: "center",
    paddingVertical: 18,
  },

  noTransactionsIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.purpleLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  noTransactionsTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },

  noTransactionsText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 14,
    textAlign: "center",
    marginTop: 5,
  },

  adminRemarksCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 13,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
  },

  rejectedRemarks: {
    backgroundColor: COLORS.redBackground,
    borderColor: "#F7D5DC",
  },

  verifiedRemarks: {
    backgroundColor: COLORS.greenBackground,
    borderColor: "#D4ECDD",
  },

  adminRemarksIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  adminRemarksIconRejected: {
    backgroundColor: "#FFFFFF",
  },

  adminRemarksIconVerified: {
    backgroundColor: "#FFFFFF",
  },

  adminRemarksText: {
    flex: 1,
    color: COLORS.secondaryText,
    fontSize: 10,
    lineHeight: 16,
    paddingTop: 2,
  },

  reviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 13,
    borderRadius: 14,
    backgroundColor: COLORS.yellowBackground,
    borderWidth: 1,
    borderColor: "#F3E5BA",
  },

  reviewNoticeIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  reviewNoticeContent: {
    flex: 1,
  },

  reviewNoticeTitle: {
    color: COLORS.yellow,
    fontSize: 11,
    fontWeight: "800",
  },

  reviewNoticeText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  actionContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 17,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  rejectButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3C7D0",
    backgroundColor: COLORS.redBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  rejectButtonText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: "800",
  },

  verifyButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.purpleAccent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.55,
  },

  bottomSpace: {
    height: 30,
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  errorIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: COLORS.redBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },

  errorTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  errorMessage: {
    color: COLORS.secondaryText,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 280,
  },

  retryButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.purpleAccent,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20,20,30,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
  },

  modalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.redBackground,
    justifyContent: "center",
    alignItems: "center",
  },

  modalClose: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#F5F5F8",
    justifyContent: "center",
    alignItems: "center",
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 15,
  },

  modalDescription: {
    color: COLORS.secondaryText,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 16,
  },

  inputLabel: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 7,
  },

  reasonInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: "#FAFAFC",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 10,
    lineHeight: 16,
  },

  characterCount: {
    color: COLORS.mutedText,
    fontSize: 8,
    textAlign: "right",
    marginTop: 5,
  },

  modalActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 17,
  },

  cancelButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    color: COLORS.secondaryText,
    fontSize: 11,
    fontWeight: "700",
  },

  confirmRejectButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 13,
    backgroundColor: COLORS.red,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmRejectText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
});