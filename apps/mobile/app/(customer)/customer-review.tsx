import {
  Ionicons,
} from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createReview,
  getOrderReview,
  type OrderReviewStatus,
  type Review,
  type ReviewRating,
} from '../../services/review';

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const MAX_COMMENT_LENGTH = 2000;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const getParamValue = (
  value:
    | string
    | string[]
    | undefined
): string => {
  if (
    Array.isArray(
      value
    )
  ) {
    return String(
      value[0] || ''
    ).trim();
  }

  return String(
    value || ''
  ).trim();
};

const getErrorMessage = (
  error: unknown
): string => {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

const getRatingLabel = (
  rating: number
): string => {
  switch (rating) {
    case 1:
      return 'Poor';

    case 2:
      return 'Fair';

    case 3:
      return 'Good';

    case 4:
      return 'Very Good';

    case 5:
      return 'Excellent';

    default:
      return 'Tap a star';
  }
};

const formatDate = (
  value?: string | null
): string => {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    undefined,
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',
    }
  );
};

const getReviewOrderName = (
  review: Review
): string => {
  return (
    review.order
      ?.productName ||
    'Completed Order'
  );
};

const getReviewFloristName = (
  review: Review
): string => {
  return (
    review.florist
      ?.shopName ||
    'Florist'
  );
};

const getReviewRiderName = (
  review: Review
): string => {
  const riderUser =
    review.riderUser;

  if (riderUser) {
    const name =
      [
        riderUser.firstName,
        riderUser.lastName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (name) {
      return name;
    }
  }

  const owner =
    review.rider?.owner;

  if (owner) {
    const name =
      [
        owner.firstName,
        owner.lastName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

    if (name) {
      return name;
    }
  }

  return 'Delivery Rider';
};

/*
 * =========================================================
 * STAR RATING
 * =========================================================
 */

type StarRatingProps = {
  value:
    number;

  onChange?:
    (
      value:
        ReviewRating
    ) => void;

  disabled?:
    boolean;
};

function StarRating({
  value,
  onChange,
  disabled = false,
}: StarRatingProps) {
  return (
    <View
      style={
        styles.starRow
      }
    >
      {(
        [
          1,
          2,
          3,
          4,
          5,
        ] as ReviewRating[]
      ).map(
        (star) => {
          const active =
            star <= value;

          return (
            <Pressable
              key={
                star
              }
              disabled={
                disabled
              }
              onPress={() => {
                if (
                  !disabled &&
                  onChange
                ) {
                  onChange(
                    star
                  );
                }
              }}
              hitSlop={
                6
              }
              style={({
                pressed,
              }) => [
                styles.starButton,

                pressed &&
                !disabled
                  ? styles.starButtonPressed
                  : null,
              ]}
            >
              <Ionicons
                name={
                  active
                    ? 'star'
                    : 'star-outline'
                }
                size={
                  32
                }
                color={
                  active
                    ? '#F4B400'
                    : '#C7C7C7'
                }
              />
            </Pressable>
          );
        }
      )}
    </View>
  );
}

/*
 * =========================================================
 * RATING CARD
 * =========================================================
 */

type RatingCardProps = {
  icon:
    keyof typeof Ionicons.glyphMap;

  title:
    string;

  description:
    string;

  value:
    number;

  onChange?:
    (
      value:
        ReviewRating
    ) => void;

  disabled?:
    boolean;
};

function RatingCard({
  icon,
  title,
  description,
  value,
  onChange,
  disabled = false,
}: RatingCardProps) {
  return (
    <View
      style={
        styles.ratingCard
      }
    >
      <View
        style={
          styles.ratingHeader
        }
      >
        <View
          style={
            styles.ratingIcon
          }
        >
          <Ionicons
            name={
              icon
            }
            size={
              20
            }
            color="#A33A5B"
          />
        </View>

        <View
          style={
            styles.ratingHeaderText
          }
        >
          <Text
            style={
              styles.ratingTitle
            }
          >
            {title}
          </Text>

          <Text
            style={
              styles.ratingDescription
            }
          >
            {description}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.ratingBottom
        }
      >
        <StarRating
          value={
            value
          }
          onChange={
            onChange
          }
          disabled={
            disabled
          }
        />

        <Text
          style={[
            styles.ratingLabel,

            value > 0
              ? styles.ratingLabelSelected
              : null,
          ]}
        >
          {getRatingLabel(
            value
          )}
        </Text>
      </View>
    </View>
  );
}

/*
 * =========================================================
 * LOADING SCREEN
 * =========================================================
 */

function LoadingScreen() {
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
        <Ionicons
          name="flower-outline"
          size={
            34
          }
          color="#A33A5B"
        />
      </View>

      <ActivityIndicator
        size="large"
        color="#A33A5B"
      />

      <Text
        style={
          styles.loadingText
        }
      >
        Loading review...
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * CUSTOMER REVIEW SCREEN
 * =========================================================
 */

export default function CustomerReviewScreen() {
  const router =
    useRouter();

  const params =
    useLocalSearchParams<{
      orderId?:
        | string
        | string[];
    }>();

  const orderId =
    useMemo(
      () =>
        getParamValue(
          params.orderId
        ),
      [
        params.orderId,
      ]
    );

  const [
    reviewStatus,
    setReviewStatus,
  ] =
    useState<OrderReviewStatus | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false
    );

  const [
    overallRating,
    setOverallRating,
  ] =
    useState<ReviewRating | 0>(
      0
    );

  const [
    orderRating,
    setOrderRating,
  ] =
    useState<ReviewRating | 0>(
      0
    );

  const [
    sellerRating,
    setSellerRating,
  ] =
    useState<ReviewRating | 0>(
      0
    );

  const [
    riderRating,
    setRiderRating,
  ] =
    useState<ReviewRating | 0>(
      0
    );

  const [
    systemRating,
    setSystemRating,
  ] =
    useState<ReviewRating | 0>(
      0
    );

  const [
    comment,
    setComment,
  ] =
    useState(
      ''
    );

  /*
   * =======================================================
   * LOAD REVIEW STATUS
   * =======================================================
   */

  const loadReview =
    useCallback(
      async (
        showLoading:
          boolean
      ) => {
        if (!orderId) {
          setReviewStatus(
            null
          );

          setLoading(
            false
          );

          setRefreshing(
            false
          );

          return;
        }

        try {
          if (
            showLoading
          ) {
            setLoading(
              true
            );
          }

          const result =
            await getOrderReview(
              orderId
            );

          setReviewStatus(
            result
          );
        } catch (error) {
          Alert.alert(
            'Unable to Load Review',
            getErrorMessage(
              error
            )
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        orderId,
      ]
    );

  useEffect(
    () => {
      void loadReview(
        true
      );
    },
    [
      loadReview,
    ]
  );

  /*
   * =======================================================
   * REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(
      () => {
        setRefreshing(
          true
        );

        void loadReview(
          false
        );
      },
      [
        loadReview,
      ]
    );

  /*
   * =======================================================
   * BACK
   * =======================================================
   */

  const handleBack =
    useCallback(
      () => {
        if (
          router.canGoBack()
        ) {
          router.back();

          return;
        }

        router.replace(
          '/(customer)/customer-orders'
        );
      },
      [
        router,
      ]
    );

  /*
   * =======================================================
   * MAYBE LATER
   * =======================================================
   */

  const handleMaybeLater =
    useCallback(
      () => {
        /*
         * The Order is already completed.
         *
         * Skipping the review must NOT undo or change the
         * completed Order.
         */

        if (
          router.canGoBack()
        ) {
          router.back();

          return;
        }

        router.replace(
          '/(customer)/customer-orders'
        );
      },
      [
        router,
      ]
    );

  /*
   * =======================================================
   * SUBMIT
   * =======================================================
   */

  const handleSubmit =
    useCallback(
      async () => {
        if (
          !orderId ||
          !reviewStatus
        ) {
          return;
        }

        if (
          reviewStatus.reviewed
        ) {
          return;
        }

        if (
          !reviewStatus.canReview
        ) {
          Alert.alert(
            'Review Unavailable',
            'This order cannot be reviewed.'
          );

          return;
        }

        if (
          overallRating ===
          0
        ) {
          Alert.alert(
            'Overall Rating Required',
            'Please rate your overall FLOGRAM experience.'
          );

          return;
        }

        if (
          orderRating ===
          0
        ) {
          Alert.alert(
            'Order Rating Required',
            'Please rate the bouquet or order quality.'
          );

          return;
        }

        if (
          sellerRating ===
          0
        ) {
          Alert.alert(
            'Florist Rating Required',
            'Please rate the florist service.'
          );

          return;
        }

        if (
          reviewStatus
            .riderRatingRequired &&
          riderRating ===
            0
        ) {
          Alert.alert(
            'Rider Rating Required',
            'Please rate the rider and delivery service.'
          );

          return;
        }

        if (
          systemRating ===
          0
        ) {
          Alert.alert(
            'FLOGRAM Rating Required',
            'Please rate your experience using the FLOGRAM system.'
          );

          return;
        }

        const cleanComment =
          comment.trim();

        if (
          cleanComment.length >
          MAX_COMMENT_LENGTH
        ) {
          Alert.alert(
            'Feedback Too Long',
            `Feedback must not exceed ${MAX_COMMENT_LENGTH} characters.`
          );

          return;
        }

        try {
          setSubmitting(
            true
          );

          const review =
            await createReview(
              orderId,
              {
                overallRating:
                  overallRating as ReviewRating,

                orderRating:
                  orderRating as ReviewRating,

                sellerRating:
                  sellerRating as ReviewRating,

                riderRating:
                  reviewStatus
                    .riderRatingRequired
                    ? (
                        riderRating as ReviewRating
                      )
                    : null,

                systemRating:
                  systemRating as ReviewRating,

                comment:
                  cleanComment ||
                  null,
              }
            );

          setReviewStatus(
            {
              reviewed:
                true,

              canReview:
                false,

              riderRatingRequired:
                review.riderRating !==
                null,

              review,
            }
          );

          Alert.alert(
            'Thank You!',
            'Your review has been submitted successfully.',
            [
              {
                text:
                  'Done',

                onPress:
                  () => {
                    if (
                      router.canGoBack()
                    ) {
                      router.back();

                      return;
                    }

                    router.replace(
                      '/(customer)/customer-orders'
                    );
                  },
              },
            ]
          );
        } catch (error) {
          Alert.alert(
            'Review Not Submitted',
            getErrorMessage(
              error
            )
          );
        } finally {
          setSubmitting(
            false
          );
        }
      },
      [
        comment,
        orderId,
        orderRating,
        overallRating,
        reviewStatus,
        riderRating,
        router,
        sellerRating,
        systemRating,
      ]
    );

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  /*
   * =======================================================
   * INVALID ORDER
   * =======================================================
   */

  if (!orderId) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="alert-circle-outline"
            size={
              38
            }
            color="#A33A5B"
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          Order Not Found
        </Text>

        <Text
          style={
            styles.emptyDescription
          }
        >
          A valid order is required to open this review.
        </Text>

        <Pressable
          onPress={
            handleBack
          }
          style={
            styles.primaryButton
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * =======================================================
   * FAILED TO LOAD
   * =======================================================
   */

  if (!reviewStatus) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="cloud-offline-outline"
            size={
              38
            }
            color="#A33A5B"
          />
        </View>

        <Text
          style={
            styles.emptyTitle
          }
        >
          Review Unavailable
        </Text>

        <Text
          style={
            styles.emptyDescription
          }
        >
          We could not load the review information for this order.
        </Text>

        <Pressable
          onPress={() => {
            void loadReview(
              true
            );
          }}
          style={
            styles.primaryButton
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  /*
   * =======================================================
   * EXISTING REVIEW
   * =======================================================
   */

  if (
    reviewStatus.reviewed &&
    reviewStatus.review
  ) {
    const review =
      reviewStatus.review;

    return (
      <View
        style={
          styles.screen
        }
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={
              handleBack
            }
            hitSlop={
              8
            }
            style={
              styles.headerButton
            }
          >
            <Ionicons
              name="chevron-back"
              size={
                25
              }
              color="#262126"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Your Review
          </Text>

          <View
            style={
              styles.headerButtonPlaceholder
            }
          />
        </View>

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              tintColor="#A33A5B"
            />
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={
              styles.successCard
            }
          >
            <View
              style={
                styles.successIcon
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={
                  34
                }
                color="#2F8F5B"
              />
            </View>

            <View
              style={
                styles.successTextContainer
              }
            >
              <Text
                style={
                  styles.successTitle
                }
              >
                Review Submitted
              </Text>

              <Text
                style={
                  styles.successDescription
                }
              >
                Thank you for sharing your FLOGRAM experience.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.orderSummary
            }
          >
            <View
              style={
                styles.orderSummaryIcon
              }
            >
              <Ionicons
                name="flower-outline"
                size={
                  25
                }
                color="#A33A5B"
              />
            </View>

            <View
              style={
                styles.orderSummaryContent
              }
            >
              <Text
                numberOfLines={
                  2
                }
                style={
                  styles.orderName
                }
              >
                {getReviewOrderName(
                  review
                )}
              </Text>

              <Text
                numberOfLines={
                  1
                }
                style={
                  styles.shopName
                }
              >
                {getReviewFloristName(
                  review
                )}
              </Text>

              <Text
                style={
                  styles.reviewDate
                }
              >
                Reviewed{' '}
                {formatDate(
                  review.createdAt
                )}
              </Text>
            </View>

            <View
              style={
                styles.reviewedBadge
              }
            >
              <Ionicons
                name="checkmark"
                size={
                  14
                }
                color="#2F8F5B"
              />

              <Text
                style={
                  styles.reviewedBadgeText
                }
              >
                Reviewed
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Your Ratings
          </Text>

          <RatingCard
            icon="heart-outline"
            title="Overall Experience"
            description="Your overall experience with this transaction."
            value={
              review.overallRating
            }
            disabled
          />

          <RatingCard
            icon="flower-outline"
            title="Bouquet / Order Quality"
            description="Quality, appearance, and condition of your order."
            value={
              review.orderRating
            }
            disabled
          />

          <RatingCard
            icon="storefront-outline"
            title="Florist Service"
            description={`Your experience with ${getReviewFloristName(
              review
            )}.`}
            value={
              review.sellerRating
            }
            disabled
          />

          {review.riderRating !==
            null && (
            <RatingCard
              icon="bicycle-outline"
              title="Rider / Delivery Service"
              description={`Your delivery experience with ${getReviewRiderName(
                review
              )}.`}
              value={
                review.riderRating
              }
              disabled
            />
          )}

          <RatingCard
            icon="phone-portrait-outline"
            title="FLOGRAM System"
            description="Your experience using the FLOGRAM ordering system."
            value={
              review.systemRating
            }
            disabled
          />

          <View
            style={
              styles.feedbackCard
            }
          >
            <Text
              style={
                styles.feedbackTitle
              }
            >
              Your Feedback
            </Text>

            <Text
              style={
                review.comment
                  ? styles.feedbackText
                  : styles.noFeedbackText
              }
            >
              {review.comment ||
                'No written feedback was provided.'}
            </Text>
          </View>

          <Pressable
            onPress={
              handleBack
            }
            style={
              styles.doneButton
            }
          >
            <Text
              style={
                styles.doneButtonText
              }
            >
              Done
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  /*
   * =======================================================
   * NOT ELIGIBLE
   * =======================================================
   */

  if (
    !reviewStatus.canReview
  ) {
    return (
      <View
        style={
          styles.screen
        }
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={
              handleBack
            }
            hitSlop={
              8
            }
            style={
              styles.headerButton
            }
          >
            <Ionicons
              name="chevron-back"
              size={
                25
              }
              color="#262126"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Review Order
          </Text>

          <View
            style={
              styles.headerButtonPlaceholder
            }
          />
        </View>

        <View
          style={
            styles.centerContent
          }
        >
          <View
            style={
              styles.emptyIcon
            }
          >
            <Ionicons
              name="time-outline"
              size={
                38
              }
              color="#A33A5B"
            />
          </View>

          <Text
            style={
              styles.emptyTitle
            }
          >
            Review Not Available Yet
          </Text>

          <Text
            style={
              styles.emptyDescription
            }
          >
            You can leave a review after the order has been completed.
          </Text>

          <Pressable
            onPress={
              handleBack
            }
            style={
              styles.primaryButton
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /*
   * =======================================================
   * NEW REVIEW FORM
   * =======================================================
   */

  const allRequiredRatingsSelected =
    overallRating > 0 &&
    orderRating > 0 &&
    sellerRating > 0 &&
    systemRating > 0 &&
    (
      !reviewStatus
        .riderRatingRequired ||
      riderRating > 0
    );

  return (
    <KeyboardAvoidingView
      style={
        styles.screen
      }
      behavior={
        Platform.OS ===
        'ios'
          ? 'padding'
          : undefined
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          onPress={
            handleBack
          }
          hitSlop={
            8
          }
          style={
            styles.headerButton
          }
        >
          <Ionicons
            name="chevron-back"
            size={
              25
            }
            color="#262126"
          />
        </Pressable>

        <Text
          style={
            styles.headerTitle
          }
        >
          Review Order
        </Text>

        <View
          style={
            styles.headerButtonPlaceholder
          }
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor="#A33A5B"
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.heroCard
          }
        >
          <View
            style={
              styles.heroIcon
            }
          >
            <Ionicons
              name="heart-outline"
              size={
                32
              }
              color="#A33A5B"
            />
          </View>

          <Text
            style={
              styles.heroTitle
            }
          >
            How was your FLOGRAM experience?
          </Text>

          <Text
            style={
              styles.heroDescription
            }
          >
            Your feedback helps us improve the quality of orders,
            florist service, delivery, and the FLOGRAM system.
          </Text>
        </View>

        <View
          style={
            styles.requiredNotice
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={
              20
            }
            color="#7D5261"
          />

          <Text
            style={
              styles.requiredNoticeText
            }
          >
            Please rate each section below. Written feedback is
            optional.
          </Text>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Rate Your Experience
        </Text>

        <RatingCard
          icon="heart-outline"
          title="Overall Experience"
          description="How satisfied are you with the whole transaction?"
          value={
            overallRating
          }
          onChange={
            setOverallRating
          }
        />

        <RatingCard
          icon="flower-outline"
          title="Bouquet / Order Quality"
          description="Rate the appearance, quality, and condition of your order."
          value={
            orderRating
          }
          onChange={
            setOrderRating
          }
        />

        <RatingCard
          icon="storefront-outline"
          title="Florist Service"
          description="Rate the preparation and service provided by the florist."
          value={
            sellerRating
          }
          onChange={
            setSellerRating
          }
        />

        {reviewStatus
          .riderRatingRequired && (
          <RatingCard
            icon="bicycle-outline"
            title="Rider / Delivery Service"
            description="Rate the handling and delivery service provided by the rider."
            value={
              riderRating
            }
            onChange={
              setRiderRating
            }
          />
        )}

        <RatingCard
          icon="phone-portrait-outline"
          title="FLOGRAM System"
          description="Rate your experience using FLOGRAM to place and manage your order."
          value={
            systemRating
          }
          onChange={
            setSystemRating
          }
        />

        <View
          style={
            styles.commentSection
          }
        >
          <View
            style={
              styles.commentHeader
            }
          >
            <View>
              <Text
                style={
                  styles.commentTitle
                }
              >
                Additional Feedback
              </Text>

              <Text
                style={
                  styles.optionalText
                }
              >
                Optional
              </Text>
            </View>

            <Text
              style={[
                styles.characterCount,

                comment.length >
                MAX_COMMENT_LENGTH
                  ? styles.characterCountError
                  : null,
              ]}
            >
              {comment.length}/
              {MAX_COMMENT_LENGTH}
            </Text>
          </View>

          <TextInput
            value={
              comment
            }
            onChangeText={
              setComment
            }
            placeholder="Tell us more about your experience..."
            placeholderTextColor="#A29A9D"
            multiline
            maxLength={
              MAX_COMMENT_LENGTH
            }
            textAlignVertical="top"
            editable={
              !submitting
            }
            style={
              styles.commentInput
            }
          />
        </View>

        <View
          style={
            styles.privacyNotice
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={
              19
            }
            color="#6B6266"
          />

          <Text
            style={
              styles.privacyText
            }
          >
            Your ratings are linked to this completed transaction
            so FLOGRAM can evaluate service quality.
          </Text>
        </View>

        <Pressable
          disabled={
            submitting ||
            !allRequiredRatingsSelected
          }
          onPress={() => {
            void handleSubmit();
          }}
          style={({
            pressed,
          }) => [
            styles.submitButton,

            (
              submitting ||
              !allRequiredRatingsSelected
            )
              ? styles.submitButtonDisabled
              : null,

            pressed &&
            !submitting &&
            allRequiredRatingsSelected
              ? styles.submitButtonPressed
              : null,
          ]}
        >
          {submitting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Ionicons
                name="paper-plane-outline"
                size={
                  19
                }
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.submitButtonText
                }
              >
                Submit Review
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          disabled={
            submitting
          }
          onPress={
            handleMaybeLater
          }
          style={({
            pressed,
          }) => [
            styles.laterButton,

            pressed
              ? styles.laterButtonPressed
              : null,
          ]}
        >
          <Text
            style={
              styles.laterButtonText
            }
          >
            Maybe Later
          </Text>
        </Pressable>

        <Text
          style={
            styles.laterHint
          }
        >
          You can return to your completed order and leave a review
          later.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    screen: {
      flex:
        1,

      backgroundColor:
        '#FFF9FB',
    },

    header: {
      minHeight:
        62,

      paddingHorizontal:
        16,

      paddingTop:
        Platform.OS ===
        'android'
          ? 10
          : 6,

      paddingBottom:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      backgroundColor:
        '#FFFFFF',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        '#EDE5E8',
    },

    headerButton: {
      width:
        42,

      height:
        42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerButtonPlaceholder: {
      width:
        42,

      height:
        42,
    },

    headerTitle: {
      flex:
        1,

      textAlign:
        'center',

      fontSize:
        18,

      lineHeight:
        24,

      fontWeight:
        '700',

      color:
        '#262126',
    },

    scrollContent: {
      padding:
        16,

      paddingBottom:
        42,
    },

    centerScreen: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        28,

      backgroundColor:
        '#FFF9FB',
    },

    centerContent: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        28,

      paddingBottom:
        60,
    },

    loadingIcon: {
      width:
        68,

      height:
        68,

      borderRadius:
        34,

      backgroundColor:
        '#FBEAF0',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        20,
    },

    loadingText: {
      marginTop:
        14,

      fontSize:
        14,

      color:
        '#766D71',
    },

    emptyIcon: {
      width:
        72,

      height:
        72,

      borderRadius:
        36,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FBEAF0',

      marginBottom:
        18,
    },

    emptyTitle: {
      fontSize:
        21,

      lineHeight:
        28,

      fontWeight:
        '800',

      color:
        '#2D272A',

      textAlign:
        'center',
    },

    emptyDescription: {
      marginTop:
        8,

      maxWidth:
        330,

      fontSize:
        14,

      lineHeight:
        21,

      color:
        '#786F73',

      textAlign:
        'center',
    },

    primaryButton: {
      minWidth:
        150,

      height:
        48,

      marginTop:
        24,

      paddingHorizontal:
        22,

      borderRadius:
        14,

      backgroundColor:
        '#A33A5B',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    primaryButtonText: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        '#FFFFFF',
    },

    heroCard: {
      paddingHorizontal:
        20,

      paddingVertical:
        24,

      borderRadius:
        22,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#F0E3E8',

      alignItems:
        'center',
    },

    heroIcon: {
      width:
        64,

      height:
        64,

      borderRadius:
        32,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FBEAF0',

      marginBottom:
        14,
    },

    heroTitle: {
      fontSize:
        21,

      lineHeight:
        28,

      fontWeight:
        '800',

      color:
        '#2D272A',

      textAlign:
        'center',
    },

    heroDescription: {
      marginTop:
        8,

      fontSize:
        14,

      lineHeight:
        21,

      color:
        '#786F73',

      textAlign:
        'center',
    },

    requiredNotice: {
      marginTop:
        14,

      paddingHorizontal:
        14,

      paddingVertical:
        12,

      borderRadius:
        14,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      backgroundColor:
        '#F8F0F3',
    },

    requiredNoticeText: {
      flex:
        1,

      fontSize:
        13,

      lineHeight:
        19,

      color:
        '#6F5B63',
    },

    sectionTitle: {
      marginTop:
        24,

      marginBottom:
        11,

      fontSize:
        17,

      lineHeight:
        23,

      fontWeight:
        '800',

      color:
        '#2D272A',
    },

    ratingCard: {
      marginBottom:
        12,

      padding:
        16,

      borderRadius:
        18,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#EEE5E8',
    },

    ratingHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    ratingIcon: {
      width:
        40,

      height:
        40,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FBEAF0',

      marginRight:
        12,
    },

    ratingHeaderText: {
      flex:
        1,
    },

    ratingTitle: {
      fontSize:
        15,

      lineHeight:
        20,

      fontWeight:
        '700',

      color:
        '#312A2D',
    },

    ratingDescription: {
      marginTop:
        3,

      fontSize:
        12.5,

      lineHeight:
        18,

      color:
        '#81777B',
    },

    ratingBottom: {
      marginTop:
        15,

      alignItems:
        'center',
    },

    starRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,
    },

    starButton: {
      width:
        43,

      height:
        43,

      borderRadius:
        22,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    starButtonPressed: {
      transform: [
        {
          scale:
            0.92,
        },
      ],

      opacity:
        0.75,
    },

    ratingLabel: {
      marginTop:
        4,

      fontSize:
        12,

      fontWeight:
        '600',

      color:
        '#A49B9F',
    },

    ratingLabelSelected: {
      color:
        '#A33A5B',
    },

    commentSection: {
      marginTop:
        8,

      padding:
        16,

      borderRadius:
        18,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#EEE5E8',
    },

    commentHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-end',

      justifyContent:
        'space-between',

      marginBottom:
        12,
    },

    commentTitle: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        '#312A2D',
    },

    optionalText: {
      marginTop:
        2,

      fontSize:
        11.5,

      color:
        '#968C90',
    },

    characterCount: {
      fontSize:
        11.5,

      color:
        '#968C90',
    },

    characterCountError: {
      color:
        '#B83C3C',
    },

    commentInput: {
      minHeight:
        125,

      paddingHorizontal:
        14,

      paddingVertical:
        13,

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        '#E6DDE0',

      backgroundColor:
        '#FFFCFD',

      fontSize:
        14,

      lineHeight:
        20,

      color:
        '#30292C',
    },

    privacyNotice: {
      marginTop:
        14,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      paddingHorizontal:
        4,
    },

    privacyText: {
      flex:
        1,

      fontSize:
        12,

      lineHeight:
        18,

      color:
        '#7E7478',
    },

    submitButton: {
      minHeight:
        52,

      marginTop:
        24,

      paddingHorizontal:
        18,

      borderRadius:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        9,

      backgroundColor:
        '#A33A5B',
    },

    submitButtonDisabled: {
      backgroundColor:
        '#CDAAB5',
    },

    submitButtonPressed: {
      opacity:
        0.88,
    },

    submitButtonText: {
      fontSize:
        15,

      fontWeight:
        '800',

      color:
        '#FFFFFF',
    },

    laterButton: {
      minHeight:
        48,

      marginTop:
        10,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E5DADF',
    },

    laterButtonPressed: {
      backgroundColor:
        '#FBF5F7',
    },

    laterButtonText: {
      fontSize:
        14,

      fontWeight:
        '700',

      color:
        '#6D5961',
    },

    laterHint: {
      marginTop:
        9,

      paddingHorizontal:
        14,

      fontSize:
        11.5,

      lineHeight:
        17,

      color:
        '#958B8F',

      textAlign:
        'center',
    },

    successCard: {
      padding:
        16,

      borderRadius:
        18,

      backgroundColor:
        '#F0FAF4',

      borderWidth:
        1,

      borderColor:
        '#D5EDDF',

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    successIcon: {
      marginRight:
        12,
    },

    successTextContainer: {
      flex:
        1,
    },

    successTitle: {
      fontSize:
        16,

      lineHeight:
        21,

      fontWeight:
        '800',

      color:
        '#286C48',
    },

    successDescription: {
      marginTop:
        3,

      fontSize:
        12.5,

      lineHeight:
        18,

      color:
        '#527461',
    },

    orderSummary: {
      marginTop:
        14,

      padding:
        15,

      borderRadius:
        18,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#EEE5E8',

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    orderSummaryIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FBEAF0',

      marginRight:
        12,
    },

    orderSummaryContent: {
      flex:
        1,

      paddingRight:
        8,
    },

    orderName: {
      fontSize:
        14.5,

      lineHeight:
        20,

      fontWeight:
        '700',

      color:
        '#30292C',
    },

    shopName: {
      marginTop:
        2,

      fontSize:
        12.5,

      color:
        '#7D7377',
    },

    reviewDate: {
      marginTop:
        4,

      fontSize:
        11.5,

      color:
        '#9A9094',
    },

    reviewedBadge: {
      paddingHorizontal:
        9,

      paddingVertical:
        6,

      borderRadius:
        999,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      backgroundColor:
        '#EAF7EF',
    },

    reviewedBadgeText: {
      fontSize:
        10.5,

      fontWeight:
        '700',

      color:
        '#2F7B50',
    },

    feedbackCard: {
      marginTop:
        8,

      padding:
        16,

      borderRadius:
        18,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#EEE5E8',
    },

    feedbackTitle: {
      fontSize:
        15,

      fontWeight:
        '700',

      color:
        '#312A2D',

      marginBottom:
        8,
    },

    feedbackText: {
      fontSize:
        14,

      lineHeight:
        21,

      color:
        '#5F565A',
    },

    noFeedbackText: {
      fontSize:
        14,

      lineHeight:
        21,

      color:
        '#999095',

      fontStyle:
        'italic',
    },

    doneButton: {
      minHeight:
        50,

      marginTop:
        22,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#A33A5B',
    },

    doneButtonText: {
      fontSize:
        15,

      fontWeight:
        '800',

      color:
        '#FFFFFF',
    },
  });