import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { getStoredUser } from "../../services/auth";

/* =========================================================
 * TYPES
 * ======================================================= */

type BloomTab =
  | "feed"
  | "my-posts"
  | "requests";

type Author = {
  _id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  profileImage?: string | null;
};

type Florist = {
  _id: string;
  shopName?: string;
  shopLogo?: string | null;
  address?: unknown;
};

type BloomPost = {
  _id: string;
  author?: Author | null;
  authorRole?: "customer" | "seller";
  florist?: Florist | null;
  caption?: string;
  images?: string[];
  postType?:
    | "general"
    | "bouquet_inspiration";
  likes?: string[];
  saves?: string[];
  likeCount?: number;
  commentCount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type BloomComment = {
  _id: string;
  post?: string;
  author?: Author | null;
  content: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type BloomFeedResponse = {
  success: boolean;
  message?: string;
  data?: {
    count?: number;
    posts?: BloomPost[];
  };
};

type CreatePostResponse = {
  success: boolean;
  message?: string;
  data?: {
    post?: BloomPost;
  };
};

type MutationResponse = {
  success: boolean;
  message?: string;
  data?: {
    liked?: boolean;
    likeCount?: number;
    saved?: boolean;
  };
};

type CommentsResponse = {
  success: boolean;
  message?: string;
  data?: {
    count?: number;
    comments?: BloomComment[];
  };
};

type CreateCommentResponse = {
  success: boolean;
  message?: string;
  data?: {
    comment?: BloomComment;
  };
};

type DeleteCommentResponse = {
  success: boolean;
  message?: string;
  data?: {
    comment?: BloomComment;
  };
};

type SelectedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type BouquetRequestStatus =
  | "open"
  | "pending"
  | "accepted"
  | "rejected"
  | "quoted"
  | "customer_accepted"
  | "customer_declined"
  | "cancelled";

type RequestAiConversation = {
  _id: string;
  title?: string;
  status?: "active" | "archived";
  lastMessageAt?: string;
};

type CustomBouquetRequest = {
  _id: string;

  florist?: Florist | null;

  aiConversation?:
    | RequestAiConversation
    | string
    | null;

  selectedProposal?:
    | {
        _id?: string;
      }
    | string
    | null;

  inspirationImage?: string | null;

  occasion?: string | null;
  budget?: number | null;
  quantity?: number;

  requestedDate?: string | null;

  flowerTypes?: string[];
  colors?: string[];
  styles?: string[];

  theme?: string | null;
  bouquetSize?: string | null;
  wrapping?: string | null;

  specialInstructions?: string[];

  customerMessage?: string | null;

  status:
    | "open"
    | "pending"
    | "accepted"
    | "rejected"
    | "quoted"
    | "customer_accepted"
    | "customer_declined"
    | "cancelled";

  sellerResponse?: string | null;
  quotedPrice?: number | null;

  respondedAt?: string | null;

  proposalSelectedAt?: string | null;

  customerDecisionAt?: string | null;
  customerDecisionMessage?: string | null;

  convertedToOrderAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type CustomRequestListResponse = {
  success: boolean;
  message?: string;
  data?: {
    count?: number;
    requests?: CustomBouquetRequest[];
  };
};

type CustomRequestMutationResponse = {
  success: boolean;
  message?: string;
  data?: {
    request?: CustomBouquetRequest;
  };
};

type LocalPostState = {
  liked?: boolean;
  saved?: boolean;
  likeCount?: number;
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
  pinkSoft: "#FFF5F8",
  background: "#FFFDFE",
  card: "#FFFFFF",
  text: "#252025",
  textMuted: "#786F75",
  border: "#EDE4E8",
  danger: "#B42318",
  dangerSoft: "#FFF1F0",
  success: "#157347",
  successSoft: "#ECFDF3",
  warning: "#A15C00",
  warningSoft: "#FFF8E7",
  blue: "#2866B1",
  blueSoft: "#EEF5FF",
  graySoft: "#F6F4F5",
};

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "";

const SERVER_ORIGIN = API_BASE
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/+$/, "");

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

const getAuthorFullName = (
  author?: Author | null
) => {
  const firstName =
    author?.firstName?.trim() ?? "";

  const lastName =
    author?.lastName?.trim() ?? "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return fullName || "FLOGRAM User";
};

const getAuthorName = (
  post: BloomPost
) => {
  if (post.florist?.shopName) {
    return post.florist.shopName;
  }

  const name =
    getAuthorFullName(post.author);

  if (name !== "FLOGRAM User") {
    return name;
  }

  return post.authorRole === "seller"
    ? "FLOGRAM Florist"
    : "FLOGRAM Customer";
};

const getPostRoleLabel = (
  post: BloomPost
) => {
  if (post.florist?.shopName) {
    return "Florist";
  }

  return post.authorRole === "seller"
    ? "Seller"
    : "Customer";
};

const formatRelativeDate = (
  value?: string
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
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

const statusDetails = (
  status: BouquetRequestStatus
) => {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        background: COLORS.warningSoft,
        color: COLORS.warning,
        icon: "time-outline" as const,
      };

    case "accepted":
      return {
        label: "Accepted",
        background: COLORS.blueSoft,
        color: COLORS.blue,
        icon:
          "checkmark-circle-outline" as const,
      };

    case "quoted":
      return {
        label: "Quote Received",
        background: COLORS.primarySoft,
        color: COLORS.primary,
        icon: "pricetag-outline" as const,
      };

    case "customer_accepted":
      return {
        label: "Quote Accepted",
        background: COLORS.successSoft,
        color: COLORS.success,
        icon: "checkmark-circle" as const,
      };

    case "customer_declined":
      return {
        label: "Quote Declined",
        background: COLORS.graySoft,
        color: COLORS.textMuted,
        icon:
          "close-circle-outline" as const,
      };

    case "rejected":
      return {
        label: "Rejected",
        background: COLORS.dangerSoft,
        color: COLORS.danger,
        icon:
          "close-circle-outline" as const,
      };

    case "cancelled":
      return {
        label: "Cancelled",
        background: COLORS.graySoft,
        color: COLORS.textMuted,
        icon: "ban-outline" as const,
      };

    default:
      return {
        label: status,
        background: COLORS.graySoft,
        color: COLORS.textMuted,
        icon:
          "information-circle-outline" as const,
      };
  }
};

/* =========================================================
 * SCREEN
 * ======================================================= */

export default function CustomerBloomboardScreen() {
  const router = useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<BloomTab>("feed");

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<string | null>(
    null
  );

  const [
    feedPosts,
    setFeedPosts,
  ] = useState<BloomPost[]>([]);

  const [
    myPosts,
    setMyPosts,
  ] = useState<BloomPost[]>([]);

  const [
    requests,
    setRequests,
  ] = useState<
    CustomBouquetRequest[]
  >([]);

  const [
    loadingFeed,
    setLoadingFeed,
  ] = useState(true);

  const [
    loadingMyPosts,
    setLoadingMyPosts,
  ] = useState(false);

  const [
    loadingRequests,
    setLoadingRequests,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    feedError,
    setFeedError,
  ] = useState<string | null>(
    null
  );

  const [
    myPostsError,
    setMyPostsError,
  ] = useState<string | null>(
    null
  );

  const [
    requestsError,
    setRequestsError,
  ] = useState<string | null>(
    null
  );

  /* =======================================================
   * CREATE POST
   * ===================================================== */

  const [
    caption,
    setCaption,
  ] = useState("");

  const [
    selectedImages,
    setSelectedImages,
  ] = useState<SelectedImage[]>(
    []
  );

  const [
    creatingPost,
    setCreatingPost,
  ] = useState(false);

  const [
    deletingPostId,
    setDeletingPostId,
  ] = useState<string | null>(
    null
  );

  /* =======================================================
   * LIKE / SAVE
   * ===================================================== */

  const [
    localPostState,
    setLocalPostState,
  ] = useState<
    Record<
      string,
      LocalPostState
    >
  >({});

  /* =======================================================
   * COMMENTS
   * ===================================================== */

  const [
    commentsVisible,
    setCommentsVisible,
  ] = useState(false);

  const [
    selectedPost,
    setSelectedPost,
  ] = useState<BloomPost | null>(
    null
  );

  const [
    comments,
    setComments,
  ] = useState<BloomComment[]>(
    []
  );

  const [
    loadingComments,
    setLoadingComments,
  ] = useState(false);

  const [
    commentsError,
    setCommentsError,
  ] = useState<string | null>(
    null
  );

  const [
    commentText,
    setCommentText,
  ] = useState("");

  const [
    creatingComment,
    setCreatingComment,
  ] = useState(false);

  const [
    deletingCommentId,
    setDeletingCommentId,
  ] = useState<string | null>(
    null
  );

  /* =======================================================
   * REQUESTS
   * ===================================================== */

  const [
    requestActionId,
    setRequestActionId,
  ] = useState<string | null>(
    null
  );

  /* =======================================================
   * LOAD USER
   * ===================================================== */

  useEffect(() => {
    const loadStoredUser =
      async () => {
        try {
          const user =
            await getStoredUser();

          setCurrentUserId(
            user?._id ?? null
          );
        } catch {
          setCurrentUserId(null);
        }
      };

    loadStoredUser();
  }, []);

  /* =======================================================
   * API LOADERS
   * ===================================================== */

  const loadFeed =
    useCallback(async () => {
      try {
        setFeedError(null);

        const response =
          await apiRequest<BloomFeedResponse>(
            "/bloomboard?limit=50"
          );

        setFeedPosts(
          response?.data?.posts ??
            []
        );
      } catch (error) {
        setFeedError(
          getErrorMessage(
            error,
            "Unable to load the BloomBoard feed."
          )
        );
      } finally {
        setLoadingFeed(false);
      }
    }, []);

  const loadMyPosts =
    useCallback(async () => {
      try {
        setMyPostsError(null);

        const response =
          await apiRequest<BloomFeedResponse>(
            "/bloomboard/mine",
            {
              authenticated: true,
            }
          );

        setMyPosts(
          response?.data?.posts ??
            []
        );
      } catch (error) {
        setMyPostsError(
          getErrorMessage(
            error,
            "Unable to load your BloomBoard posts."
          )
        );
      } finally {
        setLoadingMyPosts(false);
      }
    }, []);

  const loadRequests =
    useCallback(async () => {
      try {
        setRequestsError(null);

        const response =
          await apiRequest<CustomRequestListResponse>(
            "/bloomboard/custom-bouquet-requests/mine",
            {
              authenticated: true,
            }
          );

        setRequests(
          response?.data
            ?.requests ?? []
        );
      } catch (error) {
        setRequestsError(
          getErrorMessage(
            error,
            "Unable to load your bouquet requests."
          )
        );
      } finally {
        setLoadingRequests(false);
      }
    }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (
      activeTab === "my-posts"
    ) {
      setLoadingMyPosts(true);
      loadMyPosts();
    }

    if (
      activeTab === "requests"
    ) {
      setLoadingRequests(true);
      loadRequests();
    }
  }, [
    activeTab,
    loadMyPosts,
    loadRequests,
  ]);

  const refreshCurrentTab =
    useCallback(async () => {
      setRefreshing(true);

      try {
        if (
          activeTab === "feed"
        ) {
          await loadFeed();
        } else if (
          activeTab === "my-posts"
        ) {
          await loadMyPosts();
        } else {
          await loadRequests();
        }
      } finally {
        setRefreshing(false);
      }
    }, [
      activeTab,
      loadFeed,
      loadMyPosts,
      loadRequests,
    ]);

  /* =======================================================
   * POST HELPERS
   * ===================================================== */

  const updatePostEverywhere = (
    postId: string,
    patch: Partial<BloomPost>
  ) => {
    setFeedPosts((current) =>
      current.map((post) =>
        post._id === postId
          ? {
              ...post,
              ...patch,
            }
          : post
      )
    );

    setMyPosts((current) =>
      current.map((post) =>
        post._id === postId
          ? {
              ...post,
              ...patch,
            }
          : post
      )
    );

    setSelectedPost(
      (current) =>
        current?._id === postId
          ? {
              ...current,
              ...patch,
            }
          : current
    );
  };

  const isLiked = (
    post: BloomPost
  ) => {
    const local =
      localPostState[post._id];

    if (
      local?.liked !== undefined
    ) {
      return local.liked;
    }

    if (!currentUserId) {
      return false;
    }

    return (
      post.likes?.some(
        (id) =>
          String(id) ===
          currentUserId
      ) ?? false
    );
  };

  const isSaved = (
    post: BloomPost
  ) => {
    const local =
      localPostState[post._id];

    if (
      local?.saved !== undefined
    ) {
      return local.saved;
    }

    if (!currentUserId) {
      return false;
    }

    return (
      post.saves?.some(
        (id) =>
          String(id) ===
          currentUserId
      ) ?? false
    );
  };

  const getLikeCount = (
    post: BloomPost
  ) => {
    return (
      localPostState[post._id]
        ?.likeCount ??
      post.likeCount ??
      post.likes?.length ??
      0
    );
  };

  /* =======================================================
   * LIKE
   * ===================================================== */

  const handleLike = async (
    post: BloomPost
  ) => {
    const currentlyLiked =
      isLiked(post);

    const currentCount =
      getLikeCount(post);

    const nextLiked =
      !currentlyLiked;

    const optimisticCount =
      Math.max(
        0,
        currentCount +
          (nextLiked ? 1 : -1)
      );

    setLocalPostState(
      (current) => ({
        ...current,
        [post._id]: {
          ...current[post._id],
          liked: nextLiked,
          likeCount:
            optimisticCount,
        },
      })
    );

    updatePostEverywhere(
      post._id,
      {
        likeCount:
          optimisticCount,
      }
    );

    try {
      const response =
        await apiRequest<MutationResponse>(
          `/bloomboard/${post._id}/like`,
          {
            method: nextLiked
              ? "POST"
              : "DELETE",
            authenticated: true,
          }
        );

      const serverLiked =
        response?.data?.liked ??
        nextLiked;

      const serverCount =
        response?.data
          ?.likeCount ??
        optimisticCount;

      setLocalPostState(
        (current) => ({
          ...current,
          [post._id]: {
            ...current[post._id],
            liked:
              serverLiked,
            likeCount:
              serverCount,
          },
        })
      );

      updatePostEverywhere(
        post._id,
        {
          likeCount:
            serverCount,
        }
      );
    } catch (error) {
      setLocalPostState(
        (current) => ({
          ...current,
          [post._id]: {
            ...current[post._id],
            liked:
              currentlyLiked,
            likeCount:
              currentCount,
          },
        })
      );

      updatePostEverywhere(
        post._id,
        {
          likeCount:
            currentCount,
        }
      );

      Alert.alert(
        "Unable to update like",
        getErrorMessage(
          error,
          "Please try again."
        )
      );
    }
  };

  /* =======================================================
   * SAVE
   * ===================================================== */

  const handleSave = async (
    post: BloomPost
  ) => {
    const currentlySaved =
      isSaved(post);

    const nextSaved =
      !currentlySaved;

    setLocalPostState(
      (current) => ({
        ...current,
        [post._id]: {
          ...current[post._id],
          saved: nextSaved,
        },
      })
    );

    try {
      const response =
        await apiRequest<MutationResponse>(
          `/bloomboard/${post._id}/save`,
          {
            method: nextSaved
              ? "POST"
              : "DELETE",
            authenticated: true,
          }
        );

      setLocalPostState(
        (current) => ({
          ...current,
          [post._id]: {
            ...current[post._id],
            saved:
              response?.data
                ?.saved ??
              nextSaved,
          },
        })
      );
    } catch (error) {
      setLocalPostState(
        (current) => ({
          ...current,
          [post._id]: {
            ...current[post._id],
            saved:
              currentlySaved,
          },
        })
      );

      Alert.alert(
        "Unable to save post",
        getErrorMessage(
          error,
          "Please try again."
        )
      );
    }
  };

  /* =======================================================
   * IMAGE PICKER
   * ===================================================== */

  const pickPostImages =
    async () => {
      try {
        if (
          selectedImages.length >= 5
        ) {
          Alert.alert(
            "Maximum reached",
            "You can upload up to 5 images per BloomBoard post."
          );
          return;
        }

        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          !permission.granted
        ) {
          Alert.alert(
            "Photo permission required",
            "Please allow FLOGRAM to access your photos so you can add images to your BloomBoard post."
          );
          return;
        }

        const remaining =
          5 -
          selectedImages.length;

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                "images",
              ],
              allowsMultipleSelection:
                true,
              selectionLimit:
                remaining,
              quality: 0.9,
            }
          );

        if (result.canceled) {
          return;
        }

        const picked =
          result.assets.map(
            (asset) => ({
              uri: asset.uri,
              fileName:
                asset.fileName,
              mimeType:
                asset.mimeType,
            })
          );

        setSelectedImages(
          (current) => {
            const combined = [
              ...current,
              ...picked,
            ];

            const unique =
              combined.filter(
                (
                  item,
                  index,
                  array
                ) =>
                  array.findIndex(
                    (candidate) =>
                      candidate.uri ===
                      item.uri
                  ) === index
              );

            return unique.slice(
              0,
              5
            );
          }
        );
      } catch (error) {
        Alert.alert(
          "Unable to open photos",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      }
    };

  const removeSelectedImage = (
    uri: string
  ) => {
    setSelectedImages(
      (current) =>
        current.filter(
          (image) =>
            image.uri !== uri
        )
    );
  };

  /* =======================================================
   * CREATE POST
   * ===================================================== */

  const handleCreatePost =
    async () => {
      const trimmedCaption =
        caption.trim();

      if (
        !trimmedCaption &&
        selectedImages.length === 0
      ) {
        Alert.alert(
          "Add something to share",
          "Write a caption or add at least one photo."
        );
        return;
      }

      try {
        setCreatingPost(true);

        const formData =
          new FormData();

        if (trimmedCaption) {
          formData.append(
            "caption",
            trimmedCaption
          );
        }

        formData.append(
          "postType",
          "general"
        );

        selectedImages.forEach(
          (image, index) => {
            const extension =
              image.uri
                .split(".")
                .pop()
                ?.split("?")[0]
                ?.toLowerCase() ||
              "jpg";

            const fallbackType =
              extension === "png"
                ? "image/png"
                : extension === "webp"
                  ? "image/webp"
                  : "image/jpeg";

            formData.append(
              "images",
              {
                uri: image.uri,
                name:
                  image.fileName ||
                  `bloomboard-${Date.now()}-${index}.${extension}`,
                type:
                  image.mimeType ||
                  fallbackType,
              } as any
            );
          }
        );

        const response =
          await apiRequest<CreatePostResponse>(
            "/bloomboard",
            {
              method: "POST",
              authenticated: true,
              body: formData,
            }
          );

        const createdPost =
          response?.data?.post;

        setCaption("");
        setSelectedImages([]);

        if (createdPost) {
          setMyPosts(
            (current) => [
              createdPost,
              ...current,
            ]
          );

          setFeedPosts(
            (current) => [
              createdPost,
              ...current,
            ]
          );
        } else {
          await Promise.all([
            loadMyPosts(),
            loadFeed(),
          ]);
        }

        Alert.alert(
          "Post shared",
          "Your BloomBoard post has been published."
        );
      } catch (error) {
        Alert.alert(
          "Unable to share post",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      } finally {
        setCreatingPost(false);
      }
    };

  /* =======================================================
   * DELETE POST
   * ===================================================== */

  const confirmDeletePost = (
    post: BloomPost
  ) => {
    Alert.alert(
      "Delete post?",
      "This post will be removed from BloomBoard.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style:
            "destructive",
          onPress: () =>
            deletePost(post),
        },
      ]
    );
  };

  const deletePost = async (
    post: BloomPost
  ) => {
    try {
      setDeletingPostId(
        post._id
      );

      await apiRequest(
        `/bloomboard/${post._id}`,
        {
          method: "DELETE",
          authenticated: true,
        }
      );

      setMyPosts(
        (current) =>
          current.filter(
            (item) =>
              item._id !==
              post._id
          )
      );

      setFeedPosts(
        (current) =>
          current.filter(
            (item) =>
              item._id !==
              post._id
          )
      );

      if (
        selectedPost?._id ===
        post._id
      ) {
        setCommentsVisible(
          false
        );
      }
    } catch (error) {
      Alert.alert(
        "Unable to delete post",
        getErrorMessage(
          error,
          "Please try again."
        )
      );
    } finally {
      setDeletingPostId(
        null
      );
    }
  };

  /* =======================================================
   * COMMENTS
   * ===================================================== */

  const loadComments =
    useCallback(
      async (
        postId: string
      ) => {
        try {
          setLoadingComments(
            true
          );

          setCommentsError(null);

          const response =
            await apiRequest<CommentsResponse>(
              `/bloomboard/${postId}/comments`
            );

          setComments(
            response?.data
              ?.comments ?? []
          );
        } catch (error) {
          setCommentsError(
            getErrorMessage(
              error,
              "Unable to load comments."
            )
          );
        } finally {
          setLoadingComments(
            false
          );
        }
      },
      []
    );

  const openComments = (
    post: BloomPost
  ) => {
    setSelectedPost(post);
    setComments([]);
    setCommentText("");
    setCommentsError(null);
    setCommentsVisible(true);

    loadComments(post._id);
  };

  const closeComments = () => {
    if (
      creatingComment ||
      deletingCommentId
    ) {
      return;
    }

    setCommentsVisible(false);
    setSelectedPost(null);
    setComments([]);
    setCommentText("");
    setCommentsError(null);
  };

  const handleCreateComment =
    async () => {
      if (!selectedPost) {
        return;
      }

      const content =
        commentText.trim();

      if (!content) {
        return;
      }

      try {
        setCreatingComment(true);

        const response =
          await apiRequest<CreateCommentResponse>(
            `/bloomboard/${selectedPost._id}/comments`,
            {
              method: "POST",
              authenticated: true,
              body: JSON.stringify({
                content,
              }),
            }
          );

        const createdComment =
          response?.data
            ?.comment;

        if (createdComment) {
          setComments(
            (current) => [
              ...current,
              createdComment,
            ]
          );

          const currentCount =
            selectedPost.commentCount ??
            comments.length;

          updatePostEverywhere(
            selectedPost._id,
            {
              commentCount:
                currentCount + 1,
            }
          );
        } else {
          await loadComments(
            selectedPost._id
          );

          updatePostEverywhere(
            selectedPost._id,
            {
              commentCount:
                (selectedPost.commentCount ??
                  comments.length) +
                1,
            }
          );
        }

        setCommentText("");
      } catch (error) {
        Alert.alert(
          "Unable to comment",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      } finally {
        setCreatingComment(false);
      }
    };

  const confirmDeleteComment = (
    comment: BloomComment
  ) => {
    Alert.alert(
      "Delete comment?",
      "Your comment will be removed from this post.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style:
            "destructive",
          onPress: () =>
            handleDeleteComment(
              comment
            ),
        },
      ]
    );
  };

  const handleDeleteComment =
    async (
      comment: BloomComment
    ) => {
      if (!selectedPost) {
        return;
      }

      try {
        setDeletingCommentId(
          comment._id
        );

        await apiRequest<DeleteCommentResponse>(
          `/bloomboard/comments/${comment._id}`,
          {
            method: "DELETE",
            authenticated: true,
          }
        );

        setComments(
          (current) =>
            current.filter(
              (item) =>
                item._id !==
                comment._id
            )
        );

        const currentCount =
          selectedPost.commentCount ??
          comments.length;

        updatePostEverywhere(
          selectedPost._id,
          {
            commentCount:
              Math.max(
                0,
                currentCount - 1
              ),
          }
        );
      } catch (error) {
        Alert.alert(
          "Unable to delete comment",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      } finally {
        setDeletingCommentId(
          null
        );
      }
    };

  /* =======================================================
   * REQUEST ACTIONS
   * ===================================================== */

  const updateRequest =
    async (
      request:
        CustomBouquetRequest,
      action:
        | "accept"
        | "decline"
        | "cancel"
    ) => {
      let endpoint = "";

      if (
        action === "accept"
      ) {
        endpoint =
          `/bloomboard/custom-bouquet-requests/${request._id}/quote/accept`;
      } else if (
        action === "decline"
      ) {
        endpoint =
          `/bloomboard/custom-bouquet-requests/${request._id}/quote/decline`;
      } else {
        endpoint =
          `/bloomboard/custom-bouquet-requests/${request._id}/cancel`;
      }

      try {
        setRequestActionId(
          request._id
        );

        const requestBody =
          action === "accept" ||
          action === "decline"
            ? JSON.stringify({
                customerDecisionMessage:
                  "",
              })
            : undefined;

        const response =
          await apiRequest<CustomRequestMutationResponse>(
            endpoint,
            {
              method: "PATCH",
              authenticated: true,
              body: requestBody,
            }
          );

        const updated =
          response?.data
            ?.request;

        if (updated) {
          setRequests(
            (current) =>
              current.map(
                (item) =>
                  item._id ===
                  updated._id
                    ? updated
                    : item
              )
          );
        } else {
          await loadRequests();
        }

        if (
          action === "accept"
        ) {
          Alert.alert(
            "Quote accepted",
            "You accepted the florist's quotation."
          );
        } else if (
          action === "decline"
        ) {
          Alert.alert(
            "Quote declined",
            "You declined the florist's quotation."
          );
        } else {
          Alert.alert(
            "Request cancelled",
            "Your bouquet request has been cancelled."
          );
        }
      } catch (error) {
        Alert.alert(
          "Unable to update request",
          getErrorMessage(
            error,
            "Please try again."
          )
        );
      } finally {
        setRequestActionId(
          null
        );
      }
    };

  const confirmRequestAction = (
    request:
      CustomBouquetRequest,
    action:
      | "accept"
      | "decline"
      | "cancel"
  ) => {
    const isAccept =
      action === "accept";

    const isDecline =
      action === "decline";

    const title =
      isAccept
        ? "Accept quotation?"
        : isDecline
          ? "Decline quotation?"
          : "Cancel request?";

    const message =
      isAccept
        ? `Accept the florist's ${
            formatCurrency(
              request.quotedPrice
            ) ?? ""
          } quotation?`
        : isDecline
          ? "Are you sure you want to decline this quotation?"
          : "Are you sure you want to cancel this bouquet request?";

    Alert.alert(
      title,
      message,
      [
        {
          text: "Back",
          style: "cancel",
        },
        {
          text:
            isAccept
              ? "Accept"
              : isDecline
                ? "Decline"
                : "Cancel Request",
          style:
            isAccept
              ? "default"
              : "destructive",
          onPress: () =>
            updateRequest(
              request,
              action
            ),
        },
      ]
    );
  };

  /*
   * Custom bouquet request creation
   * will be connected after the
   * florist-selection workflow.
   */
 const openPhotoUploadInfo = () => {
  router.push(
    "/(customer)/customer-custom-request" as never
  );
};

const navigateToAI = () => {
  router.push(
    "/(customer)/customer-ai" as never
  );
};

const openRequestAiConversation = (
  request: CustomBouquetRequest
) => {
  const conversation =
    request.aiConversation;

  const conversationId =
    typeof conversation === "string"
      ? conversation
      : conversation?._id;

  if (!conversationId) {
    Alert.alert(
      "AI conversation unavailable",
      "This bouquet request does not have a linked AI conversation."
    );

    return;
  }

  router.push({
    pathname:
      "/(customer)/customer-ai",
    params: {
      aiConversationId:
        conversationId,
    },
  } as never);
};

  /* =======================================================
   * FEED COLUMNS
   * ===================================================== */

  const feedColumns =
    useMemo(() => {
      const left: BloomPost[] =
        [];

      const right: BloomPost[] =
        [];

      feedPosts.forEach(
        (post, index) => {
          if (
            index % 2 === 0
          ) {
            left.push(post);
          } else {
            right.push(post);
          }
        }
      );

      return {
        left,
        right,
      };
    }, [feedPosts]);

  /* =======================================================
   * AVATARS
   * ===================================================== */

  const renderPostAvatar = (
    post: BloomPost,
    size = 36
  ) => {
    const avatar =
      getImageUrl(
        post.florist
          ?.shopLogo ??
          post.author
            ?.profileImage
      );

    if (avatar) {
      return (
        <Image
          source={{
            uri: avatar,
          }}
          style={[
            styles.avatarImage,
            {
              width: size,
              height: size,
              borderRadius:
                size / 2,
            },
          ]}
        />
      );
    }

    return (
      <View
        style={[
          styles.avatarFallback,
          {
            width: size,
            height: size,
            borderRadius:
              size / 2,
          },
        ]}
      >
        <Ionicons
          name={
            post.authorRole ===
            "seller"
              ? "storefront-outline"
              : "person-outline"
          }
          size={size * 0.48}
          color={COLORS.primary}
        />
      </View>
    );
  };

  const renderCommentAvatar = (
    comment: BloomComment
  ) => {
    const image =
      getImageUrl(
        comment.author
          ?.profileImage
      );

    if (image) {
      return (
        <Image
          source={{
            uri: image,
          }}
          style={
            styles.commentAvatar
          }
        />
      );
    }

    return (
      <View
        style={
          styles.commentAvatarFallback
        }
      >
        <Ionicons
          name="person-outline"
          size={18}
          color={COLORS.primary}
        />
      </View>
    );
  };

  /* =======================================================
   * FEED POST
   * ===================================================== */

  const renderFeedPost = (
    post: BloomPost,
    index: number
  ) => {
    const image =
      getImageUrl(
        post.images?.[0]
      );

    const liked =
      isLiked(post);

    const saved =
      isSaved(post);

    const likeCount =
      getLikeCount(post);

    const imageCount =
      post.images?.length ?? 0;

    const imageHeight =
      index % 3 === 0
        ? 245
        : index % 3 === 1
          ? 205
          : 275;

    return (
      <View
        key={post._id}
        style={
          styles.feedCard
        }
      >
        {image ? (
          <View>
            <Image
              source={{
                uri: image,
              }}
              resizeMode="cover"
              style={[
                styles.feedImage,
                {
                  height:
                    imageHeight,
                },
              ]}
            />

            {imageCount > 1 && (
              <View
                style={
                  styles.feedImageCount
                }
              >
                <Ionicons
                  name="images-outline"
                  size={13}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.feedImageCountText
                  }
                >
                  {imageCount}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View
            style={
              styles.feedNoImage
            }
          >
            <Ionicons
              name="flower-outline"
              size={38}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.feedNoImageText
              }
            >
              Floral Moment
            </Text>
          </View>
        )}

        <View
          style={
            styles.feedCardBody
          }
        >
          <View
            style={
              styles.compactAuthorRow
            }
          >
            {renderPostAvatar(
              post,
              30
            )}

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                numberOfLines={1}
                style={
                  styles.compactAuthorName
                }
              >
                {getAuthorName(
                  post
                )}
              </Text>

              <Text
                style={
                  styles.compactRole
                }
              >
                {getPostRoleLabel(
                  post
                )}
              </Text>
            </View>
          </View>

          {!!post.caption && (
            <Text
              style={
                styles.feedCaption
              }
              numberOfLines={4}
            >
              {post.caption}
            </Text>
          )}

          <View
            style={
              styles.feedActions
            }
          >
            <Pressable
              onPress={() =>
                handleLike(post)
              }
              style={
                styles.feedAction
              }
            >
              <Ionicons
                name={
                  liked
                    ? "heart"
                    : "heart-outline"
                }
                size={18}
                color={
                  liked
                    ? COLORS.primary
                    : COLORS.textMuted
                }
              />

              <Text
                style={[
                  styles.feedActionText,
                  liked && {
                    color:
                      COLORS.primary,
                  },
                ]}
              >
                {likeCount}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                openComments(post)
              }
              style={
                styles.feedAction
              }
            >
              <Ionicons
                name="chatbubble-outline"
                size={17}
                color={
                  COLORS.textMuted
                }
              />

              <Text
                style={
                  styles.feedActionText
                }
              >
                {post.commentCount ??
                  0}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                handleSave(post)
              }
              style={[
                styles.feedAction,
                {
                  marginLeft:
                    "auto",
                },
              ]}
            >
              <Ionicons
                name={
                  saved
                    ? "bookmark"
                    : "bookmark-outline"
                }
                size={18}
                color={
                  saved
                    ? COLORS.primary
                    : COLORS.textMuted
                }
              />
            </Pressable>
          </View>

          {!!post.createdAt && (
            <Text
              style={
                styles.feedDate
              }
            >
              {formatRelativeDate(
                post.createdAt
              )}
            </Text>
          )}
        </View>
      </View>
    );
  };

  /* =======================================================
   * MY POST
   * ===================================================== */

  const renderMyPost = (
    post: BloomPost
  ) => {
    const image =
      getImageUrl(
        post.images?.[0]
      );

    const imageCount =
      post.images?.length ?? 0;

    const liked =
      isLiked(post);

    const likeCount =
      getLikeCount(post);

    return (
      <View
        key={post._id}
        style={
          styles.myPostCard
        }
      >
        <View
          style={
            styles.myPostHeader
          }
        >
          <View
            style={
              styles.myPostAuthor
            }
          >
            {renderPostAvatar(
              post,
              40
            )}

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.myPostAuthorName
                }
              >
                {getAuthorName(
                  post
                )}
              </Text>

              <Text
                style={
                  styles.myPostDate
                }
              >
                {formatRelativeDate(
                  post.createdAt
                )}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() =>
              confirmDeletePost(
                post
              )
            }
            disabled={
              deletingPostId ===
              post._id
            }
            hitSlop={8}
            style={
              styles.deleteButton
            }
          >
            {deletingPostId ===
            post._id ? (
              <ActivityIndicator
                size="small"
                color={
                  COLORS.danger
                }
              />
            ) : (
              <Ionicons
                name="trash-outline"
                size={20}
                color={
                  COLORS.danger
                }
              />
            )}
          </Pressable>
        </View>

        {!!post.caption && (
          <Text
            style={
              styles.myPostCaption
            }
          >
            {post.caption}
          </Text>
        )}

        {image && (
          <View>
            <Image
              source={{
                uri: image,
              }}
              style={
                styles.myPostImage
              }
              resizeMode="cover"
            />

            {imageCount > 1 && (
              <View
                style={
                  styles.imageCountBadge
                }
              >
                <Ionicons
                  name="images-outline"
                  size={14}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.imageCountText
                  }
                >
                  {imageCount}
                </Text>
              </View>
            )}
          </View>
        )}

        <View
          style={
            styles.myPostStats
          }
        >
          <Pressable
            onPress={() =>
              handleLike(post)
            }
            style={
              styles.statItem
            }
          >
            <Ionicons
              name={
                liked
                  ? "heart"
                  : "heart-outline"
              }
              size={19}
              color={
                liked
                  ? COLORS.primary
                  : COLORS.textMuted
              }
            />

            <Text
              style={[
                styles.statText,
                liked && {
                  color:
                    COLORS.primary,
                },
              ]}
            >
              {likeCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              openComments(post)
            }
            style={
              styles.statItem
            }
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={
                COLORS.textMuted
              }
            />

            <Text
              style={
                styles.statText
              }
            >
              {post.commentCount ??
                0}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  /* =======================================================
   * REQUEST CARD
   * ===================================================== */

  const renderRequest = (
  request: CustomBouquetRequest
) => {
  const image =
    getImageUrl(
      request.inspirationImage
    );

  const status =
    statusDetails(
      request.status
    );

  const isWorking =
    requestActionId ===
    request._id;

  const canCancel =
    request.status === "open" ||
    request.status === "pending" ||
    request.status === "accepted";

  const hasQuote =
    request.status === "quoted" &&
    request.quotedPrice !==
      null &&
    request.quotedPrice !==
      undefined;

  const budget =
    formatCurrency(
      request.budget
    );

  const quote =
    formatCurrency(
      request.quotedPrice
    );

  const floristName =
    request.florist
      ?.shopName ||
    (
      request.status === "open"
        ? "Waiting for florist proposals"
        : "FLOGRAM Florist"
    );

  const title =
    request.occasion ||
    request.theme ||
    "Custom Bouquet";

  const conversation =
    request.aiConversation;

  const conversationId =
    typeof conversation === "string"
      ? conversation
      : conversation?._id;

  const conversationTitle =
    typeof conversation === "object" &&
    conversation
      ? conversation.title
      : null;

  const canOpenAi =
    Boolean(conversationId);

  return (
    <View
      key={request._id}
      style={
        styles.requestCard
      }
    >
      {/* ===============================
          REQUEST HEADER
      =============================== */}

      <Pressable
        disabled={!canOpenAi}
        onPress={() =>
          openRequestAiConversation(
            request
          )
        }
        style={({ pressed }) => [
          styles.requestTop,
          pressed &&
            canOpenAi && {
              opacity: 0.72,
            },
        ]}
      >
        {image ? (
          <Image
            source={{
              uri: image,
            }}
            style={
              styles.requestImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.requestImagePlaceholder
            }
          >
            <Ionicons
              name="flower-outline"
              size={28}
              color={
                COLORS.primary
              }
            />
          </View>
        )}

        <View
          style={
            styles.requestMain
          }
        >
          <View
            style={
              styles.requestTitleRow
            }
          >
            <Text
              style={
                styles.requestTitle
              }
              numberOfLines={1}
            >
              {title}
            </Text>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    status.background,
                },
              ]}
            >
              <Ionicons
                name={
                  status.icon
                }
                size={13}
                color={
                  status.color
                }
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      status.color,
                  },
                ]}
              >
                {status.label}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.floristLine
            }
          >
            <Ionicons
              name="storefront-outline"
              size={15}
              color={
                COLORS.textMuted
              }
            />

            <Text
              style={
                styles.floristName
              }
              numberOfLines={1}
            >
              {floristName}
            </Text>
          </View>

          <Text
            style={
              styles.requestDate
            }
          >
            Created{" "}
            {formatRelativeDate(
              request.createdAt
            )}
          </Text>
        </View>

        {canOpenAi && (
          <Ionicons
            name="chevron-forward"
            size={21}
            color={
              COLORS.primary
            }
          />
        )}
      </Pressable>

      {/* ===============================
          OPEN AI CONVERSATION
      =============================== */}

      {canOpenAi && (
        <Pressable
          onPress={() =>
            openRequestAiConversation(
              request
            )
          }
          style={({ pressed }) => [
            {
              marginTop: 13,
              minHeight: 46,
              paddingHorizontal: 13,
              borderRadius: 13,

              flexDirection: "row",
              alignItems: "center",

              borderWidth: 1,
              borderColor:
                "#E8CFD9",

              backgroundColor:
                COLORS.primarySoft,

              opacity:
                pressed
                  ? 0.72
                  : 1,
            },
          ]}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,

              alignItems:
                "center",
              justifyContent:
                "center",

              backgroundColor:
                COLORS.card,
            }}
          >
            <Ionicons
              name="sparkles"
              size={17}
              color={
                COLORS.primary
              }
            />
          </View>

          <View
            style={{
              flex: 1,
              marginLeft: 10,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color:
                  COLORS.primary,
              }}
            >
              Open AI Conversation
            </Text>

            <Text
              numberOfLines={1}
              style={{
                marginTop: 2,
                fontSize: 10,
                color:
                  COLORS.textMuted,
              }}
            >
              {conversationTitle ||
                `Custom ${title} Bouquet`}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={
              COLORS.primary
            }
          />
        </Pressable>
      )}

      <View
        style={
          styles.requestDivider
        }
      />

      {/* ===============================
          REQUEST INFORMATION
      =============================== */}

      <View
        style={
          styles.requestInfoGrid
        }
      >
        <View
          style={
            styles.requestInfoItem
          }
        >
          <Text
            style={
              styles.requestInfoLabel
            }
          >
            Budget
          </Text>

          <Text
            style={
              styles.requestInfoValue
            }
          >
            {budget ??
              "Not specified"}
          </Text>
        </View>

        <View
          style={
            styles.requestInfoItem
          }
        >
          <Text
            style={
              styles.requestInfoLabel
            }
          >
            Quantity
          </Text>

          <Text
            style={
              styles.requestInfoValue
            }
          >
            {request.quantity ??
              1}
          </Text>
        </View>

        <View
          style={
            styles.requestInfoItem
          }
        >
          <Text
            style={
              styles.requestInfoLabel
            }
          >
            Needed by
          </Text>

          <Text
            style={
              styles.requestInfoValue
            }
            numberOfLines={1}
          >
            {formatDate(
              request.requestedDate
            )}
          </Text>
        </View>
      </View>

      {/* ===============================
          CUSTOMER MESSAGE
      =============================== */}

      {!!request.customerMessage && (
        <View
          style={
            styles.messageBox
          }
        >
          <Text
            style={
              styles.messageLabel
            }
          >
            Your message
          </Text>

          <Text
            style={
              styles.messageText
            }
          >
            {
              request.customerMessage
            }
          </Text>
        </View>
      )}

      {/* ===============================
          SELLER RESPONSE
      =============================== */}

      {!!request.sellerResponse && (
        <View
          style={
            styles.sellerResponseBox
          }
        >
          <View
            style={
              styles.sellerResponseHeader
            }
          >
            <Ionicons
              name="storefront-outline"
              size={17}
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.sellerResponseTitle
              }
            >
              Florist Response
            </Text>
          </View>

          <Text
            style={
              styles.sellerResponseText
            }
          >
            {
              request.sellerResponse
            }
          </Text>
        </View>
      )}

      {/* ===============================
          LEGACY QUOTE DISPLAY
      =============================== */}

      {hasQuote && (
        <View
          style={
            styles.quoteBox
          }
        >
          <View>
            <Text
              style={
                styles.quoteLabel
              }
            >
              Florist quotation
            </Text>

            <Text
              style={
                styles.quotePrice
              }
            >
              {quote}
            </Text>
          </View>

          <Ionicons
            name="pricetag"
            size={28}
            color={
              COLORS.primary
            }
          />
        </View>
      )}

      {/* ===============================
          ACCEPTED PROPOSAL
      =============================== */}

      {request.status ===
        "customer_accepted" &&
        request.quotedPrice !==
          null &&
        request.quotedPrice !==
          undefined && (
          <View
            style={{
              marginTop: 12,
              padding: 13,

              flexDirection:
                "row",
              alignItems:
                "center",

              borderRadius: 13,

              backgroundColor:
                COLORS.successSoft,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={
                COLORS.success
              }
            />

            <View
              style={{
                flex: 1,
                marginLeft: 9,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight:
                    "800",
                  color:
                    COLORS.success,
                }}
              >
                SELECTED PROPOSAL
              </Text>

              <Text
                style={{
                  marginTop: 2,
                  fontSize: 15,
                  fontWeight:
                    "900",
                  color:
                    COLORS.text,
                }}
              >
                {formatCurrency(
                  request.quotedPrice
                )}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color:
                  COLORS.success,
              }}
            >
              Accepted
            </Text>
          </View>
        )}

      {/* ===============================
          LEGACY REQUEST ACTIONS
      =============================== */}

      {(hasQuote ||
        canCancel) && (
        <View
          style={
            styles.requestActions
          }
        >
          {hasQuote && (
            <>
              <Pressable
                disabled={
                  isWorking
                }
                onPress={() =>
                  confirmRequestAction(
                    request,
                    "decline"
                  )
                }
                style={
                  styles.requestSecondaryButton
                }
              >
                <Text
                  style={
                    styles.requestSecondaryButtonText
                  }
                >
                  Decline
                </Text>
              </Pressable>

              <Pressable
                disabled={
                  isWorking
                }
                onPress={() =>
                  confirmRequestAction(
                    request,
                    "accept"
                  )
                }
                style={
                  styles.requestPrimaryButton
                }
              >
                {isWorking ? (
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
                      style={
                        styles.requestPrimaryButtonText
                      }
                    >
                      Accept Quote
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}

          {canCancel && (
            <Pressable
              disabled={
                isWorking
              }
              onPress={() =>
                confirmRequestAction(
                  request,
                  "cancel"
                )
              }
              style={
                styles.cancelRequestButton
              }
            >
              {isWorking ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.danger
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={
                      COLORS.danger
                    }
                  />

                  <Text
                    style={
                      styles.cancelRequestText
                    }
                  >
                    Cancel Request
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};
  /* =======================================================
   * STATES
   * ===================================================== */

  const renderLoading = (
    text: string
  ) => (
    <View
      style={
        styles.stateContainer
      }
    >
      <ActivityIndicator
        size="large"
        color={COLORS.primary}
      />

      <Text
        style={
          styles.stateText
        }
      >
        {text}
      </Text>
    </View>
  );

  const renderError = (
    message: string,
    retry: () => void
  ) => (
    <View
      style={
        styles.stateContainer
      }
    >
      <View
        style={
          styles.stateIconCircle
        }
      >
        <Ionicons
          name="cloud-offline-outline"
          size={32}
          color={COLORS.primary}
        />
      </View>

      <Text
        style={
          styles.stateTitle
        }
      >
        Something went wrong
      </Text>

      <Text
        style={
          styles.stateText
        }
      >
        {message}
      </Text>

      <Pressable
        onPress={retry}
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
    </View>
  );

  /* =======================================================
   * FEED TAB
   * ===================================================== */

  const renderFeedTab = () => {
    if (
      loadingFeed &&
      feedPosts.length === 0
    ) {
      return renderLoading(
        "Growing your BloomBoard..."
      );
    }

    if (
      feedError &&
      feedPosts.length === 0
    ) {
      return renderError(
        feedError,
        () => {
          setLoadingFeed(true);
          loadFeed();
        }
      );
    }

    if (
      feedPosts.length === 0
    ) {
      return (
        <View
          style={
            styles.stateContainer
          }
        >
          <View
            style={
              styles.stateIconCircle
            }
          >
            <Ionicons
              name="flower-outline"
              size={34}
              color={
                COLORS.primary
              }
            />
          </View>

          <Text
            style={
              styles.stateTitle
            }
          >
            BloomBoard is quiet
          </Text>

          <Text
            style={
              styles.stateText
            }
          >
            Community floral moments
            will appear here.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={
          styles.masonryContainer
        }
      >
        <View
          style={
            styles.masonryColumn
          }
        >
          {feedColumns.left.map(
            (post, index) =>
              renderFeedPost(
                post,
                index * 2
              )
          )}
        </View>

        <View
          style={
            styles.masonryColumn
          }
        >
          {feedColumns.right.map(
            (post, index) =>
              renderFeedPost(
                post,
                index * 2 + 1
              )
          )}
        </View>
      </View>
    );
  };

  /* =======================================================
   * MY POSTS TAB
   * ===================================================== */

  const renderMyPostsTab =
    () => {
      const canShare =
        !!caption.trim() ||
        selectedImages.length > 0;

      return (
        <View>
          <View
            style={
              styles.createPostCard
            }
          >
            <View
              style={
                styles.createPostTitleRow
              }
            >
              <View
                style={
                  styles.createIcon
                }
              >
                <Ionicons
                  name="camera-outline"
                  size={22}
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
                    styles.createPostTitle
                  }
                >
                  Share a Floral Moment
                </Text>

                <Text
                  style={
                    styles.createPostSubtitle
                  }
                >
                  Inspire the FLOGRAM
                  community
                </Text>
              </View>
            </View>

            <TextInput
              value={caption}
              onChangeText={
                setCaption
              }
              placeholder="What's blooming today?"
              placeholderTextColor="#A59CA1"
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={
                styles.captionInput
              }
            />

            {selectedImages.length >
              0 && (
              <View>
                <View
                  style={
                    styles.selectedPhotosHeader
                  }
                >
                  <Text
                    style={
                      styles.selectedPhotosTitle
                    }
                  >
                    Selected Photos
                  </Text>

                  <Text
                    style={
                      styles.selectedPhotosCount
                    }
                  >
                    {
                      selectedImages.length
                    }
                    /5
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.photoPreviewRow
                  }
                >
                  {selectedImages.map(
                    (
                      image,
                      index
                    ) => (
                      <View
                        key={
                          image.uri
                        }
                        style={
                          styles.photoPreviewContainer
                        }
                      >
                        <Image
                          source={{
                            uri:
                              image.uri,
                          }}
                          style={
                            styles.photoPreview
                          }
                        />

                        <View
                          style={
                            styles.photoNumber
                          }
                        >
                          <Text
                            style={
                              styles.photoNumberText
                            }
                          >
                            {index +
                              1}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() =>
                            removeSelectedImage(
                              image.uri
                            )
                          }
                          style={
                            styles.removePhotoButton
                          }
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      </View>
                    )
                  )}
                </ScrollView>
              </View>
            )}

            <View
              style={
                styles.createPostFooter
              }
            >
              <Pressable
                disabled={
                  creatingPost ||
                  selectedImages.length >=
                    5
                }
                onPress={
                  pickPostImages
                }
                style={[
                  styles.addPhotoButton,
                  selectedImages.length >=
                    5 && {
                    opacity: 0.5,
                  },
                ]}
              >
                <Ionicons
                  name="images-outline"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.addPhotoText
                  }
                >
                  Add Photos
                </Text>
              </Pressable>

              <Text
                style={
                  styles.captionCounter
                }
              >
                {caption.length}/2000
              </Text>

              <Pressable
                disabled={
                  creatingPost ||
                  !canShare
                }
                onPress={
                  handleCreatePost
                }
                style={[
                  styles.shareButton,
                  (!canShare ||
                    creatingPost) &&
                    styles.shareButtonDisabled,
                ]}
              >
                {creatingPost ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane-outline"
                      size={17}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.shareButtonText
                      }
                    >
                      Share
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Your Posts
            </Text>

            <View
              style={
                styles.countBubble
              }
            >
              <Text
                style={
                  styles.countBubbleText
                }
              >
                {myPosts.length}
              </Text>
            </View>
          </View>

          {loadingMyPosts &&
          myPosts.length ===
            0 ? (
            renderLoading(
              "Loading your posts..."
            )
          ) : myPostsError &&
            myPosts.length ===
              0 ? (
            renderError(
              myPostsError,
              () => {
                setLoadingMyPosts(
                  true
                );

                loadMyPosts();
              }
            )
          ) : myPosts.length ===
            0 ? (
            <View
              style={
                styles.emptyInlineCard
              }
            >
              <Ionicons
                name="images-outline"
                size={34}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.emptyInlineTitle
                }
              >
                No posts yet
              </Text>

              <Text
                style={
                  styles.emptyInlineText
                }
              >
                Share your first floral
                moment with the
                community.
              </Text>
            </View>
          ) : (
            myPosts.map(
              renderMyPost
            )
          )}
        </View>
      );
    };

  /* =======================================================
   * REQUESTS TAB
   * ===================================================== */

  const renderRequestsTab =
    () => {
      return (
        <View>
          <View
            style={
              styles.newRequestCard
            }
          >
            <View
              style={
                styles.requestHeroIcon
              }
            >
              <Ionicons
                name="flower-outline"
                size={28}
                color={
                  COLORS.primary
                }
              />
            </View>

            <Text
              style={
                styles.newRequestTitle
              }
            >
              New Bouquet Request
            </Text>

            <Text
              style={
                styles.newRequestSubtitle
              }
            >
              Build your bouquet idea,
              then send the request to a
              specific FLOGRAM florist.
            </Text>

            <View
              style={
                styles.requestStartOptions
              }
            >
              <Pressable
                onPress={
                  openPhotoUploadInfo
                }
                style={
                  styles.requestStartOption
                }
              >
                <View
                  style={
                    styles.requestStartIcon
                  }
                >
                  <Ionicons
                    name="image-outline"
                    size={25}
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
                      styles.requestStartTitle
                    }
                  >
                    Upload Reference Photo
                  </Text>

                  <Text
                    style={
                      styles.requestStartText
                    }
                  >
                    Show your florist what
                    you have in mind
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#A69DA2"
                />
              </Pressable>

              <Pressable
                onPress={
                  navigateToAI
                }
                style={
                  styles.requestStartOption
                }
              >
                <View
                  style={[
                    styles.requestStartIcon,
                    styles.aiStartIcon,
                  ]}
                >
                  <Ionicons
                    name="sparkles"
                    size={24}
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
                      styles.requestStartTitle
                    }
                  >
                    Chat with AI First
                  </Text>

                  <Text
                    style={
                      styles.requestStartText
                    }
                  >
                    Turn your ideas into a
                    bouquet inspiration
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#A69DA2"
                />
              </Pressable>
            </View>
          </View>

          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Your Requests
            </Text>

            <View
              style={
                styles.countBubble
              }
            >
              <Text
                style={
                  styles.countBubbleText
                }
              >
                {requests.length}
              </Text>
            </View>
          </View>

          {loadingRequests &&
          requests.length ===
            0 ? (
            renderLoading(
              "Loading your requests..."
            )
          ) : requestsError &&
            requests.length ===
              0 ? (
            renderError(
              requestsError,
              () => {
                setLoadingRequests(
                  true
                );

                loadRequests();
              }
            )
          ) : requests.length ===
            0 ? (
            <View
              style={
                styles.emptyInlineCard
              }
            >
              <Ionicons
                name="document-text-outline"
                size={34}
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.emptyInlineTitle
                }
              >
                No bouquet requests yet
              </Text>

              <Text
                style={
                  styles.emptyInlineText
                }
              >
                Start with FLOGRAM AI to
                create an inspiration,
                then send it to a
                florist.
              </Text>

              <Pressable
                onPress={
                  navigateToAI
                }
                style={
                  styles.emptyActionButton
                }
              >
                <Ionicons
                  name="sparkles"
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.emptyActionText
                  }
                >
                  Open AI Assistant
                </Text>
              </Pressable>
            </View>
          ) : (
            requests.map(
              renderRequest
            )
          )}
        </View>
      );
    };

  /* =======================================================
   * COMMENTS MODAL
   * ===================================================== */

  const renderCommentsModal =
    () => {
      const post =
        selectedPost;

      return (
        <Modal
          visible={
            commentsVisible
          }
          animationType="slide"
          transparent
          onRequestClose={
            closeComments
          }
        >
          <View
            style={
              styles.modalBackdrop
            }
          >
            <KeyboardAvoidingView
              behavior={
                Platform.OS ===
                "ios"
                  ? "padding"
                  : undefined
              }
              style={
                styles.commentSheet
              }
            >
              <View
                style={
                  styles.commentSheetHandle
                }
              />

              <View
                style={
                  styles.commentHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.commentHeaderTitle
                    }
                  >
                    Comments
                  </Text>

                  <Text
                    style={
                      styles.commentHeaderSubtitle
                    }
                  >
                    {comments.length}{" "}
                    {comments.length ===
                    1
                      ? "comment"
                      : "comments"}
                  </Text>
                </View>

                <Pressable
                  onPress={
                    closeComments
                  }
                  style={
                    styles.commentCloseButton
                  }
                >
                  <Ionicons
                    name="close"
                    size={23}
                    color={
                      COLORS.text
                    }
                  />
                </Pressable>
              </View>

              {post && (
                <View
                  style={
                    styles.commentPostSummary
                  }
                >
                  {renderPostAvatar(
                    post,
                    36
                  )}

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.commentPostAuthor
                      }
                    >
                      {getAuthorName(
                        post
                      )}
                    </Text>

                    {!!post.caption && (
                      <Text
                        numberOfLines={
                          2
                        }
                        style={
                          styles.commentPostCaption
                        }
                      >
                        {
                          post.caption
                        }
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View
                style={
                  styles.commentDivider
                }
              />

              <ScrollView
                style={
                  styles.commentsList
                }
                contentContainerStyle={
                  styles.commentsContent
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                {loadingComments ? (
                  <View
                    style={
                      styles.commentsLoading
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.primary
                      }
                    />

                    <Text
                      style={
                        styles.commentsLoadingText
                      }
                    >
                      Loading comments...
                    </Text>
                  </View>
                ) : commentsError ? (
                  <View
                    style={
                      styles.commentsEmpty
                    }
                  >
                    <Ionicons
                      name="cloud-offline-outline"
                      size={30}
                      color={
                        COLORS.primary
                      }
                    />

                    <Text
                      style={
                        styles.commentsEmptyTitle
                      }
                    >
                      Unable to load comments
                    </Text>

                    <Text
                      style={
                        styles.commentsEmptyText
                      }
                    >
                      {
                        commentsError
                      }
                    </Text>

                    {post && (
                      <Pressable
                        onPress={() =>
                          loadComments(
                            post._id
                          )
                        }
                        style={
                          styles.commentRetryButton
                        }
                      >
                        <Text
                          style={
                            styles.commentRetryText
                          }
                        >
                          Try Again
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : comments.length ===
                  0 ? (
                  <View
                    style={
                      styles.commentsEmpty
                    }
                  >
                    <View
                      style={
                        styles.commentsEmptyIcon
                      }
                    >
                      <Ionicons
                        name="chatbubbles-outline"
                        size={30}
                        color={
                          COLORS.primary
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.commentsEmptyTitle
                      }
                    >
                      No comments yet
                    </Text>

                    <Text
                      style={
                        styles.commentsEmptyText
                      }
                    >
                      Be the first to
                      comment on this
                      floral moment.
                    </Text>
                  </View>
                ) : (
                  comments.map(
                    (comment) => {
                      const ownComment =
                        !!currentUserId &&
                        comment.author
                          ?._id ===
                          currentUserId;

                      const deleting =
                        deletingCommentId ===
                        comment._id;

                      return (
                        <View
                          key={
                            comment._id
                          }
                          style={
                            styles.commentItem
                          }
                        >
                          {renderCommentAvatar(
                            comment
                          )}

                          <View
                            style={
                              styles.commentBubbleContainer
                            }
                          >
                            <View
                              style={
                                styles.commentBubble
                              }
                            >
                              <View
                                style={
                                  styles.commentNameRow
                                }
                              >
                                <Text
                                  style={
                                    styles.commentAuthor
                                  }
                                >
                                  {getAuthorFullName(
                                    comment.author
                                  )}
                                </Text>

                                {!!comment
                                  .author
                                  ?.role && (
                                  <Text
                                    style={
                                      styles.commentRole
                                    }
                                  >
                                    {
                                      comment
                                        .author
                                        .role
                                    }
                                  </Text>
                                )}
                              </View>

                              <Text
                                style={
                                  styles.commentContent
                                }
                              >
                                {
                                  comment.content
                                }
                              </Text>
                            </View>

                            <View
                              style={
                                styles.commentMetaRow
                              }
                            >
                              <Text
                                style={
                                  styles.commentDate
                                }
                              >
                                {formatRelativeDate(
                                  comment.createdAt
                                )}
                              </Text>

                              {ownComment && (
                                <Pressable
                                  disabled={
                                    deleting
                                  }
                                  onPress={() =>
                                    confirmDeleteComment(
                                      comment
                                    )
                                  }
                                >
                                  {deleting ? (
                                    <ActivityIndicator
                                      size="small"
                                      color={
                                        COLORS.danger
                                      }
                                    />
                                  ) : (
                                    <Text
                                      style={
                                        styles.deleteCommentText
                                      }
                                    >
                                      Delete
                                    </Text>
                                  )}
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    }
                  )
                )}
              </ScrollView>

              <View
                style={
                  styles.commentComposer
                }
              >
                <TextInput
                  value={
                    commentText
                  }
                  onChangeText={
                    setCommentText
                  }
                  placeholder="Write a comment..."
                  placeholderTextColor="#9E949A"
                  maxLength={1000}
                  multiline
                  style={
                    styles.commentInput
                  }
                />

                <Pressable
                  disabled={
                    creatingComment ||
                    !commentText.trim()
                  }
                  onPress={
                    handleCreateComment
                  }
                  style={[
                    styles.sendCommentButton,
                    (!commentText.trim() ||
                      creatingComment) &&
                      styles.sendCommentDisabled,
                  ]}
                >
                  {creatingComment ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Ionicons
                      name="send"
                      size={18}
                      color="#FFFFFF"
                    />
                  )}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      );
    };

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
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View
          style={styles.header}
        >
          <View>
            <Text
              style={
                styles.headerEyebrow
              }
            >
              FLOGRAM COMMUNITY
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              BloomBoard
            </Text>
          </View>

          <View
            style={
              styles.headerFlower
            }
          >
            <Ionicons
              name="flower"
              size={25}
              color={
                COLORS.primary
              }
            />
          </View>
        </View>

        <View
          style={
            styles.tabWrapper
          }
        >
          <Pressable
            onPress={() =>
              setActiveTab("feed")
            }
            style={[
              styles.tabButton,
              activeTab ===
                "feed" &&
                styles.tabButtonActive,
            ]}
          >
            <Ionicons
              name={
                activeTab ===
                "feed"
                  ? "grid"
                  : "grid-outline"
              }
              size={18}
              color={
                activeTab ===
                "feed"
                  ? COLORS.primary
                  : COLORS.textMuted
              }
            />

            <Text
              style={[
                styles.tabText,
                activeTab ===
                  "feed" &&
                  styles.tabTextActive,
              ]}
            >
              Feed
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setActiveTab(
                "my-posts"
              )
            }
            style={[
              styles.tabButton,
              activeTab ===
                "my-posts" &&
                styles.tabButtonActive,
            ]}
          >
            <Ionicons
              name={
                activeTab ===
                "my-posts"
                  ? "images"
                  : "images-outline"
              }
              size={18}
              color={
                activeTab ===
                "my-posts"
                  ? COLORS.primary
                  : COLORS.textMuted
              }
            />

            <Text
              style={[
                styles.tabText,
                activeTab ===
                  "my-posts" &&
                  styles.tabTextActive,
              ]}
            >
              My Posts
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setActiveTab(
                "requests"
              )
            }
            style={[
              styles.tabButton,
              activeTab ===
                "requests" &&
                styles.tabButtonActive,
            ]}
          >
            <Ionicons
              name={
                activeTab ===
                "requests"
                  ? "document-text"
                  : "document-text-outline"
              }
              size={18}
              color={
                activeTab ===
                "requests"
                  ? COLORS.primary
                  : COLORS.textMuted
              }
            />

            <Text
              style={[
                styles.tabText,
                activeTab ===
                  "requests" &&
                  styles.tabTextActive,
              ]}
            >
              Requests
            </Text>
          </Pressable>
        </View>

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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                refreshCurrentTab
              }
              tintColor={
                COLORS.primary
              }
              colors={[
                COLORS.primary,
              ]}
            />
          }
        >
          {activeTab ===
            "feed" &&
            renderFeedTab()}

          {activeTab ===
            "my-posts" &&
            renderMyPostsTab()}

          {activeTab ===
            "requests" &&
            renderRequestsTab()}
        </ScrollView>

        <View
          style={
            styles.bottomNav
          }
        >
          {NAV_ITEMS.map(
            (item) => {
              const active =
                item.key ===
                "bloom";

              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    if (active) {
                      return;
                    }

                    router.replace(
                      item.route as never
                    );
                  }}
                  style={({
                    pressed,
                  }) => [
                    styles.navItem,
                    pressed &&
                      styles.navPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.navIconWrapper,
                      active &&
                        styles.navIconWrapperActive,
                    ]}
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
                  </View>

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
      </KeyboardAvoidingView>

      {renderCommentsModal()}
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
      color: COLORS.primary,
      marginBottom: 3,
    },

    headerTitle: {
      fontSize: 30,
      lineHeight: 35,
      fontWeight: "800",
      color: COLORS.text,
      letterSpacing: -0.7,
    },

    headerFlower: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    tabWrapper: {
      marginHorizontal: 20,
      marginBottom: 12,
      padding: 4,
      flexDirection: "row",
      backgroundColor:
        COLORS.graySoft,
      borderRadius: 16,
    },

    tabButton: {
      flex: 1,
      height: 46,
      borderRadius: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },

    tabButtonActive: {
      backgroundColor:
        COLORS.card,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 2,
    },

    tabText: {
      fontSize: 13,
      fontWeight: "600",
      color:
        COLORS.textMuted,
    },

    tabTextActive: {
      color: COLORS.primary,
      fontWeight: "800",
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 35,
    },

    masonryContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },

    masonryColumn: {
      flex: 1,
      gap: 12,
    },

    feedCard: {
      overflow: "hidden",
      borderRadius: 18,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    feedImage: {
      width: "100%",
      backgroundColor:
        COLORS.primarySoft,
    },

    feedImageCount: {
      position: "absolute",
      top: 8,
      right: 8,
      height: 25,
      paddingHorizontal: 8,
      borderRadius: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor:
        "rgba(0,0,0,0.58)",
    },

    feedImageCountText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    feedNoImage: {
      minHeight: 145,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      backgroundColor:
        COLORS.primarySoft,
    },

    feedNoImageText: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "700",
      color:
        COLORS.primary,
    },

    feedCardBody: {
      padding: 11,
    },

    compactAuthorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    avatarImage: {
      backgroundColor:
        COLORS.graySoft,
    },

    avatarFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    compactAuthorName: {
      fontSize: 12,
      fontWeight: "800",
      color: COLORS.text,
    },

    compactRole: {
      marginTop: 1,
      fontSize: 9,
      color:
        COLORS.textMuted,
    },

    feedCaption: {
      marginTop: 10,
      fontSize: 12,
      lineHeight: 17,
      color: COLORS.text,
    },

    feedActions: {
      marginTop: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    feedAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minHeight: 28,
      minWidth: 28,
      justifyContent: "center",
    },

    feedActionText: {
      fontSize: 11,
      fontWeight: "600",
      color:
        COLORS.textMuted,
    },

    feedDate: {
      marginTop: 7,
      fontSize: 9,
      color: "#A39A9F",
    },

    createPostCard: {
      padding: 17,
      borderRadius: 20,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    createPostTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    createIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    createPostTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: COLORS.text,
    },

    createPostSubtitle: {
      marginTop: 2,
      fontSize: 12,
      color:
        COLORS.textMuted,
    },

    captionInput: {
      minHeight: 105,
      maxHeight: 180,
      marginTop: 16,
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 13,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        "#FCFAFB",
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.text,
    },

    selectedPhotosHeader: {
      marginTop: 13,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    selectedPhotosTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: COLORS.text,
    },

    selectedPhotosCount: {
      fontSize: 11,
      fontWeight: "700",
      color:
        COLORS.primary,
    },

    photoPreviewRow: {
      gap: 9,
      paddingRight: 4,
    },

    photoPreviewContainer: {
      width: 92,
      height: 92,
      position: "relative",
    },

    photoPreview: {
      width: 92,
      height: 92,
      borderRadius: 13,
      backgroundColor:
        COLORS.graySoft,
    },

    removePhotoButton: {
      position: "absolute",
      top: -5,
      right: -5,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.danger,
      borderWidth: 2,
      borderColor:
        COLORS.card,
    },

    photoNumber: {
      position: "absolute",
      left: 6,
      bottom: 6,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 5,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "rgba(0,0,0,0.6)",
    },

    photoNumberText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    createPostFooter: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    addPhotoButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      height: 38,
      borderRadius: 11,
      backgroundColor:
        COLORS.primarySoft,
    },

    addPhotoText: {
      fontSize: 12,
      fontWeight: "700",
      color:
        COLORS.primary,
    },

    captionCounter: {
      flex: 1,
      textAlign: "right",
      fontSize: 10,
      color: "#A39A9F",
    },

    shareButton: {
      height: 38,
      minWidth: 90,
      paddingHorizontal: 14,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor:
        COLORS.primary,
    },

    shareButtonDisabled: {
      opacity: 0.45,
    },

    shareButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    sectionHeaderRow: {
      marginTop: 24,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.text,
    },

    countBubble: {
      marginLeft: 8,
      minWidth: 25,
      height: 25,
      paddingHorizontal: 7,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    countBubbleText: {
      fontSize: 11,
      fontWeight: "800",
      color:
        COLORS.primary,
    },

    myPostCard: {
      marginBottom: 14,
      overflow: "hidden",
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    myPostHeader: {
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    myPostAuthor: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    myPostAuthorName: {
      fontSize: 14,
      fontWeight: "800",
      color: COLORS.text,
    },

    myPostDate: {
      marginTop: 2,
      fontSize: 10,
      color:
        COLORS.textMuted,
    },

    deleteButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.dangerSoft,
    },

    myPostCaption: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      fontSize: 14,
      lineHeight: 20,
      color: COLORS.text,
    },

    myPostImage: {
      width: "100%",
      height: 280,
      backgroundColor:
        COLORS.primarySoft,
    },

    imageCountBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      height: 29,
      paddingHorizontal: 9,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor:
        "rgba(0,0,0,0.58)",
    },

    imageCountText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    myPostStats: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
    },

    statItem: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    statText: {
      fontSize: 12,
      fontWeight: "600",
      color:
        COLORS.textMuted,
    },

    newRequestCard: {
      padding: 18,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    requestHeroIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
      marginBottom: 13,
    },

    newRequestTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: COLORS.text,
    },

    newRequestSubtitle: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color:
        COLORS.textMuted,
    },

    requestStartOptions: {
      marginTop: 17,
      gap: 10,
    },

    requestStartOption: {
      minHeight: 76,
      paddingHorizontal: 13,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      backgroundColor:
        "#FFFCFD",
    },

    requestStartIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    aiStartIcon: {
      backgroundColor:
        "#F6EEFF",
    },

    requestStartTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: COLORS.text,
    },

    requestStartText: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color:
        COLORS.textMuted,
    },

    requestCard: {
      marginBottom: 14,
      padding: 15,
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    requestTop: {
      flexDirection: "row",
      gap: 12,
    },

    requestImage: {
      width: 70,
      height: 70,
      borderRadius: 15,
      backgroundColor:
        COLORS.primarySoft,
    },

    requestImagePlaceholder: {
      width: 70,
      height: 70,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    requestMain: {
      flex: 1,
      minWidth: 0,
    },

    requestTitleRow: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 6,
    },

    requestTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "800",
      color: COLORS.text,
    },

    statusBadge: {
      paddingHorizontal: 7,
      minHeight: 23,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },

    statusText: {
      fontSize: 9,
      fontWeight: "800",
    },

    floristLine: {
      marginTop: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    floristName: {
      flex: 1,
      fontSize: 11,
      fontWeight: "600",
      color:
        COLORS.textMuted,
    },

    requestDate: {
      marginTop: 5,
      fontSize: 10,
      color: "#A39A9F",
    },

    requestDivider: {
      height: 1,
      marginVertical: 14,
      backgroundColor:
        COLORS.border,
    },

    requestInfoGrid: {
      flexDirection: "row",
      gap: 8,
    },

    requestInfoItem: {
      flex: 1,
      padding: 10,
      borderRadius: 12,
      backgroundColor:
        COLORS.graySoft,
    },

    requestInfoLabel: {
      fontSize: 9,
      color:
        COLORS.textMuted,
    },

    requestInfoValue: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: "800",
      color: COLORS.text,
    },

    messageBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 13,
      backgroundColor:
        COLORS.graySoft,
    },

    messageLabel: {
      fontSize: 10,
      fontWeight: "800",
      color:
        COLORS.textMuted,
      marginBottom: 4,
    },

    messageText: {
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.text,
    },

    sellerResponseBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 13,
      backgroundColor:
        COLORS.primarySoft,
    },

    sellerResponseHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 5,
    },

    sellerResponseTitle: {
      fontSize: 11,
      fontWeight: "800",
      color:
        COLORS.primary,
    },

    sellerResponseText: {
      fontSize: 12,
      lineHeight: 18,
      color: COLORS.text,
    },

    quoteBox: {
      marginTop: 12,
      padding: 14,
      borderRadius: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      borderWidth: 1,
      borderColor:
        "#E8CFD9",
      backgroundColor:
        COLORS.pinkSoft,
    },

    quoteLabel: {
      fontSize: 10,
      fontWeight: "600",
      color:
        COLORS.textMuted,
    },

    quotePrice: {
      marginTop: 3,
      fontSize: 22,
      fontWeight: "900",
      color:
        COLORS.primary,
    },

    requestActions: {
      marginTop: 13,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    requestSecondaryButton: {
      flex: 1,
      minWidth: 100,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor:
        COLORS.primary,
      backgroundColor:
        COLORS.card,
    },

    requestSecondaryButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color:
        COLORS.primary,
    },

    requestPrimaryButton: {
      flex: 1.3,
      minWidth: 130,
      height: 42,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor:
        COLORS.primary,
    },

    requestPrimaryButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    cancelRequestButton: {
      width: "100%",
      height: 40,
      marginTop: 1,
      borderRadius: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      backgroundColor:
        COLORS.dangerSoft,
    },

    cancelRequestText: {
      fontSize: 11,
      fontWeight: "800",
      color:
        COLORS.danger,
    },

    stateContainer: {
      paddingVertical: 55,
      paddingHorizontal: 25,
      alignItems: "center",
      justifyContent: "center",
    },

    stateIconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
      marginBottom: 14,
    },

    stateTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: COLORS.text,
      textAlign: "center",
    },

    stateText: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.textMuted,
      textAlign: "center",
    },

    retryButton: {
      marginTop: 17,
      height: 42,
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
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    emptyInlineCard: {
      paddingVertical: 34,
      paddingHorizontal: 22,
      borderRadius: 18,
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.card,
    },

    emptyInlineTitle: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: "800",
      color: COLORS.text,
      textAlign: "center",
    },

    emptyInlineText: {
      marginTop: 6,
      maxWidth: 260,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
      color:
        COLORS.textMuted,
    },

    emptyActionButton: {
      marginTop: 16,
      height: 42,
      paddingHorizontal: 16,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor:
        COLORS.primary,
    },

    emptyActionText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    /* =====================================================
     * COMMENTS
     * =================================================== */

    modalBackdrop: {
      flex: 1,
      justifyContent:
        "flex-end",
      backgroundColor:
        "rgba(22,16,19,0.35)",
    },

    commentSheet: {
      height: "82%",
      maxHeight: 720,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      backgroundColor:
        COLORS.card,
      overflow: "hidden",
    },

    commentSheetHandle: {
      alignSelf: "center",
      width: 44,
      height: 5,
      borderRadius: 3,
      marginTop: 9,
      marginBottom: 6,
      backgroundColor:
        "#DDD3D8",
    },

    commentHeader: {
      minHeight: 61,
      paddingHorizontal: 18,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    commentHeaderTitle: {
      fontSize: 19,
      fontWeight: "900",
      color: COLORS.text,
    },

    commentHeaderSubtitle: {
      marginTop: 2,
      fontSize: 10,
      color:
        COLORS.textMuted,
    },

    commentCloseButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.graySoft,
    },

    commentPostSummary: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 10,
      backgroundColor:
        COLORS.primarySoft,
    },

    commentPostAuthor: {
      fontSize: 12,
      fontWeight: "800",
      color: COLORS.text,
    },

    commentPostCaption: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color:
        COLORS.textMuted,
    },

    commentDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
    },

    commentsList: {
      flex: 1,
    },

    commentsContent: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 24,
    },

    commentsLoading: {
      flex: 1,
      minHeight: 220,
      alignItems: "center",
      justifyContent: "center",
    },

    commentsLoadingText: {
      marginTop: 10,
      fontSize: 12,
      color:
        COLORS.textMuted,
    },

    commentsEmpty: {
      flex: 1,
      minHeight: 240,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    commentsEmptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
      marginBottom: 12,
    },

    commentsEmptyTitle: {
      marginTop: 8,
      fontSize: 15,
      fontWeight: "800",
      textAlign: "center",
      color: COLORS.text,
    },

    commentsEmptyText: {
      marginTop: 5,
      fontSize: 11,
      lineHeight: 17,
      textAlign: "center",
      color:
        COLORS.textMuted,
    },

    commentRetryButton: {
      marginTop: 14,
      height: 37,
      paddingHorizontal: 16,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primary,
    },

    commentRetryText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    commentItem: {
      marginBottom: 15,
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 9,
    },

    commentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        COLORS.graySoft,
    },

    commentAvatarFallback: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primarySoft,
    },

    commentBubbleContainer: {
      flex: 1,
    },

    commentBubble: {
      alignSelf:
        "flex-start",
      maxWidth: "100%",
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 15,
      backgroundColor:
        COLORS.graySoft,
    },

    commentNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },

    commentAuthor: {
      fontSize: 12,
      fontWeight: "800",
      color: COLORS.text,
    },

    commentRole: {
      fontSize: 8,
      fontWeight: "700",
      color:
        COLORS.primary,
      textTransform:
        "capitalize",
    },

    commentContent: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      color: COLORS.text,
    },

    commentMetaRow: {
      marginTop: 5,
      paddingHorizontal: 5,
      minHeight: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },

    commentDate: {
      fontSize: 9,
      color: "#A39A9F",
    },

    deleteCommentText: {
      fontSize: 10,
      fontWeight: "700",
      color:
        COLORS.danger,
    },

    commentComposer: {
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom:
        Platform.OS === "ios"
          ? 18
          : 12,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      flexDirection: "row",
      alignItems:
        "flex-end",
      gap: 9,
      backgroundColor:
        COLORS.card,
    },

    commentInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 110,
      paddingHorizontal: 14,
      paddingTop: 11,
      paddingBottom: 11,
      borderRadius: 22,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        "#FAF8F9",
      fontSize: 13,
      lineHeight: 18,
      color: COLORS.text,
    },

    sendCommentButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.primary,
    },

    sendCommentDisabled: {
      opacity: 0.4,
    },

    /* =====================================================
     * BOTTOM NAV
     * =================================================== */

    bottomNav: {
      minHeight: 72,
      paddingTop: 8,
      paddingBottom:
        Platform.OS === "ios"
          ? 8
          : 10,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-around",
      backgroundColor:
        COLORS.card,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: -3,
      },
      elevation: 9,
    },

    navItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    navPressed: {
      opacity: 0.65,
    },

    navIconWrapper: {
      minWidth: 38,
      height: 30,
      paddingHorizontal: 8,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },

    navIconWrapperActive: {
      backgroundColor:
        COLORS.primarySoft,
    },

    navLabel: {
      marginTop: 3,
      fontSize: 9,
      fontWeight: "600",
      color: "#8E858A",
    },

    navLabelActive: {
      fontWeight: "800",
      color:
        COLORS.primary,
    },
  });