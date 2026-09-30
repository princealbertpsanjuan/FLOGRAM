import { apiRequest } from "./api";

/*
 * =========================================================
 * COMMON TYPES
 * =========================================================
 */

export type AdminUser = {
  _id?: string;
  id?: string;

  firstName?: string;
  lastName?: string;

  email?: string;
  phoneNumber?: string;

  role?: string;

  verificationStatus?:
    | "pending"
    | "approved"
    | "rejected";

  profilePicture?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

/*
 * =========================================================
 * FLORIST / SELLER
 * =========================================================
 */

export type AdminFlorist = {
  _id?: string;
  id?: string;

  owner?:
    | AdminUser
    | string
    | null;

  shopName?: string;

  description?: string;

  contactNumber?: string;

  businessEmail?: string;

  shopLogo?: string | null;

  verificationStatus?:
    | "pending"
    | "approved"
    | "rejected";

  remarks?: string;

  verifiedAt?: string | null;

  verifiedBy?:
    | AdminUser
    | string
    | null;

  isActive?: boolean;

  createdAt?: string;
  updatedAt?: string;
};

/*
 * =========================================================
 * ADMIN DASHBOARD
 * =========================================================
 */

export type AdminRecentActivityType =
  | "order"
  | "seller_verification"
  | "rider_verification"
  | "remittance";

export type AdminRecentActivity = {
  type: AdminRecentActivityType;

  id?: string;

  title?: string;

  orderStatus?: string;

  paymentStatus?: string;

  paymentMethod?: string;

  totalAmount?: number;

  verificationStatus?: string;

  status?: string;

  referenceNumber?: string;

  vehicleType?: string;

  vehiclePlateNumber?: string;

  customer?: AdminUser | null;

  seller?: AdminUser | null;

  owner?: AdminUser | null;

  riderUser?: AdminUser | null;

  florist?: {
    _id?: string;
    id?: string;
    shopName?: string;
  } | null;

  shiftDate?: string;

  submittedAt?: string | null;

  createdAt?: string;

  updatedAt?: string;
};

export type AdminDashboardData = {
  users: {
    total: number;
    customers: number;
    sellers: number;
    riders: number;
  };

  orders: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };

  revenue: {
    /*
     * Recognized gross transaction value.
     *
     * Online:
     * successful paid transactions.
     *
     * COD:
     * Admin-verified Rider remittances.
     */
    total: number;
    today: number;

    online?: {
      total: number;
      today: number;
    };

    cod?: {
      total: number;
      today: number;
    };

    commission?: {
      rate: number;
      percentage: number;
      total: number;
      today: number;
    };

    sellerShare?: {
      total: number;
      today: number;
    };
  };

  verifications: {
    pendingSellers: number;
    pendingRiders: number;
    totalPending: number;
  };

  remittances: {
    pending: number;
    submitted: number;
    verified?: number;

    /*
     * Submitted remittances waiting
     * for Admin verification.
     */
    awaitingVerification: number;
  };

  recentActivity: AdminRecentActivity[];
};

/*
 * =========================================================
 * RIDER REMITTANCE TYPES
 * =========================================================
 */

export type AdminRemittanceStatus =
  | "pending"
  | "submitted"
  | "verified"
  | "rejected";

export type AdminRider = {
  _id?: string;
  id?: string;

  owner?:
    | AdminUser
    | string
    | null;

  vehicleType?: string;

  vehiclePlateNumber?: string;

  verificationStatus?: string;
};

export type AdminRemittanceDelivery = {
  _id?: string;
  id?: string;

  status?: string;

  deliveredAt?: string | null;
};

export type AdminRemittanceOrder = {
  _id?: string;
  id?: string;

  productName?: string;

  totalAmount?: number;

  paymentMethod?: string;

  paymentStatus?: string;

  orderStatus?: string;

  createdAt?: string;
};

export type AdminRemittanceItem = {
  deliveryId?: string | null;

  orderId?: string | null;

  amount: number;

  delivery?:
    | AdminRemittanceDelivery
    | string
    | null;

  order?:
    | AdminRemittanceOrder
    | string
    | null;
};

export type AdminRiderRemittance = {
  id: string;

  riderId?: string | null;

  rider?:
    | AdminRider
    | null;

  riderUser?:
    | AdminUser
    | null;

  shiftDate?: string;

  deliveryCount: number;

  items?: AdminRemittanceItem[];

  totalAmount: number;

  status: AdminRemittanceStatus;

  referenceNumber?: string;

  proofImageUrl?: string | null;

  riderRemarks?: string;

  adminRemarks?: string;

  submittedAt?: string | null;

  verifiedAt?: string | null;

  verifiedBy?:
    | AdminUser
    | null;

  createdAt?: string;

  updatedAt?: string;
};

/*
 * =========================================================
 * API RESPONSE TYPES
 * =========================================================
 */

type ApiResponse<T> = {
  success?: boolean;

  message?: string;

  data?: T;
};

type DashboardResponse =
  ApiResponse<AdminDashboardData>;

type PendingFloristsResponse =
  ApiResponse<{
    florists?: AdminFlorist[];
  }>;

type FloristResponse =
  ApiResponse<{
    florist?: AdminFlorist;
  }>;

type RemittancesResponse =
  ApiResponse<{
    remittances?: AdminRiderRemittance[];
  }>;

type RemittanceResponse =
  ApiResponse<{
    remittance?: AdminRiderRemittance;
  }>;

/*
 * =========================================================
 * RESPONSE HELPERS
 * =========================================================
 */

function requireData<T>(
  response: ApiResponse<T>,
  fallbackMessage: string
): T {
  if (
    response?.data === undefined ||
    response?.data === null
  ) {
    throw new Error(
      response?.message ||
        fallbackMessage
    );
  }

  return response.data;
}

function getFloristFromResponse(
  response: FloristResponse
): AdminFlorist {
  const data =
    requireData(
      response,
      "Florist data was not returned."
    );

  if (!data.florist) {
    throw new Error(
      response.message ||
        "Florist data was not returned."
    );
  }

  return data.florist;
}

function getRemittanceFromResponse(
  response: RemittanceResponse
): AdminRiderRemittance {
  const data =
    requireData(
      response,
      "Remittance data was not returned."
    );

  if (!data.remittance) {
    throw new Error(
      response.message ||
        "Remittance data was not returned."
    );
  }

  return data.remittance;
}

/*
 * =========================================================
 * ADMIN DASHBOARD
 * =========================================================
 */

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const response =
    await apiRequest<
      DashboardResponse
    >(
      "/admin/dashboard",
      {
        method: "GET",
        authenticated: true,
      }
    );

  return requireData(
    response,
    "Admin dashboard data was not returned."
  );
}

/*
 * =========================================================
 * ADMIN REPORTS & ANALYTICS
 * =========================================================
 */

export type AdminReportPeriod =
  | "today"
  | "7d"
  | "30d"
  | "6m"
  | "1y"
  | "all";

export type AdminReportGranularity =
  | "day"
  | "month";

export type AdminReportPeriodInfo = {
  key: AdminReportPeriod;

  startDate:
    | string
    | null;

  endDate: string;

  granularity:
    AdminReportGranularity;
};

/*
 * =========================================================
 * REPORT OVERVIEW
 * =========================================================
 */

export type AdminReportOverview = {
  totalUsers: number;

  totalCustomers: number;

  totalSellers: number;

  totalRiders: number;

  totalOrders: number;

  completedOrders: number;

  cancelledOrders: number;

  completionRate: number;

  cancellationRate: number;

  /*
   * Recognized sales:
   *
   * Online:
   * successfully paid non-COD orders.
   *
   * COD:
   * Admin-verified Rider remittances.
   */
  recognizedSales: number;

  commission: number;

  sellerShare: number;
};

/*
 * =========================================================
 * SALES ANALYTICS
 * =========================================================
 */

export type AdminSalesTrendItem = {
  period: string;

  online: number;

  cod: number;

  total: number;

  commission: number;

  sellerShare: number;
};

export type AdminReportSales = {
  total: number;

  online: number;

  cod: number;

  commissionRate: number;

  commissionPercentage: number;

  commission: number;

  sellerShare: number;

  trend: AdminSalesTrendItem[];
};

/*
 * =========================================================
 * ORDER ANALYTICS
 * =========================================================
 */

export type AdminReportBreakdown = {
  key: string;

  count: number;
};

export type AdminOrderTrendItem = {
  period: string;

  orders: number;

  grossOrderValue: number;
};

export type AdminReportOrders = {
  total: number;

  completed: number;

  cancelled: number;

  preOrders: number;

  completionRate: number;

  cancellationRate: number;

  byStatus:
    AdminReportBreakdown[];

  byFulfillment:
    AdminReportBreakdown[];

  byPaymentMethod:
    AdminReportBreakdown[];

  byPaymentStatus:
    AdminReportBreakdown[];

  bySource:
    AdminReportBreakdown[];

  trend:
    AdminOrderTrendItem[];
};

/*
 * =========================================================
 * USER ANALYTICS
 * =========================================================
 */

export type AdminUserGrowthItem = {
  period: string;

  customers: number;

  sellers: number;

  riders: number;

  total: number;
};

export type AdminReportUsers = {
  /*
   * Current platform totals.
   */
  total: number;

  customers: number;

  sellers: number;

  riders: number;

  /*
   * New registrations during
   * the selected report period.
   */
  newUsers: number;

  newCustomers: number;

  newSellers: number;

  newRiders: number;

  growth:
    AdminUserGrowthItem[];
};

/*
 * =========================================================
 * REMITTANCE ANALYTICS
 * =========================================================
 */

export type AdminReportRemittances = {
  total: number;

  pending: number;

  submitted: number;

  verified: number;

  rejected: number;

  /*
   * Number verified during
   * the selected report period.
   */
  verifiedInPeriod: number;

  /*
   * COD amount recognized during
   * the selected report period.
   */
  verifiedAmount: number;

  awaitingVerification: number;
};

/*
 * =========================================================
 * TOP SHOP ANALYTICS
 * =========================================================
 */

export type AdminReportShopOwner = {
  _id?: string;

  id?: string;

  firstName?: string;

  lastName?: string;

  email?: string;
};

export type AdminTopShop = {
  rank: number;

  floristId?:
    | string
    | null;

  shopName: string;

  owner?:
    | AdminReportShopOwner
    | null;

  verificationStatus?:
    | string
    | null;

  orders: number;

  /*
   * Completed marketplace order
   * value for operational ranking.
   *
   * This is NOT the same as
   * recognized platform revenue.
   */
  orderValue: number;
};

/*
 * =========================================================
 * COMPLETE REPORT RESPONSE
 * =========================================================
 */

export type AdminReportsData = {
  period:
    AdminReportPeriodInfo;

  overview:
    AdminReportOverview;

  sales:
    AdminReportSales;

  orders:
    AdminReportOrders;

  users:
    AdminReportUsers;

  remittances:
    AdminReportRemittances;

  topShops:
    AdminTopShop[];
};

type AdminReportsResponse =
  ApiResponse<AdminReportsData>;

/*
 * =========================================================
 * GET ADMIN REPORTS & ANALYTICS
 * =========================================================
 *
 * GET /api/v1/admin/reports
 *
 * Optional:
 *
 * ?period=today
 * ?period=7d
 * ?period=30d
 * ?period=6m
 * ?period=1y
 * ?period=all
 *
 * ADMIN ONLY
 * =========================================================
 */

export async function getAdminReports(
  period: AdminReportPeriod =
    "30d"
): Promise<AdminReportsData> {
  const response =
    await apiRequest<
      AdminReportsResponse
    >(
      `/admin/reports?period=${encodeURIComponent(
        period
      )}`,
      {
        method: "GET",

        authenticated: true,
      }
    );

  return requireData(
    response,
    "Admin reports and analytics could not be loaded."
  );
}

/*
 * =========================================================
 * SELLER VERIFICATION
 * =========================================================
 */

/*
 * GET
 * /api/v1/florists/pending
 */

export async function getPendingFlorists(): Promise<
  AdminFlorist[]
> {
  const response =
    await apiRequest<
      PendingFloristsResponse
    >(
      "/florists/pending",
      {
        method: "GET",
        authenticated: true,
      }
    );

  const data =
    requireData(
      response,
      "Pending seller applications could not be loaded."
    );

  return data.florists ?? [];
}

/*
 * GET
 * /api/v1/florists/:floristId
 */

export async function getAdminFloristById(
  floristId: string
): Promise<AdminFlorist> {
  const response =
    await apiRequest<
      FloristResponse
    >(
      `/florists/${encodeURIComponent(
        floristId
      )}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  return getFloristFromResponse(
    response
  );
}

/*
 * PATCH
 * /api/v1/florists/:floristId/approve
 */

export async function approveFlorist(
  floristId: string
): Promise<AdminFlorist> {
  const response =
    await apiRequest<
      FloristResponse
    >(
      `/florists/${encodeURIComponent(
        floristId
      )}/approve`,
      {
        method: "PATCH",
        authenticated: true,
      }
    );

  return getFloristFromResponse(
    response
  );
}

/*
 * PATCH
 * /api/v1/florists/:floristId/reject
 */

export async function rejectFlorist(
  floristId: string,
  remarks: string
): Promise<AdminFlorist> {
  const cleanRemarks =
    remarks.trim();

  if (!cleanRemarks) {
    throw new Error(
      "A rejection reason is required."
    );
  }

  const response =
    await apiRequest<
      FloristResponse
    >(
      `/florists/${encodeURIComponent(
        floristId
      )}/reject`,
      {
        method: "PATCH",
        authenticated: true,

        body: JSON.stringify({
          remarks:
            cleanRemarks,
        }),
      }
    );

  return getFloristFromResponse(
    response
  );
}

/*
 * =========================================================
 * ADMIN RIDER REMITTANCES
 * =========================================================
 */

/*
 * GET
 * /api/v1/riders/remittances
 *
 * Optional:
 *
 * ?status=pending
 * ?status=submitted
 * ?status=verified
 * ?status=rejected
 */

export async function getAdminRemittances(
  status?: AdminRemittanceStatus
): Promise<AdminRiderRemittance[]> {
  const query =
    status
      ? `?status=${encodeURIComponent(
          status
        )}`
      : "";

  const response =
    await apiRequest<
      RemittancesResponse
    >(
      `/riders/remittances${query}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  const data =
    requireData(
      response,
      "Rider remittances could not be loaded."
    );

  return data.remittances ?? [];
}

/*
 * Convenience function used by the
 * Admin screen showing remittances that
 * require action.
 */

export async function getSubmittedRemittances(): Promise<
  AdminRiderRemittance[]
> {
  return getAdminRemittances(
    "submitted"
  );
}

/*
 * GET
 * /api/v1/riders/remittances/:remittanceId
 */

export async function getAdminRemittanceById(
  remittanceId: string
): Promise<AdminRiderRemittance> {
  const response =
    await apiRequest<
      RemittanceResponse
    >(
      `/riders/remittances/${encodeURIComponent(
        remittanceId
      )}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  return getRemittanceFromResponse(
    response
  );
}

/*
 * PATCH
 * /api/v1/riders/remittances/:remittanceId/verify
 */

export async function verifyAdminRemittance(
  remittanceId: string,
  remarks = ""
): Promise<AdminRiderRemittance> {
  const response =
    await apiRequest<
      RemittanceResponse
    >(
      `/riders/remittances/${encodeURIComponent(
        remittanceId
      )}/verify`,
      {
        method: "PATCH",
        authenticated: true,

        body: JSON.stringify({
          remarks:
            remarks.trim(),
        }),
      }
    );

  return getRemittanceFromResponse(
    response
  );
}

/*
 * PATCH
 * /api/v1/riders/remittances/:remittanceId/reject
 */

export async function rejectAdminRemittance(
  remittanceId: string,
  remarks: string
): Promise<AdminRiderRemittance> {
  const cleanRemarks =
    remarks.trim();

  if (!cleanRemarks) {
    throw new Error(
      "A rejection reason is required."
    );
  }

  const response =
    await apiRequest<
      RemittanceResponse
    >(
      `/riders/remittances/${encodeURIComponent(
        remittanceId
      )}/reject`,
      {
        method: "PATCH",
        authenticated: true,

        body: JSON.stringify({
          remarks:
            cleanRemarks,
        }),
      }
    );

  return getRemittanceFromResponse(
    response
  );
}

/*
 * =========================================================
 * RIDER VERIFICATION
 * =========================================================
 */

export type AdminRiderVerification = {
  _id?: string;
  id?: string;

  owner?:
    | AdminUser
    | string
    | null;

  address?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };

  vehicleType?: string;

  vehiclePlateNumber?: string;

  verificationStatus?:
    | "pending"
    | "approved"
    | "rejected";

  verificationRemarks?: string;

  verifiedAt?: string | null;

  verifiedBy?:
    | AdminUser
    | string
    | null;

  isAvailable?: boolean;

  isActive?: boolean;

  createdAt?: string;

  updatedAt?: string;
};

/*
 * =========================================================
 * RIDER API RESPONSE TYPES
 * =========================================================
 */

type PendingRidersResponse =
  ApiResponse<{
    riders?: AdminRiderVerification[];
  }>;

type RiderVerificationResponse =
  ApiResponse<{
    rider?: AdminRiderVerification;
  }>;

/*
 * =========================================================
 * RIDER RESPONSE HELPER
 * =========================================================
 */

function getRiderFromResponse(
  response: RiderVerificationResponse
): AdminRiderVerification {
  const data =
    requireData(
      response,
      "Rider data was not returned."
    );

  if (!data.rider) {
    throw new Error(
      response.message ||
        "Rider data was not returned."
    );
  }

  return data.rider;
}

/*
 * =========================================================
 * GET PENDING RIDERS
 *
 * GET
 * /api/v1/riders/pending
 * =========================================================
 */

export async function getPendingRiders(): Promise<
  AdminRiderVerification[]
> {
  const response =
    await apiRequest<
      PendingRidersResponse
    >(
      "/riders/pending",
      {
        method: "GET",
        authenticated: true,
      }
    );

  const data =
    requireData(
      response,
      "Pending rider applications could not be loaded."
    );

  return data.riders ?? [];
}

/*
 * =========================================================
 * GET RIDER DETAILS
 *
 * GET
 * /api/v1/riders/:riderId
 * =========================================================
 */

export async function getAdminRiderById(
  riderId: string
): Promise<AdminRiderVerification> {
  if (!riderId.trim()) {
    throw new Error(
      "Rider ID is required."
    );
  }

  const response =
    await apiRequest<
      RiderVerificationResponse
    >(
      `/riders/${encodeURIComponent(
        riderId
      )}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  return getRiderFromResponse(
    response
  );
}

/*
 * =========================================================
 * APPROVE RIDER
 *
 * PATCH
 * /api/v1/riders/:riderId/approve
 * =========================================================
 */

export async function approveAdminRider(
  riderId: string
): Promise<AdminRiderVerification> {
  if (!riderId.trim()) {
    throw new Error(
      "Rider ID is required."
    );
  }

  const response =
    await apiRequest<
      RiderVerificationResponse
    >(
      `/riders/${encodeURIComponent(
        riderId
      )}/approve`,
      {
        method: "PATCH",
        authenticated: true,
      }
    );

  return getRiderFromResponse(
    response
  );
}

/*
 * =========================================================
 * REJECT RIDER
 *
 * PATCH
 * /api/v1/riders/:riderId/reject
 *
 * BODY:
 *
 * {
 *   "remarks": "Reason for rejection"
 * }
 * =========================================================
 */

export async function rejectAdminRider(
  riderId: string,
  remarks: string
): Promise<AdminRiderVerification> {
  if (!riderId.trim()) {
    throw new Error(
      "Rider ID is required."
    );
  }

  const cleanRemarks =
    remarks.trim();

  if (!cleanRemarks) {
    throw new Error(
      "A rejection reason is required."
    );
  }

  const response =
    await apiRequest<
      RiderVerificationResponse
    >(
      `/riders/${encodeURIComponent(
        riderId
      )}/reject`,
      {
        method: "PATCH",
        authenticated: true,

        body: JSON.stringify({
          remarks:
            cleanRemarks,
        }),
      }
    );

  return getRiderFromResponse(
    response
  );
}

/*
 * =========================================================
 * ADMIN USER MANAGEMENT
 * =========================================================
 */

export type AdminUserRole =
  | "customer"
  | "seller"
  | "rider"
  | "admin";

export type AdminUserAccountStatus =
  | "active"
  | "inactive"
  | "suspended";

export type AdminUserVerificationStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected";

export type AdminManagedUser = {
  _id?: string;
  id?: string;

  firstName: string;
  lastName: string;

  email: string;
  phoneNumber: string;

  role: AdminUserRole;

  accountStatus: AdminUserAccountStatus;

  verificationStatus: AdminUserVerificationStatus;

  profileImage?: string | null;

  lastLoginAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

export type AdminUserFilters = {
  role?: AdminUserRole;
  accountStatus?: AdminUserAccountStatus;
  verificationStatus?: AdminUserVerificationStatus;
  search?: string;
};

type AdminUsersResponse = ApiResponse<{
  users?: AdminManagedUser[];
}>;

type AdminManagedUserResponse = ApiResponse<{
  user?: AdminManagedUser;
}>;

/*
 * =========================================================
 * RESPONSE HELPER
 * =========================================================
 */

function getManagedUserFromResponse(
  response: AdminManagedUserResponse
): AdminManagedUser {
  const data = requireData(
    response,
    "User data was not returned."
  );

  if (!data.user) {
    throw new Error(
      response.message ||
        "User data was not returned."
    );
  }

  return data.user;
}

/*
 * =========================================================
 * QUERY BUILDER
 * =========================================================
 */

function buildAdminUserQuery(
  filters: AdminUserFilters = {}
) {
  const params: string[] = [];

  if (filters.role) {
    params.push(
      `role=${encodeURIComponent(filters.role)}`
    );
  }

  if (filters.accountStatus) {
    params.push(
      `accountStatus=${encodeURIComponent(
        filters.accountStatus
      )}`
    );
  }

  if (filters.verificationStatus) {
    params.push(
      `verificationStatus=${encodeURIComponent(
        filters.verificationStatus
      )}`
    );
  }

  const search = filters.search?.trim();

  if (search) {
    params.push(
      `search=${encodeURIComponent(search)}`
    );
  }

  if (params.length === 0) {
    return "";
  }

  return `?${params.join("&")}`;
}

/*
 * =========================================================
 * GET USERS
 * =========================================================
 */

export async function getAdminUsers(
  filters: AdminUserFilters = {}
): Promise<AdminManagedUser[]> {
  const query =
    buildAdminUserQuery(filters);

  const response =
    await apiRequest<AdminUsersResponse>(
      `/users${query}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  const data = requireData(
    response,
    "Users could not be loaded."
  );

  return data.users ?? [];
}

/*
 * =========================================================
 * GET USER DETAILS
 * =========================================================
 */

export async function getAdminUserById(
  userId: string
): Promise<AdminManagedUser> {
  const cleanId = userId.trim();

  if (!cleanId) {
    throw new Error(
      "User ID is required."
    );
  }

  const response =
    await apiRequest<AdminManagedUserResponse>(
      `/users/${encodeURIComponent(
        cleanId
      )}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  return getManagedUserFromResponse(
    response
  );
}

/*
 * =========================================================
 * UPDATE ACCOUNT STATUS
 * =========================================================
 */

export async function updateAdminUserStatus(
  userId: string,
  accountStatus: AdminUserAccountStatus
): Promise<AdminManagedUser> {
  const cleanId = userId.trim();

  if (!cleanId) {
    throw new Error(
      "User ID is required."
    );
  }

  const response =
    await apiRequest<AdminManagedUserResponse>(
      `/users/${encodeURIComponent(
        cleanId
      )}/status`,
      {
        method: "PATCH",
        authenticated: true,
        body: JSON.stringify({
          accountStatus,
        }),
      }
    );

  return getManagedUserFromResponse(
    response
  );
}

/*
 * =========================================================
 * ADMIN ORDER MANAGEMENT
 * =========================================================
 */

export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "ready_for_delivery"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type AdminPaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type AdminPaymentMethod =
  | "cash_on_delivery"
  | "cash_on_pickup"
  | "paymongo"
  | null;

export type AdminOrderPerson = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string | null;
};

export type AdminOrderFlorist = {
  _id?: string;
  id?: string;
  shopName?: string;
  businessEmail?: string;
  contactNumber?: string;
  shopLogo?: string | null;
  address?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
};

export type AdminOrder = {
  _id?: string;
  id?: string;

  customer?:
    | AdminOrderPerson
    | string
    | null;

  seller?:
    | AdminOrderPerson
    | string
    | null;

  florist?:
    | AdminOrderFlorist
    | string
    | null;

  sourceType?:
    | "flower_listing"
    | "custom_bouquet";

  productName?: string;
  productDescription?: string | null;
  inspirationImage?: string | null;

  unitPrice?: number;
  quantity?: number;
  subtotal?: number;
  deliveryFee?: number;
  preOrderFee?: number;
  totalAmount?: number;

  fulfillmentType?:
    | "delivery"
    | "pickup";

  deliveryAddress?: {
    street?: string | null;
    barangay?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    landmark?: string | null;
  };

  recipientName?: string | null;
  recipientPhoneNumber?: string | null;

  isPreOrder?: boolean;
  requestedDeliveryDate?: string | null;
  requestedDeliveryTimeStart?: string | null;
  requestedDeliveryTimeEnd?: string | null;

  customerNotes?: string | null;

  occasion?: string | null;
  flowerTypes?: string[];
  colors?: string[];
  styles?: string[];
  wrapping?: string | null;
  specialInstructions?: string[];

  orderStatus?: AdminOrderStatus;

  paymentMethod?: AdminPaymentMethod;
  paymentStatus?: AdminPaymentStatus;
  paymentProvider?: string | null;
  paymentChannel?: string | null;
  paidAt?: string | null;

  sellerNotes?: string | null;

  confirmedAt?: string | null;
  preparingAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

type AdminOrdersResponse =
  ApiResponse<{
    count?: number;
    orders?: AdminOrder[];
  }>;

type AdminOrderResponse =
  ApiResponse<{
    order?: AdminOrder;
  }>;

export async function getAdminOrders(
  status?: AdminOrderStatus
): Promise<AdminOrder[]> {
  const query =
    status
      ? `?status=${encodeURIComponent(status)}`
      : "";

  const response =
    await apiRequest<AdminOrdersResponse>(
      `/orders/admin${query}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  const data = requireData(
    response,
    "Orders could not be loaded."
  );

  return data.orders ?? [];
}

export async function getAdminOrderById(
  orderId: string
): Promise<AdminOrder> {
  if (!orderId.trim()) {
    throw new Error(
      "Order ID is required."
    );
  }

  const response =
    await apiRequest<AdminOrderResponse>(
      `/orders/admin/${encodeURIComponent(
        orderId
      )}`,
      {
        method: "GET",
        authenticated: true,
      }
    );

  const data = requireData(
    response,
    "Order details could not be loaded."
  );

  if (!data.order) {
    throw new Error(
      response.message ||
        "Order details could not be loaded."
    );
  }

  return data.order;
}

/*
 * =========================================================
 * ADMIN SETTINGS
 * =========================================================
 */

export type AdminSettingsData = {
  _id?: string;

  platformName: string;

  commissionRate: number;

  commissionPercentage: number;

  appVersion: string;

  updatedBy?:
    | AdminUser
    | string
    | null;

  createdAt?: string;

  updatedAt?: string;
};

export type UpdateAdminSettingsPayload = {
  platformName?: string;

  commissionPercentage?: number;

  appVersion?: string;
};

type AdminSettingsResponse =
  ApiResponse<AdminSettingsData>;

/*
 * =========================================================
 * GET ADMIN SETTINGS
 *
 * GET /api/v1/admin/settings
 * =========================================================
 */

export async function getAdminSettings(): Promise<AdminSettingsData> {
  const response =
    await apiRequest<
      AdminSettingsResponse
    >(
      "/admin/settings",
      {
        method: "GET",
        authenticated: true,
      }
    );

  return requireData(
    response,
    "Admin settings could not be loaded."
  );
}

/*
 * =========================================================
 * UPDATE ADMIN SETTINGS
 *
 * PATCH /api/v1/admin/settings
 * =========================================================
 */

export async function updateAdminSettings(
  payload: UpdateAdminSettingsPayload
): Promise<AdminSettingsData> {
  const response =
    await apiRequest<
      AdminSettingsResponse
    >(
      "/admin/settings",
      {
        method: "PATCH",
        authenticated: true,

        body: JSON.stringify(
          payload
        ),
      }
    );

  return requireData(
    response,
    "Admin settings could not be updated."
  );
}