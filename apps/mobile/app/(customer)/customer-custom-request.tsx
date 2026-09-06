import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiRequest } from "../../services/api";



/* =========================================================
 * TYPES
 * ======================================================= */

type BouquetPreferences = {
  occasion?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  flowerTypes?: string[];
  colors?: string[];
  styles?: string[];
  theme?: string | null;
  bouquetSize?: string | null;
  wrapping?: string | null;
  specialInstructions?: string[];
};

type AiConversation = {
  _id: string;
  title?: string;
  status?: "active" | "archived";
  preferences?: BouquetPreferences;
};

type AiMessage = {
  _id: string;
  conversation?: string;
  role?: "user" | "assistant";

  messageType?:
    | "text"
    | "product_results"
    | "generated_image";

  content?: string;

  metadata?: {
    imageUrl?: string;
    preferences?: BouquetPreferences;
    [key: string]: unknown;
  };

  createdAt?: string;
};

type ConversationDetailResponse = {
  success: boolean;
  message?: string;

  data?: {
    conversation?: AiConversation;
    messages?: AiMessage[];
  };
};

type RequestAiConversation = {
  _id: string;
  title?: string;
  status?: "active" | "archived";
};

type CustomBouquetRequest = {
  _id: string;

  aiConversation?:
    | RequestAiConversation
    | string
    | null;

  inspirationImage?: string | null;

  occasion?: string | null;
  budget?: number | null;
  quantity?: number;

  requestedDate?: string | null;

  customerMessage?: string | null;

  status?: string;

  createdAt?: string;
  updatedAt?: string;
};

type CreateRequestResponse = {
  success: boolean;
  message?: string;

  data?: {
    request?: CustomBouquetRequest;

    aiConversationId?:
      | string
      | null;

    requestStatus?: string;

    acceptingProposals?: boolean;
  };
};

type SelectedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

/* =========================================================
 * COLORS
 * ======================================================= */

const COLORS = {
  primary: "#7A1E48",
  primaryDark: "#5E1537",
  primarySoft: "#F8EDF2",

  background: "#FFFDFE",
  card: "#FFFFFF",

  text: "#252025",
  textMuted: "#786F75",

  border: "#EDE4E8",
  graySoft: "#F6F4F5",

  success: "#157347",
  successSoft: "#ECFDF3",

  danger: "#B42318",
  dangerSoft: "#FFF1F0",

  warning: "#A15C00",
  warningSoft: "#FFF8E7",

  blue: "#2866B1",
  blueSoft: "#EEF5FF",
};

/* =========================================================
 * IMAGE HELPERS
 * ======================================================= */

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "";

const SERVER_ORIGIN = API_BASE
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/+$/, "");

const getImageUrl = (
  image?: string | null
) => {
  if (!image) {
    return null;
  }

  const value =
    String(image).trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  const cleaned = value
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");

  if (!SERVER_ORIGIN) {
    return cleaned;
  }

  return `${SERVER_ORIGIN}/${cleaned}`;
};

/* =========================================================
 * HELPERS
 * ======================================================= */

const getErrorMessage = (
  error: unknown,
  fallback: string
) => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = String(
      (
        error as {
          message?: unknown;
        }
      ).message ?? ""
    ).trim();

    if (message) {
      return message;
    }
  }

  return fallback;
};

const formatCurrency = (
  value?: number | null
) => {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return "Not specified";
  }

  return `₱${Number(
    value
  ).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const isValidDateInput = (
  value: string
) => {
  if (!value.trim()) {
    return true;
  }

  const pattern =
    /^\d{4}-\d{2}-\d{2}$/;

  if (!pattern.test(value)) {
    return false;
  }

  const [
    yearText,
    monthText,
    dayText,
  ] = value.split("-");

  const year =
    Number(yearText);

  const month =
    Number(monthText);

  const day =
    Number(dayText);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  return (
    date.getFullYear() === year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() === day
  );
};

const getRequestConversationId = (
  request?: CustomBouquetRequest | null
) => {
  if (!request) {
    return null;
  }

  if (
    typeof request.aiConversation ===
    "string"
  ) {
    return request.aiConversation;
  }

  return (
    request.aiConversation?._id ??
    null
  );
};

/* =========================================================
 * SCREEN
 * ======================================================= */

export default function CustomerCustomRequestScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      aiConversationId?:
        | string
        | string[];

      sourceMessageId?:
        | string
        | string[];
    }>();

  const aiConversationId =
    Array.isArray(
      params.aiConversationId
    )
      ? params.aiConversationId[0] ??
        ""
      : params.aiConversationId ??
        "";

  const sourceMessageId =
    Array.isArray(
      params.sourceMessageId
    )
      ? params.sourceMessageId[0] ??
        ""
      : params.sourceMessageId ??
        "";

  const isAiMode =
    Boolean(
      aiConversationId &&
        sourceMessageId
    );

  /* =======================================================
   * AI SOURCE
   * ===================================================== */

  const [
    aiConversation,
    setAiConversation,
  ] = useState<
    AiConversation | null
  >(null);

  const [
    aiSourceMessage,
    setAiSourceMessage,
  ] = useState<
    AiMessage | null
  >(null);

  const [
    loadingAiSource,
    setLoadingAiSource,
  ] = useState(isAiMode);

  const [
    aiSourceError,
    setAiSourceError,
  ] = useState<string | null>(
    null
  );

  /* =======================================================
   * MANUAL IMAGE
   * ===================================================== */

  const [
    manualImage,
    setManualImage,
  ] = useState<
    SelectedImage | null
  >(null);

  /* =======================================================
   * FORM
   * ===================================================== */

  const [
    occasion,
    setOccasion,
  ] = useState("");

  const [
    budget,
    setBudget,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState("1");

  const [
    requestedDate,
    setRequestedDate,
  ] = useState("");

  const [
    customerMessage,
    setCustomerMessage,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* =======================================================
   * LOAD AI SOURCE
   * ===================================================== */

  const loadAiSource =
    useCallback(async () => {
      if (!isAiMode) {
        setLoadingAiSource(
          false
        );

        return;
      }

      try {
        setAiSourceError(null);

        const response =
          await apiRequest<ConversationDetailResponse>(
            `/bloomboard/ai/conversations/${aiConversationId}`,
            {
              authenticated: true,
            }
          );

        const conversation =
          response?.data
            ?.conversation;

        const messages =
          response?.data
            ?.messages ?? [];

        const sourceMessage =
          messages.find(
            (message) =>
              message._id ===
              sourceMessageId
          );

        if (!conversation) {
          throw new Error(
            "AI conversation was not returned by the server."
          );
        }

        if (!sourceMessage) {
          throw new Error(
            "The selected AI inspiration could not be found."
          );
        }

        if (
          sourceMessage.role !==
            "assistant" ||
          sourceMessage.messageType !==
            "generated_image"
        ) {
          throw new Error(
            "The selected AI message is not a generated bouquet image."
          );
        }

        if (
          !sourceMessage.metadata
            ?.imageUrl
        ) {
          throw new Error(
            "The selected AI inspiration does not have a saved image."
          );
        }

        setAiConversation(
          conversation
        );

        setAiSourceMessage(
          sourceMessage
        );

        /*
         * Only copy the basic information
         * that is still visible on this
         * simplified request form.
         *
         * The backend already has access to
         * the complete AI conversation
         * preferences when creating the
         * request.
         */

        const preferences =
          conversation.preferences ??
          sourceMessage.metadata
            ?.preferences ??
          {};

        setOccasion(
          preferences.occasion ??
            ""
        );

        const suggestedBudget =
          preferences.maxBudget ??
          preferences.minBudget;

        if (
          suggestedBudget !==
            null &&
          suggestedBudget !==
            undefined
        ) {
          setBudget(
            String(
              suggestedBudget
            )
          );
        }
      } catch (error) {
        setAiSourceError(
          getErrorMessage(
            error,
            "Unable to load the AI bouquet inspiration."
          )
        );
      } finally {
        setLoadingAiSource(
          false
        );
      }
    }, [
      aiConversationId,
      isAiMode,
      sourceMessageId,
    ]);

  useEffect(() => {
    loadAiSource();
  }, [loadAiSource]);

  /* =======================================================
   * IMAGE PICKER
   * ===================================================== */

  const pickManualImage =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            "Photo permission required",
            "Please allow FLOGRAM to access your photos so you can choose a bouquet reference image."
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                "images",
              ],
              allowsMultipleSelection:
                false,
              quality: 0.9,
            }
          );

        if (result.canceled) {
          return;
        }

        const asset =
          result.assets[0];

        if (!asset) {
          return;
        }

        setManualImage({
          uri: asset.uri,
          fileName:
            asset.fileName,
          mimeType:
            asset.mimeType,
        });
      } catch (error) {
        Alert.alert(
          "Unable to select image",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      }
    };

  /* =======================================================
   * VALIDATION
   * ===================================================== */

  const validateForm = () => {
    if (
      !isAiMode &&
      !manualImage
    ) {
      Alert.alert(
        "Reference photo required",
        "Choose a reference photo for your custom bouquet request."
      );

      return false;
    }

    if (
      isAiMode &&
      (
        !aiConversation ||
        !aiSourceMessage
      )
    ) {
      Alert.alert(
        "AI inspiration unavailable",
        "The selected AI bouquet inspiration has not loaded correctly."
      );

      return false;
    }

    if (budget.trim()) {
      const amount =
        Number(budget);

      if (
        Number.isNaN(amount) ||
        amount < 0
      ) {
        Alert.alert(
          "Invalid budget",
          "Enter a valid budget amount."
        );

        return false;
      }
    }

    const quantityNumber =
      Number(quantity);

    if (
      !Number.isInteger(
        quantityNumber
      ) ||
      quantityNumber < 1
    ) {
      Alert.alert(
        "Invalid quantity",
        "Quantity must be at least 1."
      );

      return false;
    }

    if (
      !isValidDateInput(
        requestedDate
      )
    ) {
      Alert.alert(
        "Invalid date",
        "Use YYYY-MM-DD for the needed-by date, for example 2026-09-20."
      );

      return false;
    }

    if (
      requestedDate.trim()
    ) {
      const selected =
        new Date(
          `${requestedDate}T23:59:59`
        );

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      if (
        selected.getTime() <
        today.getTime()
      ) {
        Alert.alert(
          "Invalid date",
          "The needed-by date cannot be in the past."
        );

        return false;
      }
    }

    return true;
  };

  /* =======================================================
   * OPEN LINKED AI CONVERSATION
   * ===================================================== */

  const openAiConversation = (
    conversationId: string
  ) => {
    router.replace({
      pathname:
        "/(customer)/customer-ai",
      params: {
        aiConversationId:
          conversationId,
      },
    } as never);
  };

  /* =======================================================
   * SUBMIT
   * ===================================================== */

  const submitRequest =
    async () => {
      if (!validateForm()) {
        return;
      }

      try {
        setSubmitting(true);

        let response:
          CreateRequestResponse;

        /*
         * AI-GENERATED IMAGE REQUEST
         *
         * No florist is selected.
         * The backend validates the source
         * generated image and keeps the same
         * AI conversation.
         */

        if (isAiMode) {
          response =
            await apiRequest<CreateRequestResponse>(
              "/bloomboard/custom-bouquet-requests",
              {
                method: "POST",
                authenticated: true,

                body: JSON.stringify({
                  aiConversationId,

                  sourceMessageId,

                  occasion:
                    occasion.trim() ||
                    undefined,

                  budget:
                    budget.trim()
                      ? Number(
                          budget
                        )
                      : undefined,

                  quantity:
                    Number(
                      quantity
                    ),

                  requestedDate:
                    requestedDate.trim() ||
                    undefined,

                  customerMessage:
                    customerMessage.trim() ||
                    undefined,
                }),
              }
            );
        } else {
          /*
           * MANUAL REFERENCE PHOTO REQUEST
           *
           * No floristId is sent.
           * The backend creates an OPEN
           * bouquet request and automatically
           * creates/links an AI conversation.
           */

          if (!manualImage) {
            return;
          }

          const formData =
            new FormData();

          if (
            occasion.trim()
          ) {
            formData.append(
              "occasion",
              occasion.trim()
            );
          }

          if (
            budget.trim()
          ) {
            formData.append(
              "budget",
              budget.trim()
            );
          }

          formData.append(
            "quantity",
            String(
              Number(quantity)
            )
          );

          if (
            requestedDate.trim()
          ) {
            formData.append(
              "requestedDate",
              requestedDate.trim()
            );
          }

          if (
            customerMessage.trim()
          ) {
            formData.append(
              "customerMessage",
              customerMessage.trim()
            );
          }

          const extension =
            manualImage.uri
              .split(".")
              .pop()
              ?.split("?")[0]
              ?.toLowerCase() ||
            "jpg";

          const fallbackType =
            extension === "png"
              ? "image/png"
              : extension ===
                    "webp"
                ? "image/webp"
                : "image/jpeg";

          formData.append(
            "inspirationImage",
            {
              uri:
                manualImage.uri,

              name:
                manualImage.fileName ||
                `custom-bouquet-${Date.now()}.${extension}`,

              type:
                manualImage.mimeType ||
                fallbackType,
            } as any
          );

          response =
            await apiRequest<CreateRequestResponse>(
              "/bloomboard/custom-bouquet-requests",
              {
                method: "POST",
                authenticated: true,
                body: formData,
              }
            );
        }

        const created =
          response?.data
            ?.request;

        if (!created) {
          throw new Error(
            "The server did not return the created bouquet request."
          );
        }

        const linkedConversationId =
          response?.data
            ?.aiConversationId ??
          getRequestConversationId(
            created
          ) ??
          (
            isAiMode
              ? aiConversationId
              : null
          );

        if (
          linkedConversationId
        ) {
          Alert.alert(
            "Request sent",
            "Your bouquet request is now open to FLOGRAM florists. Seller proposals will appear in your linked AI conversation.",
            [
              {
                text:
                  "Continue to AI",
                onPress: () =>
                  openAiConversation(
                    linkedConversationId
                  ),
              },
            ]
          );

          return;
        }

        Alert.alert(
          "Request sent",
          "Your bouquet request is now open to FLOGRAM florists.",
          [
            {
              text:
                "View Requests",
              onPress: () => {
                router.replace({
                  pathname:
                    "/(customer)/customer-bloomboard",
                  params: {
                    tab:
                      "requests",
                  },
                } as never);
              },
            },
          ]
        );
      } catch (error) {
        Alert.alert(
          "Unable to send request",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =======================================================
   * SOURCE IMAGE
   * ===================================================== */

  const aiImageUrl =
    getImageUrl(
      aiSourceMessage
        ?.metadata?.imageUrl
    );

  const displayBudget =
    budget.trim()
      ? formatCurrency(
          Number(budget)
        )
      : "Not specified";

  /* =======================================================
   * LOADING AI
   * ===================================================== */

  if (
    isAiMode &&
    loadingAiSource
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={
            styles.fullState
          }
        >
          <View
            style={
              styles.stateIcon
            }
          >
            <Ionicons
              name="sparkles"
              size={32}
              color={
                COLORS.primary
              }
            />
          </View>

          <ActivityIndicator
            size="large"
            color={
              COLORS.primary
            }
          />

          <Text
            style={
              styles.fullStateText
            }
          >
            Loading your AI bouquet
            inspiration...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
   * AI ERROR
   * ===================================================== */

  if (
    isAiMode &&
    aiSourceError
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={
            COLORS.background
          }
        />

        <View
          style={
            styles.fullState
          }
        >
          <View
            style={
              styles.stateIcon
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={
                COLORS.primary
              }
            />
          </View>

          <Text
            style={
              styles.fullStateTitle
            }
          >
            Inspiration unavailable
          </Text>

          <Text
            style={
              styles.fullStateText
            }
          >
            {aiSourceError}
          </Text>

          <Pressable
            onPress={
              loadAiSource
            }
            style={
              styles.retryButton
            }
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

          <Pressable
            onPress={() =>
              router.back()
            }
            style={
              styles.secondaryStateButton
            }
          >
            <Text
              style={
                styles.secondaryStateText
              }
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* =======================================================
   * MAIN UI
   * ===================================================== */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <KeyboardAvoidingView
        style={
          styles.container
        }
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {/* =================================================
         * HEADER
         * =============================================== */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={
                COLORS.text
              }
            />
          </Pressable>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.headerEyebrow
              }
            >
              BLOOMBOARD
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              Custom Bouquet
            </Text>
          </View>

          <View
            style={
              styles.headerIcon
            }
          >
            <Ionicons
              name={
                isAiMode
                  ? "sparkles"
                  : "flower"
              }
              size={22}
              color={
                COLORS.primary
              }
            />
          </View>
        </View>

        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* =================================================
           * INTRO
           * =============================================== */}

          <View
            style={[
              styles.introCard,
              isAiMode &&
                styles.aiIntroCard,
            ]}
          >
            <View
              style={
                styles.introIcon
              }
            >
              <Ionicons
                name={
                  isAiMode
                    ? "sparkles"
                    : "flower-outline"
                }
                size={23}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.introTitle
                }
              >
                {isAiMode
                  ? "Use Your AI Inspiration"
                  : "Request a Custom Bouquet"}
              </Text>

              <Text
                style={
                  styles.introText
                }
              >
                {isAiMode
                  ? "Send your AI-generated bouquet inspiration to FLOGRAM florists and receive real seller proposals."
                  : "Upload a reference photo and send one open request to FLOGRAM florists. Interested florists can then submit proposals."}
              </Text>
            </View>
          </View>

          {/* =================================================
           * STEP INDICATOR
           * =============================================== */}

          <View
            style={
              styles.stepsRow
            }
          >
            <View
              style={
                styles.stepItem
              }
            >
              <View
                style={
                  styles.stepCircle
                }
              >
                <Text
                  style={
                    styles.stepNumber
                  }
                >
                  1
                </Text>
              </View>

              <Text
                style={
                  styles.stepText
                }
              >
                Photo
              </Text>
            </View>

            <View
              style={
                styles.stepLine
              }
            />

            <View
              style={
                styles.stepItem
              }
            >
              <View
                style={
                  styles.stepCircle
                }
              >
                <Text
                  style={
                    styles.stepNumber
                  }
                >
                  2
                </Text>
              </View>

              <Text
                style={
                  styles.stepText
                }
              >
                Details
              </Text>
            </View>

            <View
              style={
                styles.stepLine
              }
            />

            <View
              style={
                styles.stepItem
              }
            >
              <View
                style={
                  styles.stepCircle
                }
              >
                <Text
                  style={
                    styles.stepNumber
                  }
                >
                  3
                </Text>
              </View>

              <Text
                style={
                  styles.stepText
                }
              >
                Send
              </Text>
            </View>
          </View>

          {/* =================================================
           * REFERENCE PHOTO
           * =============================================== */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Reference Photo
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Florists will use this
                  image as the main visual
                  reference for your
                  bouquet.
                </Text>
              </View>

              <View
                style={
                  styles.requiredBadge
                }
              >
                <Text
                  style={
                    styles.requiredBadgeText
                  }
                >
                  Required
                </Text>
              </View>
            </View>

            {isAiMode ? (
              aiImageUrl ? (
                <View
                  style={
                    styles.inspirationCard
                  }
                >
                  <Image
                    source={{
                      uri:
                        aiImageUrl,
                    }}
                    style={
                      styles.inspirationImage
                    }
                    resizeMode="cover"
                  />

                  <View
                    style={
                      styles.aiImageBadge
                    }
                  >
                    <Ionicons
                      name="sparkles"
                      size={14}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.aiImageBadgeText
                      }
                    >
                      AI Generated
                    </Text>
                  </View>

                  {!!aiConversation
                    ?.title && (
                    <View
                      style={
                        styles.sourceInfo
                      }
                    >
                      <Text
                        style={
                          styles.sourceLabel
                        }
                      >
                        From AI conversation
                      </Text>

                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.sourceTitle
                        }
                      >
                        {
                          aiConversation.title
                        }
                      </Text>
                    </View>
                  )}
                </View>
              ) : null
            ) : manualImage ? (
              <View
                style={
                  styles.inspirationCard
                }
              >
                <Image
                  source={{
                    uri:
                      manualImage.uri,
                  }}
                  style={
                    styles.inspirationImage
                  }
                  resizeMode="cover"
                />

                <View
                  style={
                    styles.photoActions
                  }
                >
                  <Pressable
                    onPress={
                      pickManualImage
                    }
                    style={({ pressed }) => [
                      styles.changePhotoButton,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="images-outline"
                      size={17}
                      color={
                        COLORS.primary
                      }
                    />

                    <Text
                      style={
                        styles.changePhotoText
                      }
                    >
                      Change Photo
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() =>
                      setManualImage(
                        null
                      )
                    }
                    style={({ pressed }) => [
                      styles.removePhotoButton,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={
                        COLORS.danger
                      }
                    />

                    <Text
                      style={
                        styles.removePhotoText
                      }
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={
                  pickManualImage
                }
                style={({ pressed }) => [
                  styles.uploadCard,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.uploadIcon
                  }
                >
                  <Ionicons
                    name="image-outline"
                    size={29}
                    color={
                      COLORS.primary
                    }
                  />
                </View>

                <Text
                  style={
                    styles.uploadTitle
                  }
                >
                  Choose Reference Photo
                </Text>

                <Text
                  style={
                    styles.uploadText
                  }
                >
                  Select a JPG, PNG, or
                  WEBP image from your
                  device.
                </Text>

                <View
                  style={
                    styles.uploadButton
                  }
                >
                  <Ionicons
                    name="images-outline"
                    size={17}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.uploadButtonText
                    }
                  >
                    Open Gallery
                  </Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* =================================================
           * REQUEST DETAILS
           * =============================================== */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Request Details
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Add the practical
                  details florists need
                  when preparing their
                  proposals.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.fieldGroup
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Occasion
              </Text>

              <TextInput
                value={
                  occasion
                }
                onChangeText={
                  setOccasion
                }
                placeholder="e.g. Birthday, Anniversary"
                placeholderTextColor="#A59CA1"
                style={
                  styles.input
                }
              />
            </View>

            <View
              style={
                styles.twoColumnRow
              }
            >
              <View
                style={[
                  styles.fieldGroup,
                  styles.halfField,
                ]}
              >
                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  Budget
                </Text>

                <View
                  style={
                    styles.currencyInput
                  }
                >
                  <Text
                    style={
                      styles.currencyPrefix
                    }
                  >
                    ₱
                  </Text>

                  <TextInput
                    value={
                      budget
                    }
                    onChangeText={
                      setBudget
                    }
                    placeholder="1500"
                    placeholderTextColor="#A59CA1"
                    keyboardType="decimal-pad"
                    style={
                      styles.currencyTextInput
                    }
                  />
                </View>
              </View>

              <View
                style={[
                  styles.fieldGroup,
                  styles.halfField,
                ]}
              >
                <Text
                  style={
                    styles.fieldLabel
                  }
                >
                  Quantity
                </Text>

                <TextInput
                  value={
                    quantity
                  }
                  onChangeText={
                    setQuantity
                  }
                  placeholder="1"
                  placeholderTextColor="#A59CA1"
                  keyboardType="number-pad"
                  style={
                    styles.input
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.fieldGroup
              }
            >
              <Text
                style={
                  styles.fieldLabel
                }
              >
                Needed By
              </Text>

              <View
                style={
                  styles.iconInput
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={
                    COLORS.textMuted
                  }
                />

                <TextInput
                  value={
                    requestedDate
                  }
                  onChangeText={
                    setRequestedDate
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#A59CA1"
                  autoCapitalize="none"
                  keyboardType={
                    Platform.OS ===
                    "ios"
                      ? "numbers-and-punctuation"
                      : "number-pad"
                  }
                  style={
                    styles.iconTextInput
                  }
                />
              </View>

              <Text
                style={
                  styles.helperText
                }
              >
                Example: 2026-09-20
              </Text>
            </View>
          </View>

          {/* =================================================
           * MESSAGE
           * =============================================== */}

          <View
            style={
              styles.section
            }
          >
            <View
              style={
                styles.sectionHeading
              }
            >
              <View
                style={
                  styles.sectionIcon
                }
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Message to Florists
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Add instructions that
                  are not obvious from
                  your reference photo.
                </Text>
              </View>

              <Text
                style={
                  styles.optionalText
                }
              >
                Optional
              </Text>
            </View>

            <TextInput
              value={
                customerMessage
              }
              onChangeText={
                setCustomerMessage
              }
              placeholder="e.g. Please recreate this closely, but use white wrapping..."
              placeholderTextColor="#A59CA1"
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.messageInput,
              ]}
            />

            <Text
              style={
                styles.counterText
              }
            >
              {
                customerMessage.length
              }
              /2000
            </Text>
          </View>

          {/* =================================================
           * BROADCAST EXPLANATION
           * =============================================== */}

          <View
            style={
              styles.broadcastCard
            }
          >
            <View
              style={
                styles.broadcastIcon
              }
            >
              <Ionicons
                name="megaphone-outline"
                size={23}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <View
                style={
                  styles.broadcastTitleRow
                }
              >
                <Text
                  style={
                    styles.broadcastTitle
                  }
                >
                  Open to FLOGRAM
                  Florists
                </Text>

                <View
                  style={
                    styles.openBadge
                  }
                >
                  <View
                    style={
                      styles.openDot
                    }
                  />

                  <Text
                    style={
                      styles.openBadgeText
                    }
                  >
                    OPEN
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.broadcastText
                }
              >
                Your request is not
                assigned to one florist.
                Approved florists can
                review it and submit
                their own proposals.
              </Text>

              <View
                style={
                  styles.broadcastDivider
                }
              />

              <View
                style={
                  styles.broadcastPoint
                }
              >
                <Ionicons
                  name="storefront-outline"
                  size={15}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.broadcastPointText
                  }
                >
                  Florists submit real
                  offers and prices.
                </Text>
              </View>

              <View
                style={
                  styles.broadcastPoint
                }
              >
                <Ionicons
                  name="sparkles-outline"
                  size={15}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.broadcastPointText
                  }
                >
                  Proposals appear in
                  your linked AI
                  conversation.
                </Text>
              </View>

              <View
                style={
                  styles.broadcastPoint
                }
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.broadcastPointText
                  }
                >
                  You choose the
                  proposal you want to
                  accept.
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
           * SUMMARY
           * =============================================== */}

          <View
            style={
              styles.reviewCard
            }
          >
            <View
              style={
                styles.reviewHeader
              }
            >
              <View
                style={
                  styles.reviewIcon
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={21}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.reviewTitle
                  }
                >
                  Request Summary
                </Text>

                <Text
                  style={
                    styles.reviewSubtitle
                  }
                >
                  Review before
                  publishing your
                  request.
                </Text>
              </View>
            </View>

            <View
              style={
                styles.reviewDivider
              }
            />

            <View
              style={
                styles.reviewRow
              }
            >
              <Text
                style={
                  styles.reviewLabel
                }
              >
                Reference
              </Text>

              <Text
                style={
                  styles.reviewValue
                }
              >
                {isAiMode
                  ? "AI generated"
                  : manualImage
                    ? "Photo selected"
                    : "Not selected"}
              </Text>
            </View>

            <View
              style={
                styles.reviewRow
              }
            >
              <Text
                style={
                  styles.reviewLabel
                }
              >
                Occasion
              </Text>

              <Text
                numberOfLines={2}
                style={
                  styles.reviewValue
                }
              >
                {occasion.trim() ||
                  "Not specified"}
              </Text>
            </View>

            <View
              style={
                styles.reviewRow
              }
            >
              <Text
                style={
                  styles.reviewLabel
                }
              >
                Budget
              </Text>

              <Text
                style={
                  styles.reviewValue
                }
              >
                {displayBudget}
              </Text>
            </View>

            <View
              style={
                styles.reviewRow
              }
            >
              <Text
                style={
                  styles.reviewLabel
                }
              >
                Quantity
              </Text>

              <Text
                style={
                  styles.reviewValue
                }
              >
                {quantity ||
                  "1"}
              </Text>
            </View>

            <View
              style={
                styles.reviewRow
              }
            >
              <Text
                style={
                  styles.reviewLabel
                }
              >
                Needed by
              </Text>

              <Text
                style={
                  styles.reviewValue
                }
              >
                {requestedDate.trim() ||
                  "Not specified"}
              </Text>
            </View>

            <View
              style={
                styles.reviewRow
              }
            >
              <Text
                style={
                  styles.reviewLabel
                }
              >
                Recipients
              </Text>

              <Text
                style={[
                  styles.reviewValue,
                  {
                    color:
                      COLORS.primary,
                  },
                ]}
              >
                FLOGRAM Florists
              </Text>
            </View>
          </View>

          {/* =================================================
           * AI NOTICE
           * =============================================== */}

          <View
            style={
              styles.aiNotice
            }
          >
            <View
              style={
                styles.aiNoticeIcon
              }
            >
              <Ionicons
                name="sparkles"
                size={19}
                color={
                  COLORS.primary
                }
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.aiNoticeTitle
                }
              >
                Continue in FLOGRAM AI
              </Text>

              <Text
                style={
                  styles.aiNoticeText
                }
              >
                After sending, your
                request is linked to an
                AI conversation where
                you can review and
                compare incoming seller
                proposals.
              </Text>
            </View>
          </View>

          {/* =================================================
           * SUBMIT
           * =============================================== */}

          <Pressable
            disabled={
              submitting
            }
            onPress={
              submitRequest
            }
            style={({ pressed }) => [
              styles.submitButton,

              submitting &&
                styles.submitDisabled,

              pressed &&
                !submitting &&
                styles.pressed,
            ]}
          >
            {submitting ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Sending Request...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="paper-plane"
                  size={19}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Send Bouquet Request
                </Text>
              </>
            )}
          </Pressable>

          <Text
            style={
              styles.submitHint
            }
          >
            Sending this request makes
            it available for eligible
            FLOGRAM florists to submit
            proposals while the request
            remains open.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================================================
 * STYLES
 * ======================================================= */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 48,
    },

    pressed: {
      opacity: 0.74,
    },

    /* =====================================================
     * HEADER
     * =================================================== */

    header: {
      minHeight: 68,
      paddingHorizontal: 15,
      paddingVertical: 10,

      flexDirection: "row",
      alignItems: "center",

      borderBottomWidth: 1,
      borderBottomColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.graySoft,
    },

    headerCenter: {
      flex: 1,
      paddingHorizontal: 12,
    },

    headerEyebrow: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
      color:
        COLORS.primary,
    },

    headerTitle: {
      marginTop: 1,

      fontSize: 20,
      fontWeight: "900",

      color:
        COLORS.text,
    },

    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    /* =====================================================
     * INTRO
     * =================================================== */

    introCard: {
      marginTop: 17,
      padding: 16,

      borderRadius: 19,

      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 11,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    aiIntroCard: {
      borderColor:
        "#E8CFDA",

      backgroundColor:
        "#FFF8FB",
    },

    introIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    introTitle: {
      fontSize: 15,
      fontWeight: "900",

      color:
        COLORS.text,
    },

    introText: {
      marginTop: 4,

      fontSize: 11,
      lineHeight: 17,

      color:
        COLORS.textMuted,
    },

    /* =====================================================
     * STEPS
     * =================================================== */

    stepsRow: {
      marginTop: 17,
      paddingHorizontal: 14,

      flexDirection: "row",
      alignItems: "flex-start",
    },

    stepItem: {
      width: 58,
      alignItems: "center",
    },

    stepCircle: {
      width: 29,
      height: 29,
      borderRadius: 15,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primary,
    },

    stepNumber: {
      fontSize: 11,
      fontWeight: "900",

      color: "#FFFFFF",
    },

    stepText: {
      marginTop: 5,

      fontSize: 9,
      fontWeight: "700",

      color:
        COLORS.textMuted,
    },

    stepLine: {
      flex: 1,
      height: 1,

      marginTop: 14,

      backgroundColor:
        "#DECBD3",
    },

    /* =====================================================
     * SECTIONS
     * =================================================== */

    section: {
      marginTop: 18,
      padding: 16,

      borderRadius: 20,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    sectionHeading: {
      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 10,
    },

    sectionIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "900",

      color:
        COLORS.text,
    },

    sectionSubtitle: {
      marginTop: 4,

      fontSize: 11,
      lineHeight: 16,

      color:
        COLORS.textMuted,
    },

    requiredBadge: {
      minHeight: 22,
      paddingHorizontal: 7,

      borderRadius: 8,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    requiredBadgeText: {
      fontSize: 8,
      fontWeight: "900",

      color:
        COLORS.primary,
    },

    optionalText: {
      marginTop: 2,

      fontSize: 9,
      fontWeight: "700",

      color:
        COLORS.textMuted,
    },

    /* =====================================================
     * PHOTO
     * =================================================== */

    inspirationCard: {
      marginTop: 14,

      overflow: "hidden",

      borderRadius: 17,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    inspirationImage: {
      width: "100%",
      height: 300,

      backgroundColor:
        COLORS.primarySoft,
    },

    aiImageBadge: {
      position: "absolute",

      top: 11,
      left: 11,

      minHeight: 29,
      paddingHorizontal: 9,

      borderRadius: 15,

      flexDirection: "row",
      alignItems: "center",

      gap: 5,

      backgroundColor:
        "rgba(122,30,72,0.92)",
    },

    aiImageBadgeText: {
      fontSize: 10,
      fontWeight: "800",

      color: "#FFFFFF",
    },

    sourceInfo: {
      padding: 12,
    },

    sourceLabel: {
      fontSize: 9,
      fontWeight: "700",

      color:
        COLORS.textMuted,
    },

    sourceTitle: {
      marginTop: 3,

      fontSize: 12,
      fontWeight: "800",

      color:
        COLORS.text,
    },

    photoActions: {
      padding: 10,

      flexDirection: "row",

      gap: 8,
    },

    changePhotoButton: {
      flex: 1,

      minHeight: 40,

      borderRadius: 11,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 6,

      backgroundColor:
        COLORS.primarySoft,
    },

    changePhotoText: {
      fontSize: 11,
      fontWeight: "800",

      color:
        COLORS.primary,
    },

    removePhotoButton: {
      flex: 1,

      minHeight: 40,

      borderRadius: 11,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 6,

      backgroundColor:
        COLORS.dangerSoft,
    },

    removePhotoText: {
      fontSize: 11,
      fontWeight: "800",

      color:
        COLORS.danger,
    },

    uploadCard: {
      marginTop: 14,

      minHeight: 210,
      padding: 20,

      borderRadius: 17,

      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor:
        "#DDBAC9",

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        "#FFF9FB",
    },

    uploadIcon: {
      width: 58,
      height: 58,
      borderRadius: 20,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    uploadTitle: {
      marginTop: 12,

      fontSize: 15,
      fontWeight: "900",

      color:
        COLORS.text,
    },

    uploadText: {
      marginTop: 5,

      maxWidth: 240,

      fontSize: 11,
      lineHeight: 17,

      textAlign: "center",

      color:
        COLORS.textMuted,
    },

    uploadButton: {
      marginTop: 14,

      minHeight: 40,
      paddingHorizontal: 15,

      borderRadius: 11,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 6,

      backgroundColor:
        COLORS.primary,
    },

    uploadButtonText: {
      fontSize: 11,
      fontWeight: "800",

      color: "#FFFFFF",
    },

    /* =====================================================
     * FORM
     * =================================================== */

    fieldGroup: {
      marginTop: 15,
    },

    fieldLabel: {
      marginBottom: 7,

      fontSize: 11,
      fontWeight: "800",

      color:
        COLORS.text,
    },

    input: {
      minHeight: 48,

      paddingHorizontal: 13,
      paddingVertical: 11,

      borderRadius: 13,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        "#FCFAFB",

      fontSize: 12,

      color:
        COLORS.text,
    },

    twoColumnRow: {
      flexDirection: "row",

      gap: 10,
    },

    halfField: {
      flex: 1,
    },

    currencyInput: {
      minHeight: 48,

      paddingHorizontal: 12,

      borderRadius: 13,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        "#FCFAFB",

      flexDirection: "row",
      alignItems: "center",
    },

    currencyPrefix: {
      marginRight: 5,

      fontSize: 13,
      fontWeight: "800",

      color:
        COLORS.primary,
    },

    currencyTextInput: {
      flex: 1,

      minHeight: 46,

      fontSize: 12,

      color:
        COLORS.text,
    },

    iconInput: {
      minHeight: 48,

      paddingHorizontal: 12,

      borderRadius: 13,

      borderWidth: 1,
      borderColor:
        COLORS.border,

      backgroundColor:
        "#FCFAFB",

      flexDirection: "row",
      alignItems: "center",

      gap: 8,
    },

    iconTextInput: {
      flex: 1,

      minHeight: 46,

      fontSize: 12,

      color:
        COLORS.text,
    },

    helperText: {
      marginTop: 5,

      fontSize: 9,
      lineHeight: 13,

      color: "#9B9196",
    },

    messageInput: {
      minHeight: 112,
      maxHeight: 180,
    },

    counterText: {
      marginTop: 5,

      textAlign: "right",

      fontSize: 9,

      color: "#9B9196",
    },

    /* =====================================================
     * BROADCAST
     * =================================================== */

    broadcastCard: {
      marginTop: 18,
      padding: 16,

      borderRadius: 20,

      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 11,

      borderWidth: 1,
      borderColor:
        "#E5CAD5",

      backgroundColor:
        "#FFF8FB",
    },

    broadcastIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    broadcastTitleRow: {
      flexDirection: "row",
      alignItems: "center",

      flexWrap: "wrap",

      gap: 7,
    },

    broadcastTitle: {
      fontSize: 14,
      fontWeight: "900",

      color:
        COLORS.text,
    },

    openBadge: {
      minHeight: 21,
      paddingHorizontal: 7,

      borderRadius: 8,

      flexDirection: "row",
      alignItems: "center",

      gap: 4,

      backgroundColor:
        COLORS.successSoft,
    },

    openDot: {
      width: 6,
      height: 6,
      borderRadius: 3,

      backgroundColor:
        COLORS.success,
    },

    openBadgeText: {
      fontSize: 8,
      fontWeight: "900",

      color:
        COLORS.success,
    },

    broadcastText: {
      marginTop: 6,

      fontSize: 11,
      lineHeight: 17,

      color:
        COLORS.textMuted,
    },

    broadcastDivider: {
      height: 1,

      marginVertical: 11,

      backgroundColor:
        "#E8D9DF",
    },

    broadcastPoint: {
      marginTop: 7,

      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 7,
    },

    broadcastPointText: {
      flex: 1,

      fontSize: 10,
      lineHeight: 15,

      color:
        COLORS.textMuted,
    },

    /* =====================================================
     * REVIEW
     * =================================================== */

    reviewCard: {
      marginTop: 18,
      padding: 16,

      borderRadius: 20,

      borderWidth: 1,
      borderColor:
        "#E4CAD5",

      backgroundColor:
        "#FFF8FB",
    },

    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",

      gap: 10,
    },

    reviewIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.primarySoft,
    },

    reviewTitle: {
      fontSize: 15,
      fontWeight: "900",

      color:
        COLORS.text,
    },

    reviewSubtitle: {
      marginTop: 2,

      fontSize: 10,

      color:
        COLORS.textMuted,
    },

    reviewDivider: {
      height: 1,

      marginVertical: 13,

      backgroundColor:
        "#E7D3DC",
    },

    reviewRow: {
      minHeight: 31,

      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 12,
    },

    reviewLabel: {
      width: 92,

      fontSize: 10,
      fontWeight: "700",

      color:
        COLORS.textMuted,
    },

    reviewValue: {
      flex: 1,

      textAlign: "right",

      fontSize: 10,
      fontWeight: "800",

      color:
        COLORS.text,
    },

    /* =====================================================
     * AI NOTICE
     * =================================================== */

    aiNotice: {
      marginTop: 18,
      padding: 14,

      borderRadius: 16,

      flexDirection: "row",
      alignItems:
        "flex-start",

      gap: 10,

      borderWidth: 1,
      borderColor:
        "#DCE6F5",

      backgroundColor:
        COLORS.blueSoft,
    },

    aiNoticeIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.card,
    },

    aiNoticeTitle: {
      fontSize: 12,
      fontWeight: "900",

      color:
        COLORS.text,
    },

    aiNoticeText: {
      marginTop: 4,

      fontSize: 10,
      lineHeight: 15,

      color:
        COLORS.textMuted,
    },

    /* =====================================================
     * SUBMIT
     * =================================================== */

    submitButton: {
      marginTop: 20,

      minHeight: 53,

      paddingHorizontal: 16,

      borderRadius: 15,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 8,

      backgroundColor:
        COLORS.primary,

      shadowColor:
        COLORS.primary,

      shadowOpacity: 0.18,

      shadowRadius: 10,

      shadowOffset: {
        width: 0,
        height: 4,
      },

      elevation: 3,
    },

    submitDisabled: {
      opacity: 0.55,
    },

    submitButtonText: {
      fontSize: 13,
      fontWeight: "900",

      color: "#FFFFFF",
    },

    submitHint: {
      marginTop: 9,
      paddingHorizontal: 15,

      fontSize: 10,
      lineHeight: 15,

      textAlign: "center",

      color:
        COLORS.textMuted,
    },

    /* =====================================================
     * STATES
     * =================================================== */

    fullState: {
      flex: 1,

      paddingHorizontal: 28,

      alignItems: "center",
      justifyContent: "center",
    },

    stateIcon: {
      width: 68,
      height: 68,

      borderRadius: 34,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 14,

      backgroundColor:
        COLORS.primarySoft,
    },

    fullStateTitle: {
      fontSize: 17,
      fontWeight: "900",

      color:
        COLORS.text,

      textAlign: "center",
    },

    fullStateText: {
      marginTop: 9,

      maxWidth: 290,

      fontSize: 12,
      lineHeight: 18,

      color:
        COLORS.textMuted,

      textAlign: "center",
    },

    retryButton: {
      marginTop: 17,

      minHeight: 42,
      paddingHorizontal: 18,

      borderRadius: 12,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",

      gap: 6,

      backgroundColor:
        COLORS.primary,
    },

    retryButtonText: {
      fontSize: 11,
      fontWeight: "800",

      color: "#FFFFFF",
    },

    secondaryStateButton: {
      marginTop: 9,

      minHeight: 40,
      paddingHorizontal: 18,

      borderRadius: 12,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        COLORS.graySoft,
    },

    secondaryStateText: {
      fontSize: 11,
      fontWeight: "800",

      color:
        COLORS.textMuted,
    },
  });