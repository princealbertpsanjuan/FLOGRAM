import {
  type ComponentProps,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import * as ImagePicker from 'expo-image-picker';

import {
  getRiderWallet,
  submitRiderRemittance,
  type RiderDailyRemittance,
  type RiderRemittanceStatus,
  type RiderWalletData,
  type RiderWalletTransaction,
} from '../../services/delivery';

/*
 * =========================================================
 * RIDER WALLET
 * =========================================================
 *
 * BUSINESS RULES
 *
 * 1. This is NOT Rider salary / earnings.
 *
 * 2. Rider Wallet represents COD money that
 *    was physically collected by the Rider.
 *
 * 3. All delivered + paid COD orders from
 *    one Philippine calendar day are grouped
 *    into ONE daily shift remittance.
 *
 * 4. Rider submits ONE reference number,
 *    ONE proof image, and optional remarks
 *    for that complete daily remittance.
 *
 * 5. PayMongo / online payments are shown
 *    for transaction history only.
 *
 * 6. Online payments must never be included
 *    in Rider remittance.
 * =========================================================
 */

/*
 * =========================================================
 * COLORS
 * =========================================================
 */

const GOLD = '#D4A12A';
const GOLD_DARK = '#B78316';
const GOLD_LIGHT = '#FFF7E5';

const BACKGROUND = '#F5F4F5';
const WHITE = '#FFFFFF';

const TEXT = '#3E393C';
const GRAY = '#8C878A';
const LIGHT_GRAY = '#ECE9EB';

const GREEN = '#39A96B';
const GREEN_LIGHT = '#EAF8F0';

const BLUE = '#6487B5';
const BLUE_LIGHT = '#EDF4FC';

const RED = '#D65B5B';
const RED_LIGHT = '#FDEEEE';

const ORANGE = '#D28A2E';
const ORANGE_LIGHT = '#FFF3E3';

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const getErrorMessage = (
  error: unknown
) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message === 'string'
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return 'Something went wrong. Please try again.';
};

const formatMoney = (
  value?: number | null
) => {
  const amount =
    Number(value || 0);

  return `₱${amount.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatTransactionDate = (
  value?: string | null
) => {
  if (!value) {
    return 'Date unavailable';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Date unavailable';
  }

  return date.toLocaleString(
    'en-PH',
    {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );
};

/*
 * shiftDate is stored by the backend as a
 * logical Philippine date at UTC midnight.
 *
 * We use the YYYY-MM-DD portion directly so
 * another device timezone cannot accidentally
 * display the previous/next date.
 */

const formatShiftDate = (
  value?: string | null
) => {
  if (!value) {
    return 'Shift date unavailable';
  }

  const datePart =
    value.slice(0, 10);

  const parts =
    datePart.split('-');

  if (
    parts.length !== 3
  ) {
    return 'Shift date unavailable';
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return 'Shift date unavailable';
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return date.toLocaleDateString(
    'en-PH',
    {
      timeZone: 'UTC',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
};

const getShortOrderId = (
  orderId?: string | null
) => {
  if (!orderId) {
    return '------';
  }

  if (
    orderId.length <= 8
  ) {
    return orderId.toUpperCase();
  }

  return orderId
    .slice(-8)
    .toUpperCase();
};

const isCODTransaction = (
  transaction:
    RiderWalletTransaction
) =>
  String(
    transaction.paymentMethod ||
      ''
  ).toLowerCase() ===
  'cash_on_delivery';

const canSubmitRemittance = (
  status:
    RiderRemittanceStatus
) =>
  status === 'pending' ||
  status === 'rejected';

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function RiderWalletScreen() {
  /*
   * -----------------------------------------------------
   * WALLET STATE
   * -----------------------------------------------------
   */

  const [
    walletData,
    setWalletData,
  ] =
    useState<RiderWalletData | null>(
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
    useState<string | null>(
      null
    );

  /*
   * -----------------------------------------------------
   * SELECTED DAILY REMITTANCE
   * -----------------------------------------------------
   */

  const [
    selectedRemittance,
    setSelectedRemittance,
  ] =
    useState<RiderDailyRemittance | null>(
      null
    );

  const [
    remittanceModalVisible,
    setRemittanceModalVisible,
  ] =
    useState(false);

  const [
    referenceNumber,
    setReferenceNumber,
  ] =
    useState('');

  const [
    riderRemarks,
    setRiderRemarks,
  ] =
    useState('');

  const [
    proofImage,
    setProofImage,
  ] =
    useState<ImagePicker.ImagePickerAsset | null>(
      null
    );

  const [
    submittingRemittance,
    setSubmittingRemittance,
  ] =
    useState(false);

  /*
   * -----------------------------------------------------
   * LOAD WALLET
   * -----------------------------------------------------
   */

  const loadWallet =
    useCallback(
      async (
        options?: {
          silent?: boolean;
        }
      ) => {
        const silent =
          Boolean(
            options?.silent
          );

        try {
          if (!silent) {
            setLoading(true);
          }

          setErrorMessage(
            null
          );

          const data =
            await getRiderWallet();

          setWalletData(
            data
          );
        } catch (error) {
          const message =
            getErrorMessage(
              error
            );

          setErrorMessage(
            message
          );

          if (!silent) {
            setWalletData(
              null
            );
          }
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      []
    );

  /*
   * -----------------------------------------------------
   * REFRESH WHEN SCREEN GETS FOCUS
   * -----------------------------------------------------
   */

  useFocusEffect(
    useCallback(() => {
      void loadWallet();

      return undefined;
    }, [loadWallet])
  );

  /*
   * -----------------------------------------------------
   * PULL TO REFRESH
   * -----------------------------------------------------
   */

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(
          true
        );

        await loadWallet({
          silent: true,
        });
      } finally {
        setRefreshing(
          false
        );
      }
    }, [loadWallet]);

  /*
   * -----------------------------------------------------
   * TRANSACTIONS
   * -----------------------------------------------------
   */

  const transactions =
    useMemo(
      () =>
        walletData
          ?.transactions ??
        [],
      [
        walletData
          ?.transactions,
      ]
    );

  const codTransactions =
    useMemo(
      () =>
        transactions.filter(
          isCODTransaction
        ),
      [transactions]
    );

  const onlineTransactions =
    useMemo(
      () =>
        transactions.filter(
          transaction =>
            !isCODTransaction(
              transaction
            )
        ),
      [transactions]
    );

  const onlinePaymentTotal =
    useMemo(
      () =>
        onlineTransactions.reduce(
          (
            total,
            transaction
          ) =>
            total +
            Number(
              transaction.amount ||
                0
            ),
          0
        ),
      [onlineTransactions]
    );

  /*
   * -----------------------------------------------------
   * DAILY REMITTANCES
   * -----------------------------------------------------
   */

  const remittances =
    useMemo(
      () =>
        walletData
          ?.remittances ??
        [],
      [
        walletData
          ?.remittances,
      ]
    );

  /*
   * -----------------------------------------------------
   * SUMMARY VALUES
   * -----------------------------------------------------
   */

  const cashCollectedToday =
    walletData?.summary
      .cashCollectedToday ??
    0;

  const totalCashCollected =
    walletData?.summary
      .totalCashCollected ??
    0;

  const pendingRemittance =
    walletData?.summary
      .pendingRemittance ??
    0;

  const submittedRemittance =
    walletData?.summary
      .submittedRemittance ??
    0;

  const verifiedRemittance =
    walletData?.summary
      .verifiedRemittance ??
    0;

  const rejectedRemittance =
    walletData?.summary
      .rejectedRemittance ??
    0;

  /*
   * =====================================================
   * REMITTANCE SUBMISSION
   * =====================================================
   */

  const resetRemittanceForm =
    useCallback(() => {
      setSelectedRemittance(
        null
      );

      setReferenceNumber(
        ''
      );

      setRiderRemarks(
        ''
      );

      setProofImage(
        null
      );
    }, []);

  const closeRemittanceModal =
    useCallback(() => {
      if (
        submittingRemittance
      ) {
        return;
      }

      setRemittanceModalVisible(
        false
      );

      resetRemittanceForm();
    }, [
      resetRemittanceForm,
      submittingRemittance,
    ]);

  const openRemittanceModal =
    useCallback(
      (
        remittance:
          RiderDailyRemittance
      ) => {
        if (
          !remittance?.id
        ) {
          Alert.alert(
            'Unable to Submit',
            'The daily remittance record could not be found.'
          );

          return;
        }

        if (
          !canSubmitRemittance(
            remittance.status
          )
        ) {
          return;
        }

        setSelectedRemittance(
          remittance
        );

        setReferenceNumber(
          ''
        );

        setRiderRemarks(
          ''
        );

        setProofImage(
          null
        );

        setRemittanceModalVisible(
          true
        );
      },
      []
    );

  /*
   * -----------------------------------------------------
   * CAMERA
   * -----------------------------------------------------
   */

  const takeProofPhoto =
    useCallback(async () => {
      try {
        const permission =
          await ImagePicker
            .requestCameraPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to take a photo of your remittance proof.'
          );

          return;
        }

        const result =
          await ImagePicker
            .launchCameraAsync({
              mediaTypes: [
                'images',
              ],
              allowsEditing:
                true,
              quality: 0.8,
            });

        if (
          !result.canceled &&
          result.assets
            .length > 0
        ) {
          setProofImage(
            result.assets[0]
          );
        }
      } catch (error) {
        Alert.alert(
          'Camera Error',
          getErrorMessage(
            error
          )
        );
      }
    }, []);

  /*
   * -----------------------------------------------------
   * GALLERY
   * -----------------------------------------------------
   */

  const chooseProofPhoto =
    useCallback(async () => {
      try {
        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            'Photo Permission Required',
            'Please allow photo access to select your remittance proof.'
          );

          return;
        }

        const result =
          await ImagePicker
            .launchImageLibraryAsync({
              mediaTypes: [
                'images',
              ],
              allowsEditing:
                true,
              quality: 0.8,
            });

        if (
          !result.canceled &&
          result.assets
            .length > 0
        ) {
          setProofImage(
            result.assets[0]
          );
        }
      } catch (error) {
        Alert.alert(
          'Gallery Error',
          getErrorMessage(
            error
          )
        );
      }
    }, []);

  /*
   * -----------------------------------------------------
   * SUBMIT COMPLETE DAILY REMITTANCE
   * -----------------------------------------------------
   */

  const handleSubmitRemittance =
    useCallback(async () => {
      if (
        !selectedRemittance
          ?.id
      ) {
        Alert.alert(
          'Unable to Submit',
          'The daily remittance record could not be found.'
        );

        return;
      }

      const cleanReference =
        referenceNumber.trim();

      if (
        !cleanReference
      ) {
        Alert.alert(
          'Reference Number Required',
          'Enter the reference number for your remittance.'
        );

        return;
      }

      if (
        !proofImage?.uri
      ) {
        Alert.alert(
          'Proof Required',
          'Take a photo or choose an image of your remittance proof.'
        );

        return;
      }

      try {
        setSubmittingRemittance(
          true
        );

        await submitRiderRemittance(
          selectedRemittance.id,
          {
            referenceNumber:
              cleanReference,

            riderRemarks:
              riderRemarks.trim(),

            proofImageUri:
              proofImage.uri,

            proofImageName:
              proofImage.fileName ??
              undefined,

            proofImageType:
              proofImage.mimeType ??
              undefined,
          }
        );

        setRemittanceModalVisible(
          false
        );

        resetRemittanceForm();

        await loadWallet({
          silent: true,
        });

        Alert.alert(
          'Remittance Submitted',
          'Your complete shift remittance was submitted successfully and is awaiting admin verification.'
        );
      } catch (error) {
        Alert.alert(
          'Submission Failed',
          getErrorMessage(
            error
          )
        );
      } finally {
        setSubmittingRemittance(
          false
        );
      }
    }, [
      loadWallet,
      proofImage,
      referenceNumber,
      resetRemittanceForm,
      riderRemarks,
      selectedRemittance,
    ]);

  /*
   * =====================================================
   * NAVIGATION
   * =====================================================
   */

  const goDashboard =
  useCallback(() => {
    router.replace(
      '/(rider)/rider-dashboard'
    );
  }, []);

const goDeliveries =
  useCallback(() => {
    router.push(
      '/(rider)/rider-deliveries'
    );
  }, []);

const goWallet =
  useCallback(() => {
    router.replace(
      '/(rider)/rider-wallet'
    );
  }, []);

const goAlerts =
  useCallback(() => {
    router.push(
      '/(rider)/rider-alerts'
    );
  }, []);

const goStats =
  useCallback(() => {
    router.push(
      '/(rider)/rider-stats'
    );
  }, []);

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (
    loading &&
    !walletData
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.centerState
          }
        >
          <ActivityIndicator
            size="large"
            color={GOLD}
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading Wallet
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Getting your COD
            collection and daily
            remittance records.
          </Text>
        </View>

<BottomNavigation
  onDashboard={
    goDashboard
  }
  onDeliveries={
    goDeliveries
  }
  onWallet={
    goWallet
  }
  onAlerts={
    goAlerts
  }
  onStats={
    goStats
  }
/>
      </SafeAreaView>
    );
  }

  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (
    errorMessage &&
    !walletData
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.centerState
          }
        >
          <View
            style={
              styles.errorIconCircle
            }
          >
            <Ionicons
              name="warning-outline"
              size={30}
              color={RED}
            />
          </View>

          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to Load Wallet
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={() =>
              void loadWallet()
            }
          >
            <Ionicons
              name="refresh"
              size={14}
              color={WHITE}
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
  onDashboard={
    goDashboard
  }
  onDeliveries={
    goDeliveries
  }
  onWallet={
    goWallet
  }
  onAlerts={
    goAlerts
  }
  onStats={
    goStats
  }
/>
      </SafeAreaView>
    );
  }

  /*
   * =====================================================
   * MAIN UI
   * =====================================================
   */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
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
            tintColor={
              GOLD
            }
            colors={[
              GOLD,
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
              styles.headerTopRow
            }
          >
            <View>
              <Text
                style={
                  styles.headerEyebrow
                }
              >
                RIDER WALLET
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                Cash & Remittance
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Track COD collections
                and remit your complete
                shift cash to FLOGRAM.
              </Text>
            </View>

            <View
              style={
                styles.walletIconCircle
              }
            >
              <Ionicons
                name="wallet-outline"
                size={24}
                color={WHITE}
              />
            </View>
          </View>

          <View
            style={
              styles.todayCashCard
            }
          >
            <View>
              <Text
                style={
                  styles.todayCashLabel
                }
              >
                Cash Collected Today
              </Text>

              <Text
                style={
                  styles.todayCashAmount
                }
              >
                {formatMoney(
                  cashCollectedToday
                )}
              </Text>

              <Text
                style={
                  styles.todayCashHint
                }
              >
                COD only
              </Text>
            </View>

            <View
              style={
                styles.todayCashIcon
              }
            >
              <MaterialCommunityIcons
                name="cash-multiple"
                size={25}
                color={GOLD_DARK}
              />
            </View>
          </View>
        </View>

        <View
          style={
            styles.content
          }
        >
          {/*
           * =================================================
           * WALLET SUMMARY
           * =================================================
           */}

          <Text
            style={
              styles.sectionTitle
            }
          >
            Wallet Summary
          </Text>

          <View
            style={
              styles.summaryRow
            }
          >
            <SummaryCard
              icon="time-outline"
              label="Pending Remittance"
              value={formatMoney(
                pendingRemittance
              )}
              tone="orange"
            />

            <SummaryCard
              icon="cash-outline"
              label="Total COD Collected"
              value={formatMoney(
                totalCashCollected
              )}
              tone="gold"
            />
          </View>

          {/*
           * =================================================
           * REMITTANCE TOTALS
           * =================================================
           */}

          <View
            style={
              styles.remittanceCard
            }
          >
            <View
              style={
                styles.cardTitleRow
              }
            >
              <View
                style={
                  styles.cardTitleIcon
                }
              >
                <MaterialCommunityIcons
                  name="bank-transfer"
                  size={18}
                  color={GOLD_DARK}
                />
              </View>

              <View>
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  COD Remittance
                </Text>

                <Text
                  style={
                    styles.cardSubtitle
                  }
                >
                  Daily shift remittance status
                </Text>
              </View>
            </View>

            <View
              style={
                styles.remittanceStatusRow
              }
            >
              <RemittanceSummary
                label="Pending"
                value={
                  pendingRemittance
                }
                tone="pending"
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <RemittanceSummary
                label="Submitted"
                value={
                  submittedRemittance
                }
                tone="submitted"
              />

              <View
                style={
                  styles.summaryDivider
                }
              />

              <RemittanceSummary
                label="Verified"
                value={
                  verifiedRemittance
                }
                tone="verified"
              />
            </View>

            {rejectedRemittance >
            0 ? (
              <View
                style={
                  styles.rejectedSummary
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color={RED}
                />

                <Text
                  style={
                    styles.rejectedSummaryText
                  }
                >
                  Rejected:{' '}
                  {formatMoney(
                    rejectedRemittance
                  )}
                </Text>
              </View>
            ) : null}
          </View>

          {/*
           * =================================================
           * CURRENT SHIFT
           * =================================================
           */}

          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitleNoMargin
                }
              >
                Current Shift
              </Text>

              <Text
                style={
                  styles.sectionDescription
                }
              >
                Todays Philippine COD collection
              </Text>
            </View>
          </View>

          {walletData?.currentShift ? (
            <CurrentShiftCard
              shift={
                walletData.currentShift
              }
              remittance={
                remittances.find(
                  item =>
                    item.id ===
                    walletData
                      .currentShift
                      ?.remittanceId
                ) ?? null
              }
              onSubmit={
                openRemittanceModal
              }
            />
          ) : (
            <View
              style={
                styles.noCurrentShiftCard
              }
            >
              <View
                style={
                  styles.noCurrentShiftIcon
                }
              >
                <MaterialCommunityIcons
                  name="cash-clock"
                  size={23}
                  color={GRAY}
                />
              </View>

              <View
                style={
                  styles.noCurrentShiftContent
                }
              >
                <Text
                  style={
                    styles.noCurrentShiftTitle
                  }
                >
                  No COD Collection Today
                </Text>

                <Text
                  style={
                    styles.noCurrentShiftText
                  }
                >
                  A shift remittance will
                  appear here after you
                  successfully deliver and
                  collect a COD order today.
                </Text>
              </View>
            </View>
          )}

          {/*
           * =================================================
           * DAILY REMITTANCES
           * =================================================
           */}

          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitleNoMargin
                }
              >
                Daily Remittances
              </Text>

              <Text
                style={
                  styles.sectionDescription
                }
              >
                One remittance per shift/day
              </Text>
            </View>

            <View
              style={
                styles.countBadge
              }
            >
              <Text
                style={
                  styles.countBadgeText
                }
              >
                {remittances.length}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.dailyRemittanceContainer
            }
          >
            {remittances.length ===
            0 ? (
              <View
                style={
                  styles.emptyRemittances
                }
              >
                <MaterialCommunityIcons
                  name="bank-transfer"
                  size={27}
                  color="#BEB9BC"
                />

                <Text
                  style={
                    styles.emptyTransactionsTitle
                  }
                >
                  No Remittances Yet
                </Text>

                <Text
                  style={
                    styles.emptyTransactionsText
                  }
                >
                  Daily COD remittances
                  will appear here after
                  completed COD deliveries.
                </Text>
              </View>
            ) : (
              remittances.map(
                remittance => (
                  <DailyRemittanceCard
                    key={
                      remittance.id
                    }
                    remittance={
                      remittance
                    }
                    onSubmit={
                      openRemittanceModal
                    }
                  />
                )
              )
            )}
          </View>

          {/*
           * =================================================
           * COD TRANSACTIONS
           * =================================================
           */}

          <WalletSection
            title="Cash on Delivery"
            total={
              totalCashCollected
            }
            iconType="cash"
            transactions={
              codTransactions
            }
          />

          {/*
           * =================================================
           * ONLINE PAYMENTS
           * =================================================
           */}

          <WalletSection
            title="Online Payment"
            total={
              onlinePaymentTotal
            }
            iconType="online"
            transactions={
              onlineTransactions
            }
          />

          {/*
           * =================================================
           * INFO
           * =================================================
           */}

          <View
            style={
              styles.infoCard
            }
          >
            <View
              style={
                styles.infoIcon
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={19}
                color={BLUE}
              />
            </View>

            <View
              style={
                styles.infoContent
              }
            >
              <Text
                style={
                  styles.infoTitle
                }
              >
                About Rider Wallet
              </Text>

              <Text
                style={
                  styles.infoText
                }
              >
                All COD payments collected
                during the same Philippine
                day are grouped into one
                shift remittance. Submit one
                proof and reference number
                for the complete shift total.
                Online payments are shown
                only for transaction history.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </View>
      </ScrollView>

      {/*
       * =====================================================
       * REMITTANCE MODAL
       * =====================================================
       */}

      <Modal
        visible={
          remittanceModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={
          closeRemittanceModal
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalHeader
              }
            >
              <View
                style={
                  styles.modalHeaderText
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {selectedRemittance
                    ?.status ===
                  'rejected'
                    ? 'Resubmit Shift Remittance'
                    : 'Submit Shift Remittance'}
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Complete daily COD cash
                </Text>
              </View>

              <Pressable
                style={
                  styles.modalCloseButton
                }
                disabled={
                  submittingRemittance
                }
                onPress={
                  closeRemittanceModal
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={TEXT}
                />
              </Pressable>
            </View>

            {selectedRemittance ? (
              <View
                style={
                  styles.selectedRemittanceCard
                }
              >
                <View
                  style={
                    styles.selectedShiftInfo
                  }
                >
                  <Text
                    style={
                      styles.selectedRemittanceLabel
                    }
                  >
                    Shift Date
                  </Text>

                  <Text
                    style={
                      styles.selectedShiftDate
                    }
                  >
                    {formatShiftDate(
                      selectedRemittance
                        .shiftDate
                    )}
                  </Text>

                  <Text
                    style={
                      styles.selectedDeliveryCount
                    }
                  >
                    {
                      selectedRemittance
                        .deliveryCount
                    }{' '}
                    {selectedRemittance
                      .deliveryCount ===
                    1
                      ? 'COD delivery'
                      : 'COD deliveries'}
                  </Text>
                </View>

                <View
                  style={
                    styles.selectedAmountArea
                  }
                >
                  <Text
                    style={
                      styles.selectedRemittanceLabel
                    }
                  >
                    Amount to Remit
                  </Text>

                  <Text
                    style={
                      styles.selectedRemittanceAmount
                    }
                  >
                    {formatMoney(
                      selectedRemittance
                        .totalAmount
                    )}
                  </Text>
                </View>
              </View>
            ) : null}

            {selectedRemittance
              ?.status ===
              'rejected' &&
            selectedRemittance
              .adminRemarks ? (
              <View
                style={
                  styles.modalRejectedNotice
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={RED}
                />

                <View
                  style={
                    styles.modalRejectedTextArea
                  }
                >
                  <Text
                    style={
                      styles.modalRejectedTitle
                    }
                  >
                    Previous submission rejected
                  </Text>

                  <Text
                    style={
                      styles.modalRejectedText
                    }
                  >
                    {
                      selectedRemittance
                        .adminRemarks
                    }
                  </Text>
                </View>
              </View>
            ) : null}

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalScrollContent
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Reference Number *
              </Text>

              <TextInput
                value={
                  referenceNumber
                }
                onChangeText={
                  setReferenceNumber
                }
                editable={
                  !submittingRemittance
                }
                placeholder="Enter remittance reference number"
                placeholderTextColor="#B2ACAF"
                autoCapitalize="characters"
                style={
                  styles.textInput
                }
              />

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Proof of Remittance *
              </Text>

              {proofImage?.uri ? (
                <View
                  style={
                    styles.proofPreviewContainer
                  }
                >
                  <Image
                    source={{
                      uri:
                        proofImage.uri,
                    }}
                    style={
                      styles.proofPreview
                    }
                    resizeMode="cover"
                  />

                  <Pressable
                    style={
                      styles.removeProofButton
                    }
                    disabled={
                      submittingRemittance
                    }
                    onPress={() =>
                      setProofImage(
                        null
                      )
                    }
                  >
                    <Ionicons
                      name="close"
                      size={15}
                      color={WHITE}
                    />
                  </Pressable>
                </View>
              ) : (
                <View
                  style={
                    styles.emptyProof
                  }
                >
                  <Ionicons
                    name="image-outline"
                    size={29}
                    color="#BEB8BB"
                  />

                  <Text
                    style={
                      styles.emptyProofTitle
                    }
                  >
                    No proof selected
                  </Text>

                  <Text
                    style={
                      styles.emptyProofText
                    }
                  >
                    Upload a clear image
                    showing proof that the
                    complete shift amount
                    was remitted.
                  </Text>
                </View>
              )}

              <View
                style={
                  styles.proofActions
                }
              >
                <Pressable
                  style={
                    styles.proofActionButton
                  }
                  disabled={
                    submittingRemittance
                  }
                  onPress={
                    takeProofPhoto
                  }
                >
                  <Ionicons
                    name="camera-outline"
                    size={15}
                    color={
                      GOLD_DARK
                    }
                  />

                  <Text
                    style={
                      styles.proofActionText
                    }
                  >
                    Take Photo
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.proofActionButton
                  }
                  disabled={
                    submittingRemittance
                  }
                  onPress={
                    chooseProofPhoto
                  }
                >
                  <Ionicons
                    name="images-outline"
                    size={15}
                    color={
                      GOLD_DARK
                    }
                  />

                  <Text
                    style={
                      styles.proofActionText
                    }
                  >
                    Gallery
                  </Text>
                </Pressable>
              </View>

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Remarks
              </Text>

              <TextInput
                value={
                  riderRemarks
                }
                onChangeText={
                  setRiderRemarks
                }
                editable={
                  !submittingRemittance
                }
                placeholder="Optional remarks"
                placeholderTextColor="#B2ACAF"
                multiline
                textAlignVertical="top"
                style={[
                  styles.textInput,
                  styles.remarksInput,
                ]}
              />

              <View
                style={
                  styles.remittanceNotice
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color={BLUE}
                />

                <Text
                  style={
                    styles.remittanceNoticeText
                  }
                >
                  This submission covers
                  every COD delivery included
                  in this shift. Make sure
                  your reference number,
                  proof image, and complete
                  remittance amount are
                  correct before submitting.
                </Text>
              </View>

              <Pressable
                style={[
                  styles.confirmRemittanceButton,

                  submittingRemittance &&
                    styles.disabledRemittanceButton,
                ]}
                disabled={
                  submittingRemittance
                }
                onPress={
                  handleSubmitRemittance
                }
              >
                {submittingRemittance ? (
                  <ActivityIndicator
                    size="small"
                    color={WHITE}
                  />
                ) : (
                  <>
                    <Ionicons
                      name={
                        selectedRemittance
                          ?.status ===
                        'rejected'
                          ? 'refresh-outline'
                          : 'cloud-upload-outline'
                      }
                      size={17}
                      color={WHITE}
                    />

                    <Text
                      style={
                        styles.confirmRemittanceButtonText
                      }
                    >
                      {selectedRemittance
                        ?.status ===
                      'rejected'
                        ? `Resubmit ${formatMoney(
                            selectedRemittance
                              ?.totalAmount
                          )}`
                        : `Submit ${formatMoney(
                            selectedRemittance
                              ?.totalAmount
                          )} Remittance`}
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomNavigation
  onDashboard={
    goDashboard
  }
  onDeliveries={
    goDeliveries
  }
  onWallet={
    goWallet
  }
  onAlerts={
    goAlerts
  }
  onStats={
    goStats
  }
/>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * SUMMARY CARD
 * =========================================================
 */

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon:
    ComponentProps<
      typeof Ionicons
    >['name'];

  label: string;

  value: string;

  tone:
    | 'gold'
    | 'orange';
}) {
  const isOrange =
    tone === 'orange';

  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <View
        style={[
          styles.summaryIconCircle,

          isOrange
            ? styles.orangeSummaryIcon
            : styles.goldSummaryIcon,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            isOrange
              ? ORANGE
              : GOLD_DARK
          }
        />
      </View>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * REMITTANCE SUMMARY
 * =========================================================
 */

function RemittanceSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;

  tone:
    | 'pending'
    | 'submitted'
    | 'verified';
}) {
  const getToneColor =
    () => {
      if (
        tone === 'verified'
      ) {
        return GREEN;
      }

      if (
        tone === 'submitted'
      ) {
        return BLUE;
      }

      return ORANGE;
    };

  return (
    <View
      style={
        styles.remittanceSummaryItem
      }
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.remittanceSummaryAmount,
          {
            color:
              getToneColor(),
          },
        ]}
      >
        {formatMoney(
          value
        )}
      </Text>

      <Text
        style={
          styles.remittanceSummaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * CURRENT SHIFT CARD
 * =========================================================
 */

function CurrentShiftCard({
  shift,
  remittance,
  onSubmit,
}: {
  shift: NonNullable<
    RiderWalletData['currentShift']
  >;

  remittance:
    | RiderDailyRemittance
    | null;

  onSubmit: (
    remittance:
      RiderDailyRemittance
  ) => void;
}) {
  const canSubmit =
    canSubmitRemittance(
      shift.status
    ) &&
    Boolean(
      remittance
    );

  return (
    <View
      style={
        styles.currentShiftCard
      }
    >
      <View
        style={
          styles.currentShiftTop
        }
      >
        <View
          style={
            styles.currentShiftIcon
          }
        >
          <MaterialCommunityIcons
            name="calendar-check-outline"
            size={20}
            color={GOLD_DARK}
          />
        </View>

        <View
          style={
            styles.currentShiftInfo
          }
        >
          <Text
            style={
              styles.currentShiftDate
            }
          >
            {formatShiftDate(
              shift.shiftDate
            )}
          </Text>

          <Text
            style={
              styles.currentShiftDeliveries
            }
          >
            {shift.deliveryCount}{' '}
            {shift.deliveryCount ===
            1
              ? 'COD delivery'
              : 'COD deliveries'}
          </Text>
        </View>

        <RemittanceBadge
          status={
            shift.status
          }
        />
      </View>

      <View
        style={
          styles.currentShiftAmountArea
        }
      >
        <Text
          style={
            styles.currentShiftAmountLabel
          }
        >
          Shift COD Total
        </Text>

        <Text
          style={
            styles.currentShiftAmount
          }
        >
          {formatMoney(
            shift.totalAmount
          )}
        </Text>
      </View>

      {shift.status ===
        'submitted' ? (
        <View
          style={
            styles.shiftMessageBlue
          }
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={BLUE}
          />

          <Text
            style={
              styles.shiftMessageBlueText
            }
          >
            Submitted and awaiting
            administrator verification.
          </Text>
        </View>
      ) : null}

      {shift.status ===
        'verified' ? (
        <View
          style={
            styles.shiftMessageGreen
          }
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={14}
            color={GREEN}
          />

          <Text
            style={
              styles.shiftMessageGreenText
            }
          >
            This shift remittance has
            been verified.
          </Text>
        </View>
      ) : null}

      {shift.status ===
        'rejected' &&
      shift.adminRemarks ? (
        <View
          style={
            styles.shiftMessageRed
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={RED}
          />

          <Text
            style={
              styles.shiftMessageRedText
            }
          >
            {shift.adminRemarks}
          </Text>
        </View>
      ) : null}

      {canSubmit &&
      remittance ? (
        <Pressable
          style={
            styles.shiftSubmitButton
          }
          onPress={() =>
            onSubmit(
              remittance
            )
          }
        >
          <Ionicons
            name={
              shift.status ===
              'rejected'
                ? 'refresh-outline'
                : 'cash-outline'
            }
            size={16}
            color={WHITE}
          />

          <Text
            style={
              styles.shiftSubmitButtonText
            }
          >
            {shift.status ===
            'rejected'
              ? `Resubmit ${formatMoney(
                  shift.totalAmount
                )}`
              : `Remit ${formatMoney(
                  shift.totalAmount
                )}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * DAILY REMITTANCE CARD
 * =========================================================
 */

function DailyRemittanceCard({
  remittance,
  onSubmit,
}: {
  remittance:
    RiderDailyRemittance;

  onSubmit: (
    remittance:
      RiderDailyRemittance
  ) => void;
}) {
  const canSubmit =
    canSubmitRemittance(
      remittance.status
    );

  return (
    <View
      style={
        styles.dailyRemittanceCard
      }
    >
      <View
        style={
          styles.dailyRemittanceTop
        }
      >
        <View
          style={
            styles.dailyDateArea
          }
        >
          <MaterialCommunityIcons
            name="calendar-outline"
            size={16}
            color={GOLD_DARK}
          />

          <View
            style={
              styles.dailyDateTextArea
            }
          >
            <Text
              style={
                styles.dailyRemittanceDate
              }
            >
              {formatShiftDate(
                remittance.shiftDate
              )}
            </Text>

            <Text
              style={
                styles.dailyDeliveryCount
              }
            >
              {
                remittance.deliveryCount
              }{' '}
              {remittance.deliveryCount ===
              1
                ? 'COD delivery'
                : 'COD deliveries'}
            </Text>
          </View>
        </View>

        <RemittanceBadge
          status={
            remittance.status
          }
        />
      </View>

      <View
        style={
          styles.dailyAmountRow
        }
      >
        <View>
          <Text
            style={
              styles.dailyAmountLabel
            }
          >
            Shift Remittance
          </Text>

          <Text
            style={
              styles.dailyAmount
            }
          >
            {formatMoney(
              remittance.totalAmount
            )}
          </Text>
        </View>

        {canSubmit ? (
          <Pressable
            style={
              styles.dailySubmitButton
            }
            onPress={() =>
              onSubmit(
                remittance
              )
            }
          >
            <Ionicons
              name={
                remittance.status ===
                'rejected'
                  ? 'refresh-outline'
                  : 'cloud-upload-outline'
              }
              size={13}
              color={WHITE}
            />

            <Text
              style={
                styles.dailySubmitButtonText
              }
            >
              {remittance.status ===
              'rejected'
                ? 'Resubmit'
                : 'Remit'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {remittance.status ===
        'submitted' ? (
        <Text
          style={
            styles.dailyStatusInfo
          }
        >
          Awaiting administrator verification
        </Text>
      ) : null}

      {remittance.status ===
        'verified' ? (
        <Text
          style={
            styles.dailyVerifiedInfo
          }
        >
          Remittance verified
        </Text>
      ) : null}

      {remittance.status ===
        'rejected' &&
      remittance.adminRemarks ? (
        <View
          style={
            styles.dailyRejectedBox
          }
        >
          <Text
            style={
              styles.dailyRejectedLabel
            }
          >
            Admin remarks
          </Text>

          <Text
            style={
              styles.dailyRejectedText
            }
          >
            {
              remittance.adminRemarks
            }
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * WALLET SECTION
 * =========================================================
 */

function WalletSection({
  title,
  total,
  iconType,
  transactions,
}: {
  title: string;

  total: number;

  iconType:
    | 'cash'
    | 'online';

  transactions:
    RiderWalletTransaction[];
}) {
  const isOnline =
    iconType === 'online';

  return (
    <View
      style={
        styles.walletSection
      }
    >
      <View
        style={
          styles.walletSectionHeader
        }
      >
        <View
          style={
            styles.walletSectionTitleArea
          }
        >
          <View
            style={[
              styles.walletSectionIcon,

              isOnline
                ? styles.onlineSectionIcon
                : styles.cashSectionIcon,
            ]}
          >
            <MaterialCommunityIcons
              name={
                isOnline
                  ? 'credit-card-outline'
                  : 'cash'
              }
              size={17}
              color={
                isOnline
                  ? GREEN
                  : GOLD_DARK
              }
            />
          </View>

          <View>
            <Text
              style={
                styles.walletSectionTitle
              }
            >
              {title}
            </Text>

            <Text
              style={
                styles.walletSectionCount
              }
            >
              {
                transactions.length
              }{' '}
              {transactions.length ===
              1
                ? 'transaction'
                : 'transactions'}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.sectionTotalArea
          }
        >
          <Text
            style={
              styles.sectionTotalLabel
            }
          >
            Total
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.sectionTotal,

              isOnline &&
                styles.onlineSectionTotal,
            ]}
          >
            {formatMoney(
              total
            )}
          </Text>
        </View>
      </View>

      {transactions.length ===
      0 ? (
        <View
          style={
            styles.emptyTransactions
          }
        >
          <Ionicons
            name={
              isOnline
                ? 'card-outline'
                : 'cash-outline'
            }
            size={24}
            color="#BEB9BC"
          />

          <Text
            style={
              styles.emptyTransactionsTitle
            }
          >
            No Transactions Yet
          </Text>

          <Text
            style={
              styles.emptyTransactionsText
            }
          >
            {isOnline
              ? 'Completed online-paid deliveries will appear here.'
              : 'Completed Cash on Delivery transactions will appear here.'}
          </Text>
        </View>
      ) : (
        <View
          style={
            styles.transactionList
          }
        >
          {transactions.map(
            (
              transaction,
              index
            ) => (
              <TransactionRow
                key={
                  transaction.deliveryId
                }
                transaction={
                  transaction
                }
                isOnline={
                  isOnline
                }
                isLast={
                  index ===
                  transactions.length -
                    1
                }
              />
            )
          )}
        </View>
      )}
    </View>
  );
}

/*
 * =========================================================
 * TRANSACTION ROW
 * =========================================================
 *
 * IMPORTANT:
 *
 * Individual COD transactions do NOT have
 * their own remittance submission button.
 *
 * They only indicate the status of the
 * DAILY remittance they belong to.
 * =========================================================
 */

function TransactionRow({
  transaction,
  isOnline,
  isLast,
}: {
  transaction:
    RiderWalletTransaction;

  isOnline: boolean;

  isLast: boolean;
}) {
  return (
    <View
      style={[
        styles.transactionRow,

        isLast &&
          styles.lastTransactionRow,
      ]}
    >
      <View
        style={[
          styles.transactionIconCircle,

          isOnline
            ? styles.onlineTransactionCircle
            : styles.cashTransactionCircle,
        ]}
      >
        <MaterialCommunityIcons
          name={
            isOnline
              ? 'credit-card-check-outline'
              : 'cash-check'
          }
          size={16}
          color={
            isOnline
              ? GREEN
              : GOLD_DARK
          }
        />
      </View>

      <View
        style={
          styles.transactionInfo
        }
      >
        <Text
          numberOfLines={1}
          style={
            styles.productName
          }
        >
          {transaction.productName ||
            'Flower Order'}
        </Text>

        <Text
          style={
            styles.orderNumber
          }
        >
          Order #
          {getShortOrderId(
            transaction.orderId
          )}
        </Text>

        <Text
          style={
            styles.transactionDate
          }
        >
          {formatTransactionDate(
            transaction.deliveredAt
          )}
        </Text>

        {!isOnline &&
        transaction.remittanceStatus ? (
          <>
            <RemittanceBadge
              status={
                transaction
                  .remittanceStatus
              }
            />

            <Text
              style={
                styles.includedShiftText
              }
            >
              Included in{' '}
              {formatShiftDate(
                transaction
                  .remittanceShiftDate
              )}{' '}
              shift
            </Text>

            {transaction
              .remittanceStatus ===
            'submitted' ? (
              <Text
                style={
                  styles.awaitingVerificationText
                }
              >
                Awaiting admin verification
              </Text>
            ) : null}

            {transaction
              .remittanceStatus ===
            'verified' ? (
              <Text
                style={
                  styles.transactionVerifiedText
                }
              >
                Shift remittance verified
              </Text>
            ) : null}

            {transaction
              .remittanceStatus ===
            'pending' ? (
              <Text
                style={
                  styles.pendingShiftText
                }
              >
                Included in pending shift remittance
              </Text>
            ) : null}

            {transaction
              .remittanceStatus ===
            'rejected' ? (
              <Text
                style={
                  styles.rejectedShiftText
                }
              >
                Shift remittance requires resubmission
              </Text>
            ) : null}
          </>
        ) : (
          <View
            style={
              styles.onlineBadge
            }
          >
            <Text
              style={
                styles.onlineBadgeText
              }
            >
              Online Payment
            </Text>
          </View>
        )}
      </View>

      <View
        style={
          styles.amountArea
        }
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            styles.transactionAmount,

            isOnline &&
              styles.onlineTransactionAmount,
          ]}
        >
          {formatMoney(
            transaction.amount
          )}
        </Text>

        <Text
          style={
            styles.paymentStatusText
          }
        >
          {transaction.paymentStatus ===
          'paid'
            ? 'Paid'
            : transaction.paymentStatus ||
              ''}
        </Text>
      </View>
    </View>
  );
}

/*
 * =========================================================
 * REMITTANCE BADGE
 * =========================================================
 */

function RemittanceBadge({
  status,
}: {
  status:
    RiderRemittanceStatus;
}) {
  let backgroundColor =
    ORANGE_LIGHT;

  let color =
    ORANGE;

  let label =
    'Pending';

  if (
    status === 'submitted'
  ) {
    backgroundColor =
      BLUE_LIGHT;

    color =
      BLUE;

    label =
      'Submitted';
  }

  if (
    status === 'verified'
  ) {
    backgroundColor =
      GREEN_LIGHT;

    color =
      GREEN;

    label =
      'Verified';
  }

  if (
    status === 'rejected'
  ) {
    backgroundColor =
      RED_LIGHT;

    color =
      RED;

    label =
      'Rejected';
  }

  return (
    <View
      style={[
        styles.remittanceBadge,
        {
          backgroundColor,
        },
      ]}
    >
      <View
        style={[
          styles.remittanceBadgeDot,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={[
          styles.remittanceBadgeText,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * BOTTOM NAVIGATION
 * =========================================================
 */

function BottomNavigation({
  onDashboard,
  onDeliveries,
  onWallet,
  onAlerts,
  onStats,
}: {
  onDashboard: () => void;

  onDeliveries: () => void;

  onWallet: () => void;

  onAlerts: () => void;

  onStats: () => void;
}) {
  return (
    <View
      style={
        styles.bottomNav
      }
    >
      <NavItem
        icon="home-outline"
        label="Dashboard"
        onPress={
          onDashboard
        }
      />

      <NavItem
        icon="cube-outline"
        label="Deliveries"
        onPress={
          onDeliveries
        }
      />

      <NavItem
        icon="wallet"
        label="Wallet"
        active
        onPress={
          onWallet
        }
      />

      <NavItem
        icon="notifications-outline"
        label="Alerts"
        onPress={
          onAlerts
        }
      />

      <NavItem
        icon="stats-chart-outline"
        label="Stats"
        onPress={
          onStats
        }
      />
    </View>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon:
    ComponentProps<
      typeof Ionicons
    >['name'];

  label: string;

  active?: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      style={
        styles.navItem
      }
      onPress={
        onPress
      }
    >
      <View
        style={[
          styles.navIconWrap,

          active &&
            styles.activeNavIconWrap,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            active
              ? GOLD_DARK
              : '#9A9598'
          }
        />
      </View>

      <Text
        style={[
          styles.navLabel,

          active &&
            styles.activeNavLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    /*
     * BASE
     */

    safeArea: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 82,
    },

    /*
     * HEADER
     */

    header: {
      backgroundColor: GOLD,
      paddingHorizontal: 18,
      paddingTop: 17,
      paddingBottom: 25,
      borderBottomLeftRadius: 25,
      borderBottomRightRadius: 25,
    },

    headerTopRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-start',
    },

    headerEyebrow: {
      color:
        'rgba(255,255,255,0.78)',
      fontSize: 7,
      fontWeight: '800',
      letterSpacing: 1.1,
    },

    headerTitle: {
      marginTop: 3,
      color: WHITE,
      fontSize: 22,
      fontWeight: '900',
    },

    headerSubtitle: {
      maxWidth: 235,
      marginTop: 4,
      color:
        'rgba(255,255,255,0.85)',
      fontSize: 8,
      lineHeight: 12,
    },

    walletIconCircle: {
      width: 43,
      height: 43,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(255,255,255,0.17)',
    },

    todayCashCard: {
      marginTop: 18,
      minHeight: 84,
      paddingHorizontal: 15,
      paddingVertical: 13,
      borderRadius: 15,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      backgroundColor:
        'rgba(255,255,255,0.94)',
    },

    todayCashLabel: {
      color: GRAY,
      fontSize: 8,
      fontWeight: '600',
    },

    todayCashAmount: {
      marginTop: 4,
      color: TEXT,
      fontSize: 24,
      fontWeight: '900',
    },

    todayCashHint: {
      marginTop: 2,
      color: GRAY,
      fontSize: 6.5,
      fontWeight: '600',
    },

    todayCashIcon: {
      width: 45,
      height: 45,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        GOLD_LIGHT,
    },

    /*
     * CONTENT
     */

    content: {
      paddingHorizontal: 14,
      paddingTop: 17,
    },

    sectionTitle: {
      marginBottom: 9,
      color: TEXT,
      fontSize: 12,
      fontWeight: '900',
    },

    sectionTitleNoMargin: {
      color: TEXT,
      fontSize: 12,
      fontWeight: '900',
    },

    sectionDescription: {
      marginTop: 2,
      color: GRAY,
      fontSize: 7,
    },

    sectionHeadingRow: {
      marginTop: 15,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    countBadge: {
      minWidth: 25,
      height: 22,
      paddingHorizontal: 7,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        GOLD_LIGHT,
    },

    countBadgeText: {
      color: GOLD_DARK,
      fontSize: 8,
      fontWeight: '900',
    },

    /*
     * SUMMARY
     */

    summaryRow: {
      flexDirection: 'row',
      gap: 9,
    },

    summaryCard: {
      flex: 1,
      minHeight: 103,
      padding: 12,
      borderRadius: 14,
      backgroundColor: WHITE,
    },

    summaryIconCircle: {
      width: 33,
      height: 33,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },

    orangeSummaryIcon: {
      backgroundColor:
        ORANGE_LIGHT,
    },

    goldSummaryIcon: {
      backgroundColor:
        GOLD_LIGHT,
    },

    summaryLabel: {
      marginTop: 9,
      color: GRAY,
      fontSize: 7.5,
      fontWeight: '600',
    },

    summaryValue: {
      marginTop: 3,
      color: TEXT,
      fontSize: 15,
      fontWeight: '900',
    },

    /*
     * REMITTANCE SUMMARY
     */

    remittanceCard: {
      marginTop: 11,
      padding: 13,
      borderRadius: 15,
      backgroundColor: WHITE,
    },

    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    cardTitleIcon: {
      width: 34,
      height: 34,
      marginRight: 9,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        GOLD_LIGHT,
    },

    cardTitle: {
      color: TEXT,
      fontSize: 10,
      fontWeight: '900',
    },

    cardSubtitle: {
      marginTop: 2,
      color: GRAY,
      fontSize: 7,
    },

    remittanceStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        LIGHT_GRAY,
    },

    remittanceSummaryItem: {
      flex: 1,
      alignItems: 'center',
    },

    remittanceSummaryAmount: {
      maxWidth: '100%',
      fontSize: 11,
      fontWeight: '900',
    },

    remittanceSummaryLabel: {
      marginTop: 3,
      color: GRAY,
      fontSize: 6.5,
      fontWeight: '600',
    },

    summaryDivider: {
      width: 1,
      height: 28,
      backgroundColor:
        LIGHT_GRAY,
    },

    rejectedSummary: {
      marginTop: 10,
      padding: 8,
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        RED_LIGHT,
    },

    rejectedSummaryText: {
      marginLeft: 5,
      color: RED,
      fontSize: 7,
      fontWeight: '700',
    },

    /*
     * CURRENT SHIFT
     */

    currentShiftCard: {
      padding: 14,
      borderRadius: 15,
      backgroundColor: WHITE,
      borderWidth: 1,
      borderColor:
        '#F2E5BF',
    },

    currentShiftTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    currentShiftIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        GOLD_LIGHT,
    },

    currentShiftInfo: {
      flex: 1,
      marginLeft: 9,
    },

    currentShiftDate: {
      color: TEXT,
      fontSize: 10,
      fontWeight: '900',
    },

    currentShiftDeliveries: {
      marginTop: 2,
      color: GRAY,
      fontSize: 7,
    },

    currentShiftAmountArea: {
      marginTop: 13,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        LIGHT_GRAY,
    },

    currentShiftAmountLabel: {
      color: GRAY,
      fontSize: 7,
      fontWeight: '600',
    },

    currentShiftAmount: {
      marginTop: 3,
      color: GOLD_DARK,
      fontSize: 22,
      fontWeight: '900',
    },

    shiftSubmitButton: {
      marginTop: 12,
      height: 40,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor:
        GOLD_DARK,
    },

    shiftSubmitButtonText: {
      color: WHITE,
      fontSize: 8.5,
      fontWeight: '900',
    },

    shiftMessageBlue: {
      marginTop: 10,
      padding: 8,
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        BLUE_LIGHT,
    },

    shiftMessageBlueText: {
      flex: 1,
      marginLeft: 6,
      color: BLUE,
      fontSize: 7,
      lineHeight: 10,
      fontWeight: '700',
    },

    shiftMessageGreen: {
      marginTop: 10,
      padding: 8,
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        GREEN_LIGHT,
    },

    shiftMessageGreenText: {
      flex: 1,
      marginLeft: 6,
      color: GREEN,
      fontSize: 7,
      lineHeight: 10,
      fontWeight: '700',
    },

    shiftMessageRed: {
      marginTop: 10,
      padding: 8,
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        RED_LIGHT,
    },

    shiftMessageRedText: {
      flex: 1,
      marginLeft: 6,
      color: RED,
      fontSize: 7,
      lineHeight: 10,
      fontWeight: '700',
    },

    noCurrentShiftCard: {
      padding: 13,
      borderRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: WHITE,
    },

    noCurrentShiftIcon: {
      width: 39,
      height: 39,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#F2F0F1',
    },

    noCurrentShiftContent: {
      flex: 1,
      marginLeft: 10,
    },

    noCurrentShiftTitle: {
      color: TEXT,
      fontSize: 9,
      fontWeight: '900',
    },

    noCurrentShiftText: {
      marginTop: 3,
      color: GRAY,
      fontSize: 7,
      lineHeight: 10,
    },

    /*
     * DAILY REMITTANCE
     */

    dailyRemittanceContainer: {
      overflow: 'hidden',
      borderRadius: 15,
      backgroundColor: WHITE,
    },

    dailyRemittanceCard: {
      padding: 13,
      borderBottomWidth: 1,
      borderBottomColor:
        LIGHT_GRAY,
    },

    dailyRemittanceTop: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-start',
    },

    dailyDateArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
    },

    dailyDateTextArea: {
      flex: 1,
      marginLeft: 7,
    },

    dailyRemittanceDate: {
      color: TEXT,
      fontSize: 9,
      fontWeight: '900',
    },

    dailyDeliveryCount: {
      marginTop: 2,
      color: GRAY,
      fontSize: 6.5,
    },

    dailyAmountRow: {
      marginTop: 11,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor:
        LIGHT_GRAY,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    dailyAmountLabel: {
      color: GRAY,
      fontSize: 6.5,
    },

    dailyAmount: {
      marginTop: 2,
      color: GOLD_DARK,
      fontSize: 15,
      fontWeight: '900',
    },

    dailySubmitButton: {
      minWidth: 80,
      height: 32,
      paddingHorizontal: 10,
      borderRadius: 9,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor:
        GOLD_DARK,
    },

    dailySubmitButtonText: {
      color: WHITE,
      fontSize: 7,
      fontWeight: '900',
    },

    dailyStatusInfo: {
      marginTop: 8,
      color: BLUE,
      fontSize: 6.5,
      fontWeight: '700',
    },

    dailyVerifiedInfo: {
      marginTop: 8,
      color: GREEN,
      fontSize: 6.5,
      fontWeight: '700',
    },

    dailyRejectedBox: {
      marginTop: 9,
      padding: 8,
      borderRadius: 8,
      backgroundColor:
        RED_LIGHT,
    },

    dailyRejectedLabel: {
      color: RED,
      fontSize: 6.5,
      fontWeight: '900',
    },

    dailyRejectedText: {
      marginTop: 2,
      color: RED,
      fontSize: 6.5,
      lineHeight: 9,
    },

    emptyRemittances: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 25,
      paddingVertical: 18,
    },

    /*
     * WALLET SECTIONS
     */

    walletSection: {
      marginTop: 12,
      overflow: 'hidden',
      borderRadius: 15,
      backgroundColor: WHITE,
    },

    walletSectionHeader: {
      padding: 13,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor:
        LIGHT_GRAY,
    },

    walletSectionTitleArea: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    walletSectionIcon: {
      width: 34,
      height: 34,
      marginRight: 8,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cashSectionIcon: {
      backgroundColor:
        GOLD_LIGHT,
    },

    onlineSectionIcon: {
      backgroundColor:
        GREEN_LIGHT,
    },

    walletSectionTitle: {
      color: TEXT,
      fontSize: 10,
      fontWeight: '900',
    },

    walletSectionCount: {
      marginTop: 2,
      color: GRAY,
      fontSize: 6.5,
    },

    sectionTotalArea: {
      maxWidth: 100,
      alignItems: 'flex-end',
    },

    sectionTotalLabel: {
      color: GRAY,
      fontSize: 6,
    },

    sectionTotal: {
      marginTop: 2,
      color: GOLD_DARK,
      fontSize: 11,
      fontWeight: '900',
    },

    onlineSectionTotal: {
      color: GREEN,
    },

    /*
     * TRANSACTIONS
     */

    transactionList: {
      paddingHorizontal: 13,
    },

    transactionRow: {
      minHeight: 100,
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        LIGHT_GRAY,
    },

    lastTransactionRow: {
      borderBottomWidth: 0,
    },

    transactionIconCircle: {
      width: 32,
      height: 32,
      marginRight: 9,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cashTransactionCircle: {
      backgroundColor:
        GOLD_LIGHT,
    },

    onlineTransactionCircle: {
      backgroundColor:
        GREEN_LIGHT,
    },

    transactionInfo: {
      flex: 1,
      paddingRight: 7,
    },

    productName: {
      color: TEXT,
      fontSize: 9,
      fontWeight: '800',
    },

    orderNumber: {
      marginTop: 2,
      color: GRAY,
      fontSize: 6.5,
    },

    transactionDate: {
      marginTop: 2,
      color: '#AAA5A8',
      fontSize: 6,
    },

    amountArea: {
      minWidth: 67,
      maxWidth: 88,
      alignItems: 'flex-end',
    },

    transactionAmount: {
      maxWidth: '100%',
      color: GOLD_DARK,
      fontSize: 10,
      fontWeight: '900',
    },

    onlineTransactionAmount: {
      color: GREEN,
    },

    paymentStatusText: {
      marginTop: 3,
      color: GRAY,
      fontSize: 6,
      textTransform:
        'capitalize',
    },

    /*
     * TRANSACTION REMITTANCE INFO
     */

    remittanceBadge: {
      alignSelf: 'flex-start',
      marginTop: 5,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 7,
      flexDirection: 'row',
      alignItems: 'center',
    },

    remittanceBadgeDot: {
      width: 4,
      height: 4,
      marginRight: 4,
      borderRadius: 2,
    },

    remittanceBadgeText: {
      fontSize: 6,
      fontWeight: '800',
    },

    includedShiftText: {
      marginTop: 4,
      color: GRAY,
      fontSize: 6,
      fontWeight: '600',
    },

    pendingShiftText: {
      marginTop: 3,
      color: ORANGE,
      fontSize: 6,
      fontWeight: '600',
    },

    awaitingVerificationText: {
      marginTop: 3,
      color: BLUE,
      fontSize: 6,
      fontWeight: '600',
    },

    transactionVerifiedText: {
      marginTop: 3,
      color: GREEN,
      fontSize: 6,
      fontWeight: '600',
    },

    rejectedShiftText: {
      marginTop: 3,
      color: RED,
      fontSize: 6,
      fontWeight: '600',
    },

    onlineBadge: {
      alignSelf: 'flex-start',
      marginTop: 5,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor:
        GREEN_LIGHT,
    },

    onlineBadgeText: {
      color: GREEN,
      fontSize: 6,
      fontWeight: '800',
    },

    /*
     * EMPTY
     */

    emptyTransactions: {
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 25,
      paddingVertical: 18,
    },

    emptyTransactionsTitle: {
      marginTop: 7,
      color: TEXT,
      fontSize: 9,
      fontWeight: '800',
    },

    emptyTransactionsText: {
      maxWidth: 230,
      marginTop: 3,
      color: GRAY,
      fontSize: 7,
      lineHeight: 10,
      textAlign: 'center',
    },

    /*
     * INFO
     */

    infoCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 13,
      flexDirection: 'row',
      backgroundColor:
        BLUE_LIGHT,
    },

    infoIcon: {
      width: 29,
      height: 29,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: WHITE,
    },

    infoContent: {
      flex: 1,
      marginLeft: 9,
    },

    infoTitle: {
      color: '#536D90',
      fontSize: 8.5,
      fontWeight: '900',
    },

    infoText: {
      marginTop: 3,
      color: '#7186A1',
      fontSize: 7,
      lineHeight: 10.5,
    },

    bottomSpacer: {
      height: 12,
    },

    /*
     * LOADING / ERROR
     */

    centerState: {
      flex: 1,
      paddingHorizontal: 35,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingTitle: {
      marginTop: 12,
      color: TEXT,
      fontSize: 15,
      fontWeight: '900',
    },

    loadingText: {
      maxWidth: 240,
      marginTop: 5,
      color: GRAY,
      fontSize: 9,
      lineHeight: 13,
      textAlign: 'center',
    },

    errorIconCircle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        RED_LIGHT,
    },

    errorTitle: {
      marginTop: 12,
      color: TEXT,
      fontSize: 15,
      fontWeight: '900',
    },

    errorText: {
      maxWidth: 260,
      marginTop: 5,
      color: GRAY,
      fontSize: 9,
      lineHeight: 13,
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 15,
      minWidth: 115,
      height: 40,
      paddingHorizontal: 16,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor:
        GOLD_DARK,
    },

    retryButtonText: {
      color: WHITE,
      fontSize: 8,
      fontWeight: '900',
    },

    /*
     * MODAL
     */

    modalOverlay: {
      flex: 1,
      justifyContent:
        'flex-end',
      backgroundColor:
        'rgba(0,0,0,0.45)',
    },

    modalCard: {
      maxHeight: '90%',
      paddingTop: 15,
      paddingHorizontal: 16,
      paddingBottom: 20,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: WHITE,
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },

    modalHeaderText: {
      flex: 1,
      paddingRight: 10,
    },

    modalTitle: {
      color: TEXT,
      fontSize: 15,
      fontWeight: '900',
    },

    modalSubtitle: {
      marginTop: 3,
      color: GRAY,
      fontSize: 7,
    },

    modalCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#F3F1F2',
    },

    selectedRemittanceCard: {
      marginTop: 13,
      padding: 12,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      backgroundColor:
        GOLD_LIGHT,
    },

    selectedShiftInfo: {
      flex: 1,
      paddingRight: 10,
    },

    selectedRemittanceLabel: {
      color: GRAY,
      fontSize: 6.5,
      fontWeight: '600',
    },

    selectedShiftDate: {
      marginTop: 2,
      color: TEXT,
      fontSize: 9,
      fontWeight: '900',
    },

    selectedDeliveryCount: {
      marginTop: 3,
      color: GRAY,
      fontSize: 6.5,
    },

    selectedAmountArea: {
      alignItems: 'flex-end',
    },

    selectedRemittanceAmount: {
      marginTop: 2,
      color: GOLD_DARK,
      fontSize: 16,
      fontWeight: '900',
    },

    modalRejectedNotice: {
      marginTop: 10,
      padding: 9,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor:
        RED_LIGHT,
    },

    modalRejectedTextArea: {
      flex: 1,
      marginLeft: 7,
    },

    modalRejectedTitle: {
      color: RED,
      fontSize: 7.5,
      fontWeight: '900',
    },

    modalRejectedText: {
      marginTop: 2,
      color: RED,
      fontSize: 7,
      lineHeight: 10,
    },

    modalScrollContent: {
      paddingTop: 13,
      paddingBottom: 15,
    },

    fieldLabel: {
      marginTop: 10,
      marginBottom: 6,
      color: TEXT,
      fontSize: 8,
      fontWeight: '800',
    },

    textInput: {
      minHeight: 42,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor:
        '#DDD8DB',
      borderRadius: 10,
      color: TEXT,
      fontSize: 9,
      backgroundColor:
        '#FBFAFA',
    },

    remarksInput: {
      minHeight: 85,
      paddingTop: 11,
      paddingBottom: 11,
    },

    proofPreviewContainer: {
      overflow: 'hidden',
      height: 180,
      borderRadius: 12,
      backgroundColor:
        '#EEE',
    },

    proofPreview: {
      width: '100%',
      height: '100%',
    },

    removeProofButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 27,
      height: 27,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(0,0,0,0.65)',
    },

    emptyProof: {
      minHeight: 125,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor:
        '#D8D3D6',
      borderRadius: 12,
      backgroundColor:
        '#FAF9F9',
    },

    emptyProofTitle: {
      marginTop: 7,
      color: TEXT,
      fontSize: 8.5,
      fontWeight: '800',
    },

    emptyProofText: {
      maxWidth: 220,
      marginTop: 3,
      color: GRAY,
      fontSize: 7,
      lineHeight: 10,
      textAlign: 'center',
    },

    proofActions: {
      marginTop: 9,
      flexDirection: 'row',
      gap: 8,
    },

    proofActionButton: {
      flex: 1,
      height: 38,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor:
        '#E7D7AA',
      backgroundColor:
        GOLD_LIGHT,
    },

    proofActionText: {
      color: GOLD_DARK,
      fontSize: 7.5,
      fontWeight: '800',
    },

    remittanceNotice: {
      marginTop: 13,
      padding: 10,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor:
        BLUE_LIGHT,
    },

    remittanceNoticeText: {
      flex: 1,
      marginLeft: 7,
      color: '#7186A1',
      fontSize: 7,
      lineHeight: 10.5,
    },

    confirmRemittanceButton: {
      marginTop: 13,
      minHeight: 43,
      paddingHorizontal: 15,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor:
        GOLD_DARK,
    },

    disabledRemittanceButton: {
      opacity: 0.6,
    },

    confirmRemittanceButtonText: {
      color: WHITE,
      fontSize: 8.5,
      fontWeight: '900',
    },

    /*
     * BOTTOM NAVIGATION
     */

    bottomNav: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 69,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-around',
      borderTopWidth: 1,
      borderTopColor:
        '#E7E3E5',
      backgroundColor: WHITE,
    },

    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    navIconWrap: {
      width: 34,
      height: 28,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    activeNavIconWrap: {
      backgroundColor:
        GOLD_LIGHT,
    },

    navLabel: {
      marginTop: 2,
      color: '#9A9598',
      fontSize: 6.3,
      fontWeight: '700',
    },

    activeNavLabel: {
      color: GOLD_DARK,
      fontWeight: '900',
    },
  });