import { Ionicons } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
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

type ConversationStatus = "active" | "archived";

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
  customer?: string;
  title?: string;
  status: ConversationStatus;
  preferences?: BouquetPreferences;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProductFlorist = {
  _id?: string;
  shopName?: string;
};

type AiProduct = {
  _id: string;
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  occasion?: string[];
  flowerTypes?: string[];
  colors?: string[];
  images?: string[];
  florist?: ProductFlorist | null;
  recommendationScore?: number;
  matchedCriteria?: string[];
};

type AiIntent =
  | "conversation"
  | "product_search"
  | "image_generation"
  | "proposal_question"
  | "select_proposal"
  | "custom_bouquet_request"
  | "custom_bouquet_proposal";

type CustomBouquetRequestStatus =
  | "open"
  | "customer_accepted"
  | "cancelled"
  | string;

type ProposalStatus =
  | "submitted"
  | "selected"
  | "not_selected"
  | "withdrawn"
  | string;

type ProposalContextItem = {
  proposalId: string;
  proposalNumber: number;
  floristId?: string;
  shopName?: string;
  quotedPrice?: number;
  sellerResponse?: string;
  proposalImage?: string | null;
  status?: ProposalStatus;
  createdAt?: string;
};

type ProposalContext = {
  customBouquetRequestId?: string;
  requestStatus?: CustomBouquetRequestStatus;
  selectedProposalId?: string | null;
  canSelectProposal?: boolean;
  availableProposals?: ProposalContextItem[];
};

type CustomBouquetRequestSummary = {
  _id: string;
  status?: CustomBouquetRequestStatus;
  quotedPrice?: number | null;
  selectedProposal?: unknown;
  florist?: unknown;
  aiConversation?: unknown;
  createdAt?: string;
};

type AiMessageMetadata = {
  provider?: string;
  model?: string;
  responseId?: string | null;

  intent?: AiIntent;
  detectedIntent?: AiIntent;

  preferences?: BouquetPreferences;

  flowerIds?: string[];
  products?: AiProduct[];

  imageUrl?: string;
  sourceImageUrl?: string;
  persistentUrl?: string | null;
  revisedPrompt?: string | null;
  originalPrompt?: string | null;
  imageGenerated?: boolean;

  eventType?: string;

  customBouquetRequestId?: string;

  proposalId?: string;
  proposalNumber?: number;

  floristId?: string;
  shopName?: string;
  quotedPrice?: number;

  proposalStatus?: ProposalStatus;
  requestStatus?: CustomBouquetRequestStatus;

  selectedProposalId?: string | null;

  canSelectProposal?: boolean;
  canProceedToCheckout?: boolean;

  availableProposals?: ProposalContextItem[];

  [key: string]: unknown;
};

type AiMessage = {
  _id: string;
  conversation?: string;
  sender?: string | null;
  role: "user" | "assistant";
  messageType:
    | "text"
    | "product_results"
    | "generated_image";
  content?: string;
  metadata?: AiMessageMetadata;
  createdAt?: string;
  updatedAt?: string;
};

type CreateConversationResponse = {
  success: boolean;
  message?: string;
  data?: {
    conversation?: AiConversation;
  };
};

type ConversationListResponse = {
  success: boolean;
  message?: string;
  data?: {
    count?: number;
    conversations?: AiConversation[];
  };
};

type ConversationDetailResponse = {
  success: boolean;
  message?: string;
  data?: {
    conversation?: AiConversation;
    messages?: AiMessage[];
    customBouquetRequest?: CustomBouquetRequestSummary | null;
    proposalContext?: ProposalContext | null;
  };
};

type SendMessageResponse = {
  success: boolean;
  message?: string;
  data?: {
    intent?: AiIntent;
    preferences?: BouquetPreferences;
    userMessage?: AiMessage;
    assistantMessage?: AiMessage;

    customBouquetRequestId?: string | null;

    proposalContext?: ProposalContext | null;

    selectedProposalId?: string | null;

    selectedProposal?: unknown;
    request?: unknown;

    canProceedToCheckout?: boolean;
  };
};

type ArchiveConversationResponse = {
  success: boolean;
  message?: string;
  data?: {
    conversation?: AiConversation;
  };
};

type NavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
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

  danger: "#B42318",
  dangerSoft: "#FFF1F0",

  success: "#157347",
  successSoft: "#ECFDF3",

  blue: "#2866B1",
  blueSoft: "#EEF5FF",

  gold: "#9A6B00",
  goldSoft: "#FFF8E7",
};

/* =========================================================
 * API IMAGE HELPERS
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
 * NAVIGATION
 * ======================================================= */

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    route:
      "/(customer)/customer-dashboard",
  },
  {
    key: "discover",
    label: "Discover",
    icon: "search-outline",
    activeIcon: "search",
    route:
      "/(customer)/customer-discover",
  },
  {
    key: "bloom",
    label: "Bloom",
    icon: "flower-outline",
    activeIcon: "flower",
    route:
      "/(customer)/customer-bloomboard",
  },
  {
    key: "cart",
    label: "Cart",
    icon: "bag-outline",
    activeIcon: "bag",
    route:
      "/(customer)/customer-cart",
  },
  {
    key: "ai",
    label: "AI",
    icon: "sparkles-outline",
    activeIcon: "sparkles",
    route:
      "/(customer)/customer-ai",
  },
  {
    key: "me",
    label: "Me",
    icon: "person-outline",
    activeIcon: "person",
    route:
      "/(customer)/customer-profile",
  },
];

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
      (error as { message?: unknown })
        .message ?? ""
    ).trim();

    if (message) {
      return message;
    }
  }

  return fallback;
};

const formatRelativeDate = (
  value?: string
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const diff =
    Date.now() - date.getTime();

  const minute =
    60 * 1000;

  const hour =
    60 * minute;

  const day =
    24 * hour;

  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {
    return `${Math.floor(
      diff / minute
    )}m ago`;
  }

  if (diff < day) {
    return `${Math.floor(
      diff / hour
    )}h ago`;
  }

  if (diff < 7 * day) {
    return `${Math.floor(
      diff / day
    )}d ago`;
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !==
        new Date().getFullYear()
          ? "numeric"
          : undefined,
    }
  );
};

const formatCurrency = (
  value?: number | null
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return `₱${Number(
    value
  ).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const cleanArray = (
  value?: string[]
) => {
  return Array.isArray(value)
    ? value.filter(Boolean)
    : [];
};

/* =========================================================
 * SCREEN
 * ======================================================= */

export default function CustomerAiScreen() {
  const router = useRouter();
  const params =
  useLocalSearchParams<{
    aiConversationId?:
      | string
      | string[];
  }>();

const routeConversationId =
  Array.isArray(
    params.aiConversationId
  )
    ? params.aiConversationId[0]
    : params.aiConversationId;

const openedRouteConversationRef =
  useRef<string | null>(
    null
  );

  const scrollRef =
    useRef<ScrollView | null>(
      null
    );

  /* =======================================================
   * STATE
   * ===================================================== */

  const [
    conversations,
    setConversations,
  ] = useState<
    AiConversation[]
  >([]);

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState<
    AiConversation | null
  >(null);

  const [
    messages,
    setMessages,
  ] = useState<AiMessage[]>(
    []
  );

  const [
    loadingConversations,
    setLoadingConversations,
  ] = useState(true);

  const [
    creatingConversation,
    setCreatingConversation,
  ] = useState(false);

  const [
    archivingConversation,
    setArchivingConversation,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    messageText,
    setMessageText,
  ] = useState("");

  const [
    sendingMessage,
    setSendingMessage,
  ] = useState(false);

  const [
    customBouquetRequest,
    setCustomBouquetRequest,
  ] = useState<
    CustomBouquetRequestSummary | null
  >(null);

  const [
    proposalContext,
    setProposalContext,
  ] = useState<
    ProposalContext | null
  >(null);

  /* =======================================================
   * LOAD CONVERSATIONS
   * ===================================================== */

  const loadConversations =
    useCallback(async () => {
      try {
        setError(null);

        const response =
          await apiRequest<ConversationListResponse>(
            "/bloomboard/ai/conversations",
            {
              authenticated: true,
            }
          );

        setConversations(
          response?.data
            ?.conversations ?? []
        );
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Unable to load your AI conversations."
          )
        );
      } finally {
        setLoadingConversations(
          false
        );
      }
    }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /* =======================================================
   * OPEN CONVERSATION
   * ===================================================== */

  const openConversation = async (
  conversation: AiConversation
) => {
  try {
    setError(null);

    const response =
      await apiRequest<ConversationDetailResponse>(
        `/bloomboard/ai/conversations/${conversation._id}`,
        {
          authenticated: true,
        }
      );

    const serverConversation =
      response?.data?.conversation ??
      conversation;

    setSelectedConversation(
      serverConversation
    );

    setMessages(
      response?.data?.messages ?? []
    );

    setCustomBouquetRequest(
      response?.data
        ?.customBouquetRequest ?? null
    );

    setProposalContext(
      response?.data?.proposalContext ??
        null
    );

    setMessageText("");

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: false,
      });
    }, 100);
  } catch (requestError) {
    Alert.alert(
      "Unable to open conversation",
      getErrorMessage(
        requestError,
        "Please try again."
      )
    );
  }
};
useEffect(() => {
  if (
    !routeConversationId
  ) {
    return;
  }

  if (
    openedRouteConversationRef
      .current ===
    routeConversationId
  ) {
    return;
  }

  openedRouteConversationRef.current =
    routeConversationId;

  const existingConversation =
    conversations.find(
      (conversation) =>
        conversation._id ===
        routeConversationId
    );

  if (existingConversation) {
    openConversation(
      existingConversation
    );

    return;
  }

  openConversation({
    _id:
      routeConversationId,
    title:
      "Custom Bouquet Conversation",
    status: "active",
  });
}, [
  routeConversationId,
  conversations,
]);
  /* =======================================================
   * CREATE CONVERSATION
   * ===================================================== */

  const createConversation =
    async () => {
      try {
        setCreatingConversation(
          true
        );

        const response =
          await apiRequest<CreateConversationResponse>(
            "/bloomboard/ai/conversations",
            {
              method: "POST",
              authenticated: true,
            }
          );

        const conversation =
          response?.data
            ?.conversation;

        if (!conversation) {
          throw new Error(
            "The server did not return the new conversation."
          );
        }

        setConversations(
          (current) => [
            conversation,
            ...current.filter(
              (item) =>
                item._id !==
                conversation._id
            ),
          ]
        );

        setSelectedConversation(
          conversation
        );

        setMessages([]);
        setMessageText("");

        setCustomBouquetRequest(
          null
        );

        setProposalContext(
          null
        );
      } catch (requestError) {
        Alert.alert(
          "Unable to start chat",
          getErrorMessage(
            requestError,
            "Please try again."
          )
        );
      } finally {
        setCreatingConversation(
          false
        );
      }
    };

  /* =======================================================
   * SEND MESSAGE
   * ===================================================== */

  const sendMessage =
    async (
      suppliedText?: string
    ) => {
      if (
        !selectedConversation
      ) {
        return;
      }

      if (
        selectedConversation.status !==
        "active"
      ) {
        Alert.alert(
          "Archived conversation",
          "This conversation is archived. Start a new conversation to continue chatting."
        );

        return;
      }

      const content =
        (
          suppliedText ??
          messageText
        ).trim();

      if (!content) {
        return;
      }

      const temporaryId =
        `temp-${Date.now()}`;

      const temporaryMessage:
        AiMessage = {
          _id: temporaryId,
          conversation:
            selectedConversation._id,
          sender: null,
          role: "user",
          messageType: "text",
          content,
          createdAt:
            new Date().toISOString(),
        };

      try {
        setSendingMessage(true);

        setMessageText("");

        setMessages(
          (current) => [
            ...current,
            temporaryMessage,
          ]
        );

        setTimeout(() => {
          scrollRef.current
            ?.scrollToEnd({
              animated: true,
            });
        }, 80);

        const response =
          await apiRequest<SendMessageResponse>(
            `/bloomboard/ai/conversations/${selectedConversation._id}/messages`,
            {
              method: "POST",
              authenticated: true,
              body: JSON.stringify({
                content,
              }),
            }
          );

        const userMessage =
          response?.data
            ?.userMessage;

        const assistantMessage =
          response?.data
            ?.assistantMessage;

        if (
          response?.data
            ?.proposalContext !==
          undefined
        ) {
          setProposalContext(
            response.data
              .proposalContext ??
              null
          );
        }

        if (
          response?.data
            ?.customBouquetRequestId
        ) {
          const requestId =
            response.data
              .customBouquetRequestId;

          setCustomBouquetRequest(
            (current) => {
              if (
                current?._id ===
                requestId
              ) {
                return {
                  ...current,
                  status:
                    response.data
                      ?.proposalContext
                      ?.requestStatus ??
                    current.status,
                };
              }

              return {
                _id: requestId,
                status:
                  response.data
                    ?.proposalContext
                    ?.requestStatus,
              };
            }
          );
        }

        if (
          response?.data
            ?.canProceedToCheckout &&
          response?.data
            ?.customBouquetRequestId
        ) {
          const requestId =
            response.data
              .customBouquetRequestId;

          setCustomBouquetRequest(
            (current) => ({
              ...(current ?? {
                _id: requestId,
              }),
              _id: requestId,
              status:
                "customer_accepted",
            })
          );

          setProposalContext(
            (current) => ({
              ...(current ?? {}),
              customBouquetRequestId:
                requestId,
              selectedProposalId:
                response.data
                  ?.selectedProposalId ??
                current
                  ?.selectedProposalId ??
                null,
              requestStatus:
                "customer_accepted",
              canSelectProposal:
                false,
            })
          );
        }

        setMessages(
          (current) => {
            const withoutTemp =
              current.filter(
                (message) =>
                  message._id !==
                  temporaryId
              );

            const next = [
              ...withoutTemp,
            ];

            if (userMessage) {
              next.push(
                userMessage
              );
            } else {
              next.push(
                temporaryMessage
              );
            }

            if (
              assistantMessage
            ) {
              next.push(
                assistantMessage
              );
            }

            return next;
          }
        );

        const updatedConversation:
          AiConversation = {
            ...selectedConversation,
            preferences:
              response?.data
                ?.preferences ??
              selectedConversation.preferences,
            lastMessageAt:
              new Date().toISOString(),
            title:
              selectedConversation
                .title ===
                "New Bouquet Conversation"
                ? content.length >
                  60
                  ? `${content.slice(
                      0,
                      57
                    )}...`
                  : content
                : selectedConversation.title,
          };

        setSelectedConversation(
          updatedConversation
        );

        setConversations(
          (current) => [
            updatedConversation,
            ...current.filter(
              (item) =>
                item._id !==
                updatedConversation._id
            ),
          ]
        );

        setTimeout(() => {
          scrollRef.current
            ?.scrollToEnd({
              animated: true,
            });
        }, 120);
      } catch (requestError) {
        setMessages(
          (current) =>
            current.filter(
              (message) =>
                message._id !==
                temporaryId
            )
        );

        setMessageText(content);

        Alert.alert(
          "Unable to send message",
          getErrorMessage(
            requestError,
            "Please try again."
          )
        );
      } finally {
        setSendingMessage(false);
      }
    };

  /* =======================================================
   * ARCHIVE
   * ===================================================== */

  const archiveConversation =
    async () => {
      if (
        !selectedConversation
      ) {
        return;
      }

      try {
        setArchivingConversation(
          true
        );

        const response =
          await apiRequest<ArchiveConversationResponse>(
            `/bloomboard/ai/conversations/${selectedConversation._id}/archive`,
            {
              method: "PATCH",
              authenticated: true,
            }
          );

        const archived =
          response?.data
            ?.conversation ?? {
            ...selectedConversation,
            status:
              "archived" as const,
          };

        setConversations(
          (current) =>
            current.map(
              (conversation) =>
                conversation._id ===
                archived._id
                  ? archived
                  : conversation
            )
        );

        setSelectedConversation(
          archived
        );

        Alert.alert(
          "Conversation archived",
          "This AI bouquet conversation has been archived."
        );
      } catch (requestError) {
        Alert.alert(
          "Unable to archive conversation",
          getErrorMessage(
            requestError,
            "Please try again."
          )
        );
      } finally {
        setArchivingConversation(
          false
        );
      }
    };

  const confirmArchive =
    () => {
      if (
        !selectedConversation ||
        selectedConversation.status ===
          "archived"
      ) {
        return;
      }

      Alert.alert(
        "Archive conversation?",
        "You will still be able to view this conversation, but you will no longer be able to send new messages to it.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Archive",
            onPress:
              archiveConversation,
          },
        ]
      );
    };

  /* =======================================================
   * REFRESH
   * ===================================================== */

  const refreshCurrentView =
    async () => {
      setRefreshing(true);

      try {
        if (
          selectedConversation
        ) {
          await openConversation(
            selectedConversation
          );
        } else {
          await loadConversations();
        }
      } finally {
        setRefreshing(false);
      }
    };

  /* =======================================================
   * NAVIGATION HELPERS
   * ===================================================== */

  const openProduct = (
    product: AiProduct
  ) => {
    if (!product._id) {
      return;
    }

    router.push({
      pathname:
        "/(customer)/customer-product-details",
      params: {
        flowerId:
          product._id,
      },
    } as never);
  };

  const proceedToCheckout = (
    requestId?: string | null,
    proposalId?: string | null
  ) => {
    if (!requestId) {
      Alert.alert(
        "Checkout unavailable",
        "The custom bouquet request could not be identified."
      );

      return;
    }

    router.push({
      pathname:
        "/(customer)/customer-checkout",
      params: {
        customBouquetRequestId:
          requestId,

        ...(proposalId
          ? {
              proposalId,
            }
          : {}),
      },
    } as never);
  };

  /* =======================================================
   * GENERATED IMAGE
   * ===================================================== */

  const handleUseGeneratedImage = (
    message: AiMessage
  ) => {
    const imageUrl =
      message.metadata?.imageUrl;

    if (
      !selectedConversation ||
      !imageUrl
    ) {
      return;
    }

    router.push({
      pathname:
        "/(customer)/customer-custom-request",
      params: {
        aiConversationId:
          selectedConversation._id,
        sourceMessageId:
          message._id,
      },
    } as never);
  };

  /* =======================================================
   * PRODUCT CARD
   * ===================================================== */

  const renderProductCard = (
    product: AiProduct
  ) => {
    const image =
      getImageUrl(
        product.images?.[0]
      );

    const price =
      formatCurrency(
        product.price
      );

    return (
      <Pressable
        key={product._id}
        onPress={() =>
          openProduct(product)
        }
        style={({ pressed }) => [
          styles.productCard,
          pressed &&
            styles.pressed,
        ]}
      >
        {image ? (
          <Image
            source={{
              uri: image,
            }}
            style={
              styles.productImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.productImagePlaceholder
            }
          >
            <Ionicons
              name="flower-outline"
              size={29}
              color={
                COLORS.primary
              }
            />
          </View>
        )}

        <View
          style={
            styles.productBody
          }
        >
          <Text
            numberOfLines={1}
            style={
              styles.productName
            }
          >
            {product.name ||
              "Bouquet"}
          </Text>

          {!!product.florist
            ?.shopName && (
            <Text
              numberOfLines={1}
              style={
                styles.productFlorist
              }
            >
              {
                product.florist
                  .shopName
              }
            </Text>
          )}

          {!!price && (
            <Text
              style={
                styles.productPrice
              }
            >
              {price}
            </Text>
          )}

          <View
            style={
              styles.viewProductRow
            }
          >
            <Text
              style={
                styles.viewProductText
              }
            >
              View bouquet
            </Text>

            <Ionicons
              name="chevron-forward"
              size={14}
              color={
                COLORS.primary
              }
            />
          </View>
        </View>
      </Pressable>
    );
  };

  /* =======================================================
   * PROPOSAL EVENT
   * ===================================================== */

  const renderProposalCard = (
    message: AiMessage
  ) => {
    const metadata =
      message.metadata;

    if (!metadata) {
      return null;
    }

    const isProposalReceived =
      metadata.eventType ===
      "custom_bouquet_proposal_received";

    const isProposalSelected =
      metadata.eventType ===
        "custom_bouquet_proposal_selected" ||
      metadata.proposalStatus ===
        "selected";

    if (
      !isProposalReceived &&
      !isProposalSelected
    ) {
      return null;
    }

    const price =
      formatCurrency(
        metadata.quotedPrice
      );

    const canCheckout =
      metadata.canProceedToCheckout ===
        true ||
      (
        isProposalSelected &&
        metadata.requestStatus ===
          "customer_accepted"
      );

    return (
      <View
        style={[
          styles.proposalCard,
          isProposalSelected &&
            styles.selectedProposalCard,
        ]}
      >
        <View
          style={
            styles.proposalHeader
          }
        >
          <View
            style={
              styles.proposalIcon
            }
          >
            <Ionicons
              name={
                isProposalSelected
                  ? "checkmark-circle"
                  : "storefront-outline"
              }
              size={21}
              color={
                isProposalSelected
                  ? COLORS.success
                  : COLORS.primary
              }
            />
          </View>

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              numberOfLines={1}
              style={
                styles.proposalShop
              }
            >
              {metadata.shopName ||
                "Florist Proposal"}
            </Text>

            <Text
              style={[
                styles.proposalStatus,
                isProposalSelected && {
                  color:
                    COLORS.success,
                },
              ]}
            >
              {isProposalSelected
                ? "Selected proposal"
                : "New proposal received"}
            </Text>
          </View>

          {!!price && (
            <Text
              style={
                styles.proposalPrice
              }
            >
              {price}
            </Text>
          )}
        </View>

        {!isProposalSelected && (
          <Pressable
            disabled={
              sendingMessage
            }
            onPress={() =>
              sendMessage(
                "What proposals do I have?"
              )
            }
            style={
              styles.reviewProposalButton
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.reviewProposalText
              }
            >
              Review with AI
            </Text>
          </Pressable>
        )}

        {canCheckout && (
          <Pressable
            onPress={() =>
              proceedToCheckout(
                metadata.customBouquetRequestId,
                metadata.proposalId
              )
            }
            style={
              styles.checkoutButton
            }
          >
            <Ionicons
              name="bag-check-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.checkoutButtonText
              }
            >
              Proceed to Checkout
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  /* =======================================================
   * MESSAGE
   * ===================================================== */

  const renderMessage = (
    message: AiMessage
  ) => {
    const isUser =
      message.role === "user";

    const content =
      message.content?.trim();

    if (isUser) {
      return (
        <View
          key={message._id}
          style={
            styles.userMessageRow
          }
        >
          <View
            style={
              styles.userBubble
            }
          >
            {!!content && (
              <Text
                style={
                  styles.userBubbleText
                }
              >
                {content}
              </Text>
            )}

            {!!message.createdAt && (
              <Text
                style={
                  styles.userBubbleTime
                }
              >
                {formatRelativeDate(
                  message.createdAt
                )}
              </Text>
            )}
          </View>
        </View>
      );
    }

    const products =
      message.metadata
        ?.products ?? [];

    const generatedImage =
      getImageUrl(
        message.metadata
          ?.imageUrl
      );

    return (
      <View
        key={message._id}
        style={
          styles.assistantMessageRow
        }
      >
        <View
          style={
            styles.aiAvatar
          }
        >
          <Ionicons
            name="sparkles"
            size={17}
            color="#FFFFFF"
          />
        </View>

        <View
          style={
            styles.assistantContent
          }
        >
          <View
            style={
              styles.aiLabelRow
            }
          >
            <Text
              style={
                styles.aiLabel
              }
            >
              FLOGRAM AI
            </Text>

            {!!message.createdAt && (
              <Text
                style={
                  styles.aiMessageTime
                }
              >
                {formatRelativeDate(
                  message.createdAt
                )}
              </Text>
            )}
          </View>

          {!!content && (
            <View
              style={
                styles.assistantBubble
              }
            >
              <Text
                style={
                  styles.assistantBubbleText
                }
              >
                {content}
              </Text>
            </View>
          )}

          {renderProposalCard(
            message
          )}

          {message.messageType ===
            "product_results" &&
            products.length > 0 && (
              <View
                style={
                  styles.productResults
                }
              >
                <Text
                  style={
                    styles.resultSectionTitle
                  }
                >
                  FLOGRAM Matches
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.productScroll
                  }
                >
                  {products.map(
                    renderProductCard
                  )}
                </ScrollView>
              </View>
            )}

          {message.messageType ===
            "generated_image" &&
            generatedImage && (
              <View
                style={
                  styles.generatedImageCard
                }
              >
                <Text
                  style={
                    styles.generatedTitle
                  }
                >
                  Bouquet Inspiration
                </Text>

                <Text
                  style={
                    styles.generatedSubtitle
                  }
                >
                  AI-generated design
                </Text>

                <Image
                  source={{
                    uri:
                      generatedImage,
                  }}
                  style={
                    styles.generatedImage
                  }
                  resizeMode="cover"
                />

                <Pressable
                  onPress={() =>
                    handleUseGeneratedImage(
                      message
                    )
                  }
                  style={
                    styles.useImageButton
                  }
                >
                  <Ionicons
                    name="flower-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.useImageButtonText
                    }
                  >
                    Use for Custom Request
                  </Text>
                </Pressable>
              </View>
            )}
        </View>
      </View>
    );
  };

  /* =======================================================
   * REQUEST STATUS
   * ===================================================== */

  const renderRequestStatus =
    () => {
      if (
        !customBouquetRequest &&
        !proposalContext
      ) {
        return null;
      }

      const requestId =
        customBouquetRequest
          ?._id ??
        proposalContext
          ?.customBouquetRequestId;

      const status =
        proposalContext
          ?.requestStatus ??
        customBouquetRequest
          ?.status;

      const proposals =
        proposalContext
          ?.availableProposals ??
        [];

      const selectedProposalId =
        proposalContext
          ?.selectedProposalId;

      const accepted =
        status ===
        "customer_accepted";

      return (
        <View
          style={[
            styles.requestCard,
            accepted &&
              styles.requestAcceptedCard,
          ]}
        >
          <View
            style={
              styles.requestRow
            }
          >
            <Ionicons
              name={
                accepted
                  ? "checkmark-circle"
                  : "flower-outline"
              }
              size={22}
              color={
                accepted
                  ? COLORS.success
                  : COLORS.primary
              }
            />

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.requestTitle
                }
              >
                {accepted
                  ? "Proposal selected"
                  : "Custom Bouquet Request"}
              </Text>

              <Text
                style={
                  styles.requestText
                }
              >
                {accepted
                  ? "Your request is ready for checkout."
                  : proposals.length ===
                      0
                    ? "Waiting for florist proposals."
                    : `${proposals.length} ${
                        proposals.length ===
                        1
                          ? "proposal"
                          : "proposals"
                      } received.`}
              </Text>
            </View>
          </View>

          {!accepted &&
            proposals.length >
              0 && (
              <Pressable
                disabled={
                  sendingMessage
                }
                onPress={() =>
                  sendMessage(
                    "Compare my florist proposals."
                  )
                }
                style={
                  styles.requestActionButton
                }
              >
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.requestActionText
                  }
                >
                  Compare with AI
                </Text>
              </Pressable>
            )}

          {accepted &&
            requestId && (
              <Pressable
                onPress={() =>
                  proceedToCheckout(
                    requestId,
                    selectedProposalId
                  )
                }
                style={
                  styles.checkoutButton
                }
              >
                <Ionicons
                  name="bag-check-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.checkoutButtonText
                  }
                >
                  Proceed to Checkout
                </Text>
              </Pressable>
            )}
        </View>
      );
    };

  /* =======================================================
   * PREFERENCES
   * ===================================================== */

  const renderPreferences =
    () => {
      const preferences =
        selectedConversation
          ?.preferences;

      if (!preferences) {
        return null;
      }

      const chips: string[] =
        [];

      if (
        preferences.occasion
      ) {
        chips.push(
          preferences.occasion
        );
      }

      const budget =
        preferences.maxBudget ??
        preferences.minBudget;

      if (
        budget !== null &&
        budget !== undefined
      ) {
        chips.push(
          `Budget ${formatCurrency(
            budget
          )}`
        );
      }

      chips.push(
        ...cleanArray(
          preferences.flowerTypes
        ).slice(0, 3)
      );

      chips.push(
        ...cleanArray(
          preferences.colors
        ).slice(0, 3)
      );

      if (
        chips.length === 0
      ) {
        return null;
      }

      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.preferenceRow
          }
        >
          {chips.map(
            (chip, index) => (
              <View
                key={`${chip}-${index}`}
                style={
                  styles.preferenceChip
                }
              >
                <Text
                  style={
                    styles.preferenceChipText
                  }
                >
                  {chip}
                </Text>
              </View>
            )
          )}
        </ScrollView>
      );
    };

  /* =======================================================
   * QUICK PROMPTS
   * ===================================================== */

  const renderQuickPrompts =
    () => {
      if (
        messages.length > 0 ||
        !selectedConversation ||
        selectedConversation.status !==
          "active"
      ) {
        return null;
      }

      const prompts = [
        {
          icon:
            "flower-outline" as const,
          text:
            "Help me plan a bouquet",
        },
        {
          icon:
            "search-outline" as const,
          text:
            "Show me bouquets I can buy",
        },
        {
          icon:
            "image-outline" as const,
          text:
            "Generate a bouquet inspiration image",
        },
      ];

      return (
        <View
          style={
            styles.welcomeContainer
          }
        >
          <View
            style={
              styles.largeAiIcon
            }
          >
            <Ionicons
              name="sparkles"
              size={30}
              color={
                COLORS.primary
              }
            />
          </View>

          <Text
            style={
              styles.welcomeTitle
            }
          >
            Design with FLOGRAM AI
          </Text>

          <Text
            style={
              styles.welcomeText
            }
          >
            Tell me the occasion,
            flowers, colors, budget,
            style, or bouquet you have
            in mind.
          </Text>

          <View
            style={
              styles.quickPromptList
            }
          >
            {prompts.map(
              (prompt) => (
                <Pressable
                  key={
                    prompt.text
                  }
                  disabled={
                    sendingMessage
                  }
                  onPress={() =>
                    sendMessage(
                      prompt.text
                    )
                  }
                  style={
                    styles.quickPrompt
                  }
                >
                  <Ionicons
                    name={
                      prompt.icon
                    }
                    size={19}
                    color={
                      COLORS.primary
                    }
                  />

                  <Text
                    style={
                      styles.quickPromptText
                    }
                  >
                    {prompt.text}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color={
                      COLORS.primary
                    }
                  />
                </Pressable>
              )
            )}
          </View>
        </View>
      );
    };

  /* =======================================================
   * CONVERSATION LIST
   * ===================================================== */

  const renderConversationList =
    () => {
      if (
        loadingConversations &&
        conversations.length ===
          0
      ) {
        return (
          <View
            style={
              styles.centerState
            }
          >
            <ActivityIndicator
              size="large"
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.stateText
              }
            >
              Loading your AI
              conversations...
            </Text>
          </View>
        );
      }

      if (
        error &&
        conversations.length ===
          0
      ) {
        return (
          <View
            style={
              styles.centerState
            }
          >
            <Ionicons
              name="cloud-offline-outline"
              size={38}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.stateTitle
              }
            >
              Unable to load AI
            </Text>

            <Text
              style={
                styles.stateText
              }
            >
              {error}
            </Text>

            <Pressable
              onPress={() => {
                setLoadingConversations(
                  true
                );

                loadConversations();
              }}
              style={
                styles.retryButton
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        );
      }

      return (
        <ScrollView
          style={
            styles.conversationScroll
          }
          contentContainerStyle={
            styles.conversationContent
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                refreshCurrentView
              }
            />
          }
        >
          <View
            style={
              styles.aiHero
            }
          >
            <View
              style={
                styles.aiHeroIcon
              }
            >
              <Ionicons
                name="sparkles"
                size={29}
                color="#FFFFFF"
              />
            </View>

            <Text
              style={
                styles.aiHeroTitle
              }
            >
              Your AI Bouquet Assistant
            </Text>

            <Text
              style={
                styles.aiHeroText
              }
            >
              Plan bouquets, discover
              real FLOGRAM products,
              generate inspiration,
              and compare real florist
              proposals.
            </Text>

            <Pressable
              disabled={
                creatingConversation
              }
              onPress={
                createConversation
              }
              style={
                styles.newConversationButton
              }
            >
              {creatingConversation ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="add"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.newConversationText
                    }
                  >
                    New Conversation
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          <Text
            style={
              styles.listTitle
            }
          >
            Conversations
          </Text>

          {conversations.length ===
          0 ? (
            <View
              style={
                styles.emptyConversationCard
              }
            >
              <Ionicons
                name="chatbubbles-outline"
                size={36}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.emptyConversationTitle
                }
              >
                Start your first
                conversation
              </Text>
            </View>
          ) : (
            conversations.map(
              (conversation) => (
                <Pressable
                  key={
                    conversation._id
                  }
                  onPress={() =>
                    openConversation(
                      conversation
                    )
                  }
                  style={
                    styles.conversationCard
                  }
                >
                  <View
                    style={
                      styles.conversationIcon
                    }
                  >
                    <Ionicons
                      name={
                        conversation.status ===
                        "archived"
                          ? "archive-outline"
                          : "sparkles"
                      }
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
                      numberOfLines={1}
                      style={
                        styles.conversationTitle
                      }
                    >
                      {conversation.title ||
                        "New Bouquet Conversation"}
                    </Text>

                    <Text
                      style={
                        styles.conversationDate
                      }
                    >
                      {conversation.status ===
                      "archived"
                        ? "Archived"
                        : formatRelativeDate(
                            conversation.lastMessageAt
                          )}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#A69DA2"
                  />
                </Pressable>
              )
            )
          )}
        </ScrollView>
      );
    };

  /* =======================================================
   * CHAT
   * ===================================================== */

  const renderChatScreen =
    () => {
      if (
        !selectedConversation
      ) {
        return null;
      }

      const archived =
        selectedConversation
          .status === "archived";

      return (
        <View
          style={
            styles.chatContainer
          }
        >
          <View
            style={
              styles.chatHeader
            }
          >
            <Pressable
              onPress={() => {
                setSelectedConversation(
                  null
                );

                setMessages([]);
                setMessageText("");

                setCustomBouquetRequest(
                  null
                );

                setProposalContext(
                  null
                );

                loadConversations();
              }}
              style={
                styles.backButton
              }
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
              style={{
                flex: 1,
                marginHorizontal: 11,
              }}
            >
              <Text
                numberOfLines={1}
                style={
                  styles.chatHeaderTitle
                }
              >
                {selectedConversation.title ||
                  "Bouquet Assistant"}
              </Text>

              <Text
                style={
                  styles.chatHeaderSubtitle
                }
              >
                {archived
                  ? "Archived"
                  : sendingMessage
                    ? "FLOGRAM AI is thinking..."
                    : "AI Bouquet Assistant"}
              </Text>
            </View>

            <Pressable
              disabled={
                archived ||
                archivingConversation
              }
              onPress={
                confirmArchive
              }
              style={
                styles.headerActionButton
              }
            >
              <Ionicons
                name="archive-outline"
                size={21}
                color={
                  COLORS.primary
                }
              />
            </Pressable>
          </View>

          {renderPreferences()}

          {renderRequestStatus()}

          <ScrollView
            ref={scrollRef}
            style={
              styles.messageScroll
            }
            contentContainerStyle={
              styles.messageContent
            }
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  refreshCurrentView
                }
              />
            }
          >
            {renderQuickPrompts()}

            {messages.map(
              renderMessage
            )}

            {sendingMessage && (
              <View
                style={
                  styles.typingBubble
                }
              >
                <ActivityIndicator
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.typingText
                  }
                >
                  Creating a response...
                </Text>
              </View>
            )}
          </ScrollView>

          {!archived && (
            <View
              style={
                styles.composer
              }
            >
              <TextInput
                value={
                  messageText
                }
                onChangeText={
                  setMessageText
                }
                placeholder="Ask about your bouquet..."
                placeholderTextColor="#9E949A"
                multiline
                maxLength={2000}
                editable={
                  !sendingMessage
                }
                style={
                  styles.messageInput
                }
              />

              <Pressable
                disabled={
                  sendingMessage ||
                  !messageText.trim()
                }
                onPress={() =>
                  sendMessage()
                }
                style={[
                  styles.sendButton,
                  (sendingMessage ||
                    !messageText.trim()) &&
                    styles.sendButtonDisabled,
                ]}
              >
                <Ionicons
                  name="arrow-up"
                  size={21}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          )}
        </View>
      );
    };

  /* =======================================================
   * MAIN
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
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        {selectedConversation ? (
          renderChatScreen()
        ) : (
          <>
            <View
              style={
                styles.header
              }
            >
              <View>
                <Text
                  style={
                    styles.headerEyebrow
                  }
                >
                  FLOGRAM ASSISTANT
                </Text>

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Bouquet AI
                </Text>
              </View>

              <Ionicons
                name="sparkles"
                size={27}
                color={
                  COLORS.primary
                }
              />
            </View>

            {renderConversationList()}

            <View
              style={
                styles.bottomNav
              }
            >
              {NAV_ITEMS.map(
                (item) => {
                  const active =
                    item.key ===
                    "ai";

                  return (
                    <Pressable
                      key={
                        item.key
                      }
                      onPress={() => {
                        if (active) {
                          return;
                        }

                        router.replace(
                          item.route as never
                        );
                      }}
                      style={
                        styles.navItem
                      }
                    >
                      <Ionicons
                        name={
                          active
                            ? item.activeIcon
                            : item.icon
                        }
                        size={22}
                        color={
                          active
                            ? COLORS.primary
                            : "#8E858A"
                        }
                      />

                      <Text
                        style={[
                          styles.navLabel,
                          active &&
                            styles.navLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </>
        )}
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

    pressed: {
      opacity: 0.75,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    headerEyebrow: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.5,
      color:
        COLORS.primary,
    },

    headerTitle: {
      fontSize: 30,
      fontWeight: "800",
      color: COLORS.text,
    },

    conversationScroll: {
      flex: 1,
    },

    conversationContent: {
      paddingHorizontal: 20,
      paddingBottom: 35,
    },

    aiHero: {
      padding: 20,
      borderRadius: 24,
      backgroundColor:
        COLORS.primarySoft,
      borderWidth: 1,
      borderColor:
        "#ECD8E1",
    },

    aiHeroIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primary,
      marginBottom: 15,
    },

    aiHeroTitle: {
      fontSize: 21,
      fontWeight: "900",
      color: COLORS.text,
    },

    aiHeroText: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color:
        COLORS.textMuted,
    },

    newConversationButton: {
      marginTop: 18,
      height: 46,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor:
        COLORS.primary,
    },

    newConversationText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    listTitle: {
      marginTop: 25,
      marginBottom: 12,
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.text,
    },

    conversationCard: {
      minHeight: 76,
      marginBottom: 10,
      paddingHorizontal: 13,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    conversationIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    conversationTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: COLORS.text,
    },

    conversationDate: {
      marginTop: 5,
      fontSize: 10,
      color:
        COLORS.textMuted,
    },

    emptyConversationCard: {
      paddingVertical: 42,
      alignItems: "center",
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    emptyConversationTitle: {
      marginTop: 13,
      fontSize: 16,
      fontWeight: "800",
      color: COLORS.text,
    },

    centerState: {
      flex: 1,
      paddingHorizontal: 25,
      alignItems: "center",
      justifyContent: "center",
    },

    stateTitle: {
      marginTop: 12,
      fontSize: 17,
      fontWeight: "800",
      color: COLORS.text,
    },

    stateText: {
      marginTop: 8,
      fontSize: 12,
      color:
        COLORS.textMuted,
      textAlign: "center",
    },

    retryButton: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor:
        COLORS.primary,
    },

    retryText: {
      color: "#FFFFFF",
      fontWeight: "800",
    },

    chatContainer: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    chatHeader: {
      minHeight: 68,
      paddingHorizontal: 14,
      paddingVertical: 9,
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

    chatHeaderTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: COLORS.text,
    },

    chatHeaderSubtitle: {
      marginTop: 3,
      fontSize: 10,
      color:
        COLORS.textMuted,
    },

    headerActionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    preferenceRow: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      gap: 7,
      backgroundColor:
        COLORS.card,
    },

    preferenceChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 15,
      backgroundColor:
        COLORS.primarySoft,
    },

    preferenceChipText: {
      fontSize: 10,
      fontWeight: "700",
      color:
        COLORS.primary,
    },

    requestCard: {
      marginHorizontal: 14,
      marginTop: 10,
      padding: 12,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        "#ECD8E1",
      backgroundColor:
        COLORS.primarySoft,
    },

    requestAcceptedCard: {
      borderColor:
        "#B7E4C7",
      backgroundColor:
        COLORS.successSoft,
    },

    requestRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    requestTitle: {
      fontSize: 12,
      fontWeight: "900",
      color: COLORS.text,
    },

    requestText: {
      marginTop: 2,
      fontSize: 10,
      color:
        COLORS.textMuted,
    },

    requestActionButton: {
      marginTop: 10,
      minHeight: 38,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor:
        COLORS.card,
    },

    requestActionText: {
      fontSize: 11,
      fontWeight: "800",
      color:
        COLORS.primary,
    },

    messageScroll: {
      flex: 1,
    },

    messageContent: {
      flexGrow: 1,
      paddingHorizontal: 14,
      paddingTop: 18,
      paddingBottom: 24,
    },

    userMessageRow: {
      width: "100%",
      marginBottom: 16,
      alignItems: "flex-end",
    },

    userBubble: {
      maxWidth: "83%",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      backgroundColor:
        COLORS.primary,
    },

    userBubbleText: {
      fontSize: 14,
      lineHeight: 20,
      color: "#FFFFFF",
    },

    userBubbleTime: {
      marginTop: 5,
      fontSize: 8,
      color:
        "rgba(255,255,255,0.68)",
      textAlign: "right",
    },

    assistantMessageRow: {
      width: "100%",
      marginBottom: 19,
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 9,
    },

    aiAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primary,
    },

    assistantContent: {
      flex: 1,
    },

    aiLabelRow: {
      marginBottom: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    aiLabel: {
      fontSize: 10,
      fontWeight: "900",
      color:
        COLORS.primary,
    },

    aiMessageTime: {
      fontSize: 8,
      color: "#A69DA2",
    },

    assistantBubble: {
      alignSelf:
        "flex-start",
      maxWidth: "96%",
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    assistantBubbleText: {
      fontSize: 14,
      lineHeight: 21,
      color: COLORS.text,
    },

    typingBubble: {
      padding: 12,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },

    typingText: {
      fontSize: 11,
      color:
        COLORS.textMuted,
    },

    welcomeContainer: {
      paddingTop: 28,
      paddingBottom: 30,
      alignItems: "center",
    },

    largeAiIcon: {
      width: 68,
      height: 68,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    welcomeTitle: {
      marginTop: 14,
      fontSize: 20,
      fontWeight: "900",
      color: COLORS.text,
    },

    welcomeText: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.textMuted,
      textAlign: "center",
    },

    quickPromptList: {
      width: "100%",
      marginTop: 20,
      gap: 9,
    },

    quickPrompt: {
      minHeight: 58,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    quickPromptText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: COLORS.text,
    },

    proposalCard: {
      marginTop: 9,
      padding: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.primarySoft,
    },

    selectedProposalCard: {
      borderColor:
        "#B7E4C7",
      backgroundColor:
        COLORS.successSoft,
    },

    proposalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    proposalIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.card,
    },

    proposalShop: {
      fontSize: 13,
      fontWeight: "900",
      color: COLORS.text,
    },

    proposalStatus: {
      marginTop: 2,
      fontSize: 9,
      fontWeight: "700",
      color:
        COLORS.primary,
    },

    proposalPrice: {
      fontSize: 15,
      fontWeight: "900",
      color:
        COLORS.primary,
    },

    reviewProposalButton: {
      marginTop: 11,
      minHeight: 38,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor:
        COLORS.card,
    },

    reviewProposalText: {
      fontSize: 11,
      fontWeight: "800",
      color:
        COLORS.primary,
    },

    checkoutButton: {
      marginTop: 12,
      minHeight: 43,
      paddingHorizontal: 13,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor:
        COLORS.primary,
    },

    checkoutButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    productResults: {
      marginTop: 11,
    },

    resultSectionTitle: {
      marginBottom: 8,
      fontSize: 11,
      fontWeight: "800",
      color:
        COLORS.textMuted,
    },

    productScroll: {
      gap: 10,
    },

    productCard: {
      width: 188,
      overflow: "hidden",
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    productImage: {
      width: "100%",
      height: 135,
    },

    productImagePlaceholder: {
      width: "100%",
      height: 135,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    productBody: {
      padding: 11,
    },

    productName: {
      fontSize: 13,
      fontWeight: "800",
      color: COLORS.text,
    },

    productFlorist: {
      marginTop: 5,
      fontSize: 9,
      color:
        COLORS.textMuted,
    },

    productPrice: {
      marginTop: 7,
      fontSize: 14,
      fontWeight: "900",
      color:
        COLORS.primary,
    },

    viewProductRow: {
      marginTop: 9,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },

    viewProductText: {
      fontSize: 10,
      fontWeight: "800",
      color:
        COLORS.primary,
    },

    generatedImageCard: {
      marginTop: 10,
      padding: 11,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    generatedTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: COLORS.text,
    },

    generatedSubtitle: {
      marginTop: 2,
      marginBottom: 9,
      fontSize: 9,
      color:
        COLORS.textMuted,
    },

    generatedImage: {
      width: "100%",
      height: 300,
      borderRadius: 13,
    },

    useImageButton: {
      marginTop: 10,
      minHeight: 43,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      backgroundColor:
        COLORS.primary,
    },

    useImageButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    composer: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    messageInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 18,
      backgroundColor:
        COLORS.graySoft,
      color: COLORS.text,
      fontSize: 13,
    },

    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primary,
    },

    sendButtonDisabled: {
      opacity: 0.4,
    },

    bottomNav: {
      minHeight: 67,
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    navItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
    },

    navLabel: {
      fontSize: 9,
      fontWeight: "600",
      color: "#8E858A",
    },

    navLabelActive: {
      color:
        COLORS.primary,
      fontWeight: "800",
    },
  });