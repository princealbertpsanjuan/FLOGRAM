import {
  File,
} from 'expo-file-system';

import {
  apiRequest,
} from './api';

/*
 * =========================================================
 * DELIVERY STATUS
 * =========================================================
 */

export type DeliveryStatus =
  | 'available'
  | 'accepted'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

/*
 * =========================================================
 * COORDINATES
 * =========================================================
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/*
 * =========================================================
 * RIDER LOCATION
 * =========================================================
 */

export type RiderLocation = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: string | null;
};

/*
 * =========================================================
 * NAVIGATION
 * =========================================================
 */

export type NavigationData = {
  destinationType:
    | 'pickup'
    | 'delivery'
    | null;

  distanceMeters: number | null;

  durationSeconds: number | null;

  estimatedArrivalAt:
    | string
    | null;

  updatedAt:
    | string
    | null;
};

/*
 * =========================================================
 * PROOF OF DELIVERY
 * =========================================================
 */

export type ProofOfDelivery = {
  imageUrl: string | null;

  uploadedAt: string | null;

  latitude: number | null;

  longitude: number | null;

  accuracy: number | null;
};

/*
 * =========================================================
 * ORDER
 * =========================================================
 */

export type DeliveryOrder = {
  _id: string;

  productName?: string;

  inspirationImage?:
    | string
    | null;

  /*
   * Complete value of the order.
   */
  totalAmount?: number;

  /*
   * Delivery charge stored as part
   * of the order.
   *
   * This is NOT Rider salary.
   */
  deliveryFee?: number;

  orderStatus?: string;

  paymentMethod?: string;

  paymentStatus?: string;

  isPreOrder?: boolean;

  requestedDeliveryDate?:
    | string
    | null;

  requestedDeliveryTimeStart?:
    | string
    | null;

  requestedDeliveryTimeEnd?:
    | string
    | null;
};

/*
 * =========================================================
 * FLORIST
 * =========================================================
 */

export type DeliveryFlorist = {
  _id: string;

  shopName: string;

  contactNumber?: string;

  shopLogo?:
    | string
    | null;

  address?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };

  location?: Coordinates;
};

/*
 * =========================================================
 * CUSTOMER
 * =========================================================
 */

export type DeliveryCustomer = {
  _id: string;

  firstName?: string;

  lastName?: string;

  phoneNumber?: string;
};

/*
 * =========================================================
 * ASSIGNED RIDER
 * =========================================================
 *
 * Customer delivery responses populate:
 *
 * delivery.rider
 *   -> Rider profile
 *      -> owner User
 *
 * The customer can use this information
 * to display the assigned Rider's name
 * and contact number.
 * =========================================================
 */

export type DeliveryRiderOwner = {
  _id?: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phoneNumber?: string;

  role?: string;

  verificationStatus?: string;
};

export type DeliveryRider = {
  _id: string;

  owner?:
    | DeliveryRiderOwner
    | string;

  verificationStatus?:
    | string
    | null;

  isActive?: boolean;

  isAvailable?: boolean;
};

/*
 * =========================================================
 * DELIVERY
 * =========================================================
 */

export type Delivery = {
  _id: string;

  order:
    | DeliveryOrder
    | string;

  customer?:
    | DeliveryCustomer
    | string;

  seller?:
    | string
    | unknown;

  florist?:
    | DeliveryFlorist
    | string;

  rider?:
  | DeliveryRider
  | string
  | null;

  riderUser?:
    | string
    | null;

  pickupAddress: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postalCode?: string;
  };

  deliveryAddress: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postalCode?: string;
    landmark?: string;
  };

  pickupLocation?: Coordinates;

  deliveryLocation?: Coordinates;

  riderLocation?: RiderLocation;

  navigation?: NavigationData;

  recipientName: string;

  recipientPhoneNumber: string;

  status: DeliveryStatus;

  availableAt?: string;

  assignedAt?:
    | string
    | null;

  acceptedAt?:
    | string
    | null;

  pickedUpAt?:
    | string
    | null;

  outForDeliveryAt?:
    | string
    | null;

  deliveredAt?:
    | string
    | null;

  cancelledAt?:
    | string
    | null;

  riderNotes?:
    | string
    | null;

  proofOfDelivery?: ProofOfDelivery;

  createdAt?: string;

  updatedAt?: string;
};

/*
 * =========================================================
 * RIDER DASHBOARD
 * =========================================================
 *
 * GET
 * /api/v1/riders/me/dashboard
 *
 * Backend remains the source of truth
 * for delivery counts and monetary values.
 * =========================================================
 */

export type RiderDashboardData = {
  rider: {
    id: string;

    firstName: string;

    lastName: string;

    isAvailable: boolean;

    isActive: boolean;

    verificationStatus:
      | string
      | null;
  };

  /*
   * =========================================================
   * DELIVERY COUNTS
   * =========================================================
   */

  deliveries: {
    total: number;

    completed: number;

    active: number;

    cancelled: number;
  };

  /*
   * =========================================================
   * WORK SHIFT
   * =========================================================
   *
   * Online/Offline follows the Rider's
   * approved Admin work shift.
   * =========================================================
   */

  workShift: RiderWorkShiftStatus;

  /*
   * =========================================================
   * DELIVERY FEES
   * =========================================================
   *
   * Rider income comes ONLY from
   * Order.deliveryFee of successfully
   * delivered orders.
   *
   * COD cash collected from customers is
   * NOT Rider income.
   * =========================================================
   */

  deliveryFees: {
    total: number;

    today: number;

    thisMonth: number;
  };

  /*
   * =========================================================
   * RIDER PERFORMANCE
   * =========================================================
   *
   * completionRate:
   *
   * completed
   * --------------------
   * completed + cancelled
   *
   * Active deliveries are not included
   * because they are not finished yet.
   * =========================================================
   */

  performance: {
    completionRate: number;
  };

  /*
   * =========================================================
   * WEEKLY DELIVERIES
   * =========================================================
   *
   * Real successfully completed deliveries
   * for the current Philippine calendar week.
   *
   * Monday -> Sunday
   * =========================================================
   */

  weeklyDeliveries: {
    day:
      | 'Mon'
      | 'Tue'
      | 'Wed'
      | 'Thu'
      | 'Fri'
      | 'Sat'
      | 'Sun';

    value: number;
  }[];

  /*
   * =========================================================
   * RIDER RATING
   * =========================================================
   *
   * Rating remains null until the real
   * Review/Rating module is implemented.
   * =========================================================
   */

  rating: {
    average:
      | number
      | null;

    count: number;
  };
};

/*
 * =========================================================
 * RIDER WALLET
 * =========================================================
 *
 * GET
 * /api/v1/riders/me/wallet
 *
 * BUSINESS RULE:
 *
 * One Rider
 * +
 * one Philippine calendar day
 * =
 * one shift remittance.
 *
 * All delivered + paid COD orders from the
 * same Rider shift/day are grouped into one
 * remittance.
 *
 * PayMongo transactions are informational
 * only and are never included in Rider
 * remittance.
 *
 * This is NOT Rider salary/payroll.
 * =========================================================
 */

export type RiderRemittanceStatus =
  | 'pending'
  | 'submitted'
  | 'verified'
  | 'rejected';

/*
 * =========================================================
 * WALLET TRANSACTION
 * =========================================================
 *
 * Individual delivered orders remain visible
 * in Wallet history.
 *
 * Multiple COD transactions may point to the
 * same remittanceId when they were completed
 * during the same Philippine shift/day.
 * =========================================================
 */

export type RiderWalletTransaction = {
  /*
   * DELIVERY
   */

  deliveryId: string;

  deliveryStatus: string;

  deliveredAt:
    | string
    | null;

  /*
   * ORDER
   */

  orderId: string;

  productName: string;

  recipientName: string;

  /*
   * PAYMENT
   */

  amount: number;

  paymentMethod:
    | string
    | null;

  paymentStatus:
    | string
    | null;

  /*
   * DAILY SHIFT REMITTANCE
   *
   * PayMongo transactions have null values
   * because the Rider does not physically
   * collect that money.
   */

  remittanceStatus:
    | RiderRemittanceStatus
    | null;

  remittanceId:
    | string
    | null;

  remittanceShiftDate:
    | string
    | null;

  /*
   * Total COD amount for the entire shift,
   * not just this individual transaction.
   */

  remittanceTotalAmount:
    | number
    | null;

  remittanceSubmittedAt:
    | string
    | null;

  remittanceVerifiedAt:
    | string
    | null;
};

/*
 * =========================================================
 * DAILY RIDER REMITTANCE
 * =========================================================
 *
 * One record represents the complete COD
 * remittance for one Rider shift/day.
 * =========================================================
 */

export type RiderDailyRemittance = {
  id: string;

  shiftDate: string;

  status:
    RiderRemittanceStatus;

  /*
   * Complete COD amount to remit for
   * this shift.
   */

  totalAmount: number;

  /*
   * Number of COD deliveries included
   * in this shift remittance.
   */

  deliveryCount: number;

  referenceNumber: string;

  proofImageUrl:
    | string
    | null;

  riderRemarks: string;

  submittedAt:
    | string
    | null;

  verifiedAt:
    | string
    | null;

  /*
   * Used when Admin rejects a remittance
   * and explains why.
   */

  adminRemarks: string;
};

/*
 * =========================================================
 * CURRENT RIDER SHIFT
 * =========================================================
 *
 * Today's Philippine-calendar-day COD
 * remittance.
 *
 * null means the Rider has no delivered +
 * paid COD transaction for the current
 * Philippine day.
 * =========================================================
 */

export type RiderCurrentShift = {
  remittanceId: string;

  shiftDate: string;

  status:
    RiderRemittanceStatus;

  totalAmount: number;

  deliveryCount: number;

  submittedAt:
    | string
    | null;

  verifiedAt:
    | string
    | null;

  adminRemarks: string;
};

/*
 * =========================================================
 * RIDER WALLET DATA
 * =========================================================
 */

export type RiderWalletData = {
  summary: {
    /*
     * COD collected during today's
     * Philippine shift.
     */

    cashCollectedToday: number;

    /*
     * Historical COD collected from all
     * successfully delivered + paid COD
     * orders.
     */

    totalCashCollected: number;

    /*
     * Total amounts grouped by daily
     * remittance status.
     */

    pendingRemittance: number;

    submittedRemittance: number;

    verifiedRemittance: number;

    rejectedRemittance: number;
  };

  counts: {
    totalTransactions: number;

    codTransactions: number;

    onlineTransactions: number;

    /*
     * These are DAILY REMITTANCE counts,
     * not individual order counts.
     */

    pendingRemittances: number;

    submittedRemittances: number;

    verifiedRemittances: number;

    rejectedRemittances: number;
  };

  /*
   * Today's shift.
   *
   * null when there is no COD collection
   * for today's Philippine calendar date.
   */

  currentShift:
    | RiderCurrentShift
    | null;

  /*
   * Individual delivered order history.
   */

  transactions:
    RiderWalletTransaction[];

  /*
   * One entry per Rider shift/day.
   */

  remittances:
    RiderDailyRemittance[];
};

/*
 * =========================================================
 * RIDER REMITTANCE SUBMISSION
 * =========================================================
 *
 * PATCH
 * /api/v1/riders/me/remittances/:remittanceId/submit
 *
 * One request now submits the COMPLETE
 * daily-shift COD remittance.
 *
 * The mobile app sends:
 *
 * - referenceNumber
 * - riderRemarks
 * - proofImage
 *
 * using multipart/form-data.
 *
 * The backend determines the shift orders
 * and total amount. The mobile app must
 * never send or calculate the authoritative
 * remittance amount.
 * =========================================================
 */

export type RiderRemittanceSubmission = {
  referenceNumber: string;

  riderRemarks?: string;

  proofImageUri: string;

  /*
   * Optional metadata supplied by
   * Expo Image Picker.
   */

  proofImageName?: string;

  proofImageType?: string;
};

/*
 * =========================================================
 * SUBMITTED DAILY REMITTANCE
 * =========================================================
 */

export type RiderSubmittedRemittanceItem = {
  deliveryId: string;

  orderId: string;

  amount: number;
};

export type RiderSubmittedRemittance = {
  id: string;

  shiftDate: string;

  /*
   * Number of COD deliveries included
   * in this submission.
   */

  deliveryCount: number;

  items:
    RiderSubmittedRemittanceItem[];

  /*
   * Complete COD amount submitted for
   * the shift.
   */

  totalAmount: number;

  status:
    RiderRemittanceStatus;

  referenceNumber: string;

  proofImageUrl: string;

  riderRemarks: string;

  submittedAt:
    | string
    | null;

  verifiedAt:
    | string
    | null;
};

/*
 * =========================================================
 * RESPONSE TYPES
 * =========================================================
 */

type AvailableDeliveriesResponse = {
  success: boolean;

  message: string;

  data: {
    count: number;

    deliveries: Delivery[];
  };
};

type RiderDeliveriesResponse = {
  success: boolean;

  message: string;

  data: {
    count: number;

    deliveries: Delivery[];
  };
};

/*
 * =========================================================
 * CUSTOMER DELIVERIES RESPONSE
 * =========================================================
 */

type CustomerDeliveriesResponse = {
  success: boolean;

  message: string;

  data: {
    count: number;

    deliveries: Delivery[];
  };
};

type DeliveryResponse = {
  success: boolean;

  message: string;

  data: {
    delivery: Delivery;
  };
};

type RiderDashboardResponse = {
  success: boolean;

  message: string;

  data: RiderDashboardData;
};

type RiderWalletResponse = {
  success: boolean;

  message: string;

  data: RiderWalletData;
};

type RiderRemittanceSubmissionResponse = {
  success: boolean;

  message: string;

  data: {
    remittance:
      RiderSubmittedRemittance;
  };
};

type RiderAvailabilityResponse = {
  success: boolean;

  message: string;

  data: {
    isAvailable: boolean;
  };
};

/*
 * =========================================================
 * RIDER DASHBOARD
 * =========================================================
 */

export const getRiderDashboard =
  async () => {
    const response =
      await apiRequest<RiderDashboardResponse>(
        '/riders/me/dashboard',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * RIDER WALLET
 * =========================================================
 *
 * GET
 * /api/v1/riders/me/wallet
 *
 * Backend is the source of truth for:
 *
 * - today's COD shift collection
 * - daily shift remittances
 * - pending remittances
 * - submitted remittances
 * - verified remittances
 * - rejected remittances
 * - individual transaction history
 *
 * One Rider + one Philippine calendar day
 * = one COD remittance.
 *
 * This is NOT Rider salary/payroll.
 * =========================================================
 */

export const getRiderWallet =
  async () => {
    const response =
      await apiRequest<RiderWalletResponse>(
        '/riders/me/wallet',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * SUBMIT RIDER REMITTANCE
 * =========================================================
 *
 * PATCH
 * /api/v1/riders/me/remittances/:remittanceId/submit
 *
 * Content-Type:
 * multipart/form-data
 *
 * IMPORTANT:
 *
 * Do NOT manually specify
 * Content-Type: multipart/form-data.
 *
 * React Native / fetch must generate
 * the multipart boundary automatically.
 * =========================================================
 */

export const submitRiderRemittance =
  async (
    remittanceId: string,
    submission:
      RiderRemittanceSubmission
  ) => {
    if (
      !remittanceId?.trim()
    ) {
      throw new Error(
        'Remittance ID is required.'
      );
    }

    const referenceNumber =
      submission
        .referenceNumber
        .trim();

    if (!referenceNumber) {
      throw new Error(
        'Remittance reference number is required.'
      );
    }

    if (
      !submission
        .proofImageUri
        ?.trim()
    ) {
      throw new Error(
        'Proof of remittance is required.'
      );
    }

    const formData =
      new FormData();

    /*
     * -----------------------------------------------------
     * REFERENCE NUMBER
     * -----------------------------------------------------
     */

    formData.append(
      'referenceNumber',
      referenceNumber
    );

    /*
     * -----------------------------------------------------
     * RIDER REMARKS
     * -----------------------------------------------------
     */

    const riderRemarks =
      submission
        .riderRemarks
        ?.trim();

    if (riderRemarks) {
      formData.append(
        'riderRemarks',
        riderRemarks
      );
    }

    /*
     * -----------------------------------------------------
     * PROOF IMAGE
     * -----------------------------------------------------
     *
     * Must match:
     *
     * riderRemittanceProofUpload.single(
     *   "proofImage"
     * )
     *
     * Expo SDK 57 fetch does not accept the old
     * React Native { uri, name, type } object and
     * fails with "Unsupported FormDataPart
     * implementation". Use a real Expo File, the
     * same approach as Proof of Delivery.
     * -----------------------------------------------------
     */

    const proofFile =
      new File(
        submission
          .proofImageUri
          .trim()
      );

    formData.append(
      'proofImage',
      proofFile
    );

    /*
     * -----------------------------------------------------
     * REQUEST
     * -----------------------------------------------------
     *
     * Do NOT manually set the
     * multipart Content-Type header.
     */

    const response =
      await apiRequest<RiderRemittanceSubmissionResponse>(
        `/riders/me/remittances/${encodeURIComponent(
          remittanceId
        )}/submit`,
        {
          method: 'PATCH',

          authenticated: true,

          body: formData,
        }
      );

    return response
      .data
      .remittance;
  };

/*
 * =========================================================
 * RIDER AVAILABILITY
 * =========================================================
 *
 * TRUE
 * Rider is online and may receive
 * delivery requests.
 *
 * FALSE
 * Rider is offline and should not
 * receive delivery requests.
 *
 * Backend prevents the Rider from
 * manually becoming available while
 * handling an active delivery.
 * =========================================================
 */

export const updateRiderAvailability =
  async (
    isAvailable: boolean
  ) => {
    const response =
      await apiRequest<RiderAvailabilityResponse>(
        '/riders/me/availability',
        {
          method: 'PATCH',

          authenticated: true,

          body:
            JSON.stringify({
              isAvailable,
            }),
        }
      );

    return response.data;
  };

  /*
 * =========================================================
 * SELLER
 * CREATE DELIVERY REQUEST
 * =========================================================
 *
 * POST
 * /api/v1/deliveries/orders/:orderId/request
 *
 * The order must already be:
 * ready_for_delivery
 *
 * This releases the delivery request so an
 * available Rider can see and accept it.
 * =========================================================
 */

export const createSellerDeliveryRequest =
  async (
    orderId: string
  ): Promise<Delivery> => {
    if (!orderId?.trim()) {
      throw new Error(
        'Order ID is required.'
      );
    }

    const response =
      await apiRequest<DeliveryResponse>(
        `/deliveries/orders/${encodeURIComponent(
          orderId.trim()
        )}/request`,
        {
          method: 'POST',
          authenticated: true,
        }
      );

    return response.data.delivery;
  };

/*
 * =========================================================
 * AVAILABLE DELIVERY MARKETPLACE
 * =========================================================
 */

export const getAvailableDeliveries =
  async () => {
    const response =
      await apiRequest<AvailableDeliveriesResponse>(
        '/deliveries/available',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * RIDER DELIVERY HISTORY / ACTIVE DELIVERY
 * =========================================================
 */

export const getRiderDeliveries =
  async (
    status?: DeliveryStatus
  ) => {
    const query =
      status
        ? `?status=${encodeURIComponent(
            status
          )}`
        : '';

    const response =
      await apiRequest<RiderDeliveriesResponse>(
        `/deliveries/rider/mine${query}`,
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data;
  };

  /*
 * =========================================================
 * CUSTOMER DELIVERY HISTORY / TRACKING DISCOVERY
 * =========================================================
 *
 * GET
 * /api/v1/deliveries/mine
 *
 * Returns every Delivery document belonging
 * to the authenticated Customer.
 *
 * This is used by the Customer mobile module
 * to connect an Order with its Delivery.
 * =========================================================
 */

export const getCustomerDeliveries =
  async () => {
    const response =
      await apiRequest<CustomerDeliveriesResponse>(
        '/deliveries/mine',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * GET ONE DELIVERY
 * =========================================================
 */

export const getDelivery =
  async (
    deliveryId: string
  ) => {
    const response =
      await apiRequest<DeliveryResponse>(
        `/deliveries/${deliveryId}`,
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data.delivery;
  };

/*
 * =========================================================
 * ACCEPT DELIVERY
 * =========================================================
 */

export const acceptDelivery =
  async (
    deliveryId: string
  ) => {
    const response =
      await apiRequest<DeliveryResponse>(
        `/deliveries/${deliveryId}/accept`,
        {
          method: 'PATCH',

          authenticated: true,
        }
      );

    return response.data.delivery;
  };

/*
 * =========================================================
 * PICK UP BOUQUET
 * =========================================================
 */

export const pickupDelivery =
  async (
    deliveryId: string,
    riderNotes?: string
  ) => {
    const response =
      await apiRequest<DeliveryResponse>(
        `/deliveries/${deliveryId}/pickup`,
        {
          method: 'PATCH',

          authenticated: true,

          body:
            JSON.stringify({
              riderNotes:
                riderNotes ||
                null,
            }),
        }
      );

    return response.data.delivery;
  };

/*
 * =========================================================
 * START DELIVERY
 * =========================================================
 */

export const startDelivery =
  async (
    deliveryId: string,
    riderNotes?: string
  ) => {
    const response =
      await apiRequest<DeliveryResponse>(
        `/deliveries/${deliveryId}/start`,
        {
          method: 'PATCH',

          authenticated: true,

          body:
            JSON.stringify({
              riderNotes:
                riderNotes ||
                null,
            }),
        }
      );

    return response.data.delivery;
  };

/*
 * =========================================================
 * PROOF OF DELIVERY IMAGE
 * =========================================================
 */

export type ProofOfDeliveryImage = {
  uri: string;

  name?: string;

  type?: string;
};

export type UploadProofOfDeliveryPayload = {
  image:
    ProofOfDeliveryImage;

  latitude?:
    | number
    | null;

  longitude?:
    | number
    | null;

  accuracy?:
    | number
    | null;
};

/*
 * =========================================================
 * UPLOAD PROOF OF DELIVERY
 * =========================================================
 *
 * Taking a local photo does not count
 * as successful Proof of Delivery.
 *
 * Only the Delivery returned after the
 * backend upload succeeds is trusted.
 * =========================================================
 */

export const uploadProofOfDelivery =
  async (
    deliveryId: string,
    payload:
      UploadProofOfDeliveryPayload
  ) => {
    if (
      !deliveryId?.trim()
    ) {
      throw new Error(
        'Delivery ID is required.'
      );
    }

    const imageUri =
      payload.image.uri?.trim();

    if (!imageUri) {
      throw new Error(
        'Proof of delivery image is required.'
      );
    }

    /*
     * =========================================================
     * FORM DATA
     * =========================================================
     */

    const formData =
      new FormData();

    /*
     * =========================================================
     * FILE
     * =========================================================
     *
     * Expo SDK 57 uses Expo's WinterCG-compatible fetch.
     *
     * The old React Native pattern:
     *
     * {
     *   uri,
     *   name,
     *   type
     * }
     *
     * can cause:
     *
     * Unsupported FormDataPart implementation
     *
     * Create a real Expo File instead.
     * =========================================================
     */

    const proofFile =
      new File(
        imageUri
      );

    formData.append(
      'proofImage',
      proofFile
    );

    /*
     * =========================================================
     * OPTIONAL LOCATION
     * =========================================================
     */

    if (
      typeof payload.latitude ===
      'number'
    ) {
      formData.append(
        'latitude',
        String(
          payload.latitude
        )
      );
    }

    if (
      typeof payload.longitude ===
      'number'
    ) {
      formData.append(
        'longitude',
        String(
          payload.longitude
        )
      );
    }

    if (
      typeof payload.accuracy ===
      'number'
    ) {
      formData.append(
        'accuracy',
        String(
          payload.accuracy
        )
      );
    }

    /*
     * =========================================================
     * REQUEST
     * =========================================================
     *
     * Do NOT manually set:
     *
     * Content-Type: multipart/form-data
     *
     * Expo fetch will create the multipart boundary.
     * =========================================================
     */

    const response =
      await apiRequest<DeliveryResponse>(
        `/deliveries/${deliveryId}/proof`,
        {
          method: 'POST',

          authenticated: true,

          body: formData,
        }
      );

    return response
      .data
      .delivery;
  };
  
/*
 * =========================================================
 * COMPLETE DELIVERY
 * =========================================================
 *
 * Backend remains the authority.
 *
 * Delivery completion without a
 * successfully uploaded POD must be
 * rejected by the backend.
 * =========================================================
 */

export const completeDelivery =
  async (
    deliveryId: string,
    riderNotes?: string
  ) => {
    const response =
      await apiRequest<DeliveryResponse>(
        `/deliveries/${deliveryId}/delivered`,
        {
          method: 'PATCH',

          authenticated: true,

          body:
            JSON.stringify({
              riderNotes:
                riderNotes ||
                null,
            }),
        }
      );

    return response.data.delivery;
  };

/*
 * =========================================================
 * RIDER LOCATION PAYLOAD
 * =========================================================
 */

export type RiderLocationPayload = {
  latitude: number;

  longitude: number;

  accuracy?:
    | number
    | null;
};

type RiderLocationResponse = {
  success: boolean;

  message: string;

  data: {
    delivery: Delivery;

    navigation?: {
      deliveryId?: string;

      status?:
        DeliveryStatus;

      riderLocation?:
        RiderLocation;

      pickupLocation?:
        Coordinates;

      deliveryLocation?:
        Coordinates;

      navigation?:
        NavigationData;

      geometry?: {
        type: string;

        coordinates:
          number[][];
      } | null;
    };
  };
};

/*
 * =========================================================
 * UPDATE LIVE GPS LOCATION
 * =========================================================
 */

export const updateRiderLocation =
  async (
    deliveryId: string,
    payload:
      RiderLocationPayload
  ) => {
    const response =
      await apiRequest<RiderLocationResponse>(
        `/deliveries/${deliveryId}/location`,
        {
          method: 'PATCH',

          authenticated: true,

          body:
            JSON.stringify({
              latitude:
                payload.latitude,

              longitude:
                payload.longitude,

              accuracy:
                payload.accuracy ??
                null,
            }),
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * ROUTE GEOMETRY
 * =========================================================
 */

export type RouteGeometry = {
  type: string;

  coordinates: number[][];
};

export type RiderNavigationResponse = {
  deliveryId: string;

  status:
    DeliveryStatus;

  riderLocation:
    | RiderLocation
    | null;

  pickupLocation:
    | Coordinates
    | null;

  deliveryLocation:
    | Coordinates
    | null;

  navigation:
    | NavigationData
    | null;

  geometry:
    | RouteGeometry
    | null;
};

type NavigationResponse = {
  success: boolean;

  message: string;

  data: {
    navigation:
      RiderNavigationResponse;
  };
};

/*
 * =========================================================
 * GET CURRENT RIDER NAVIGATION
 * =========================================================
 */

export const getRiderNavigation =
  async (
    deliveryId: string
  ) => {
    const response =
      await apiRequest<NavigationResponse>(
        `/deliveries/${deliveryId}/navigation`,
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response
      .data
      .navigation;
  };

/*
 * =========================================================
 * CUSTOMER / SELLER / RIDER
 * DELIVERY TRACKING
 * =========================================================
 */

type TrackingResponse = {
  success: boolean;

  message: string;

  data: {
    delivery: Delivery;
  };
};

export const getDeliveryTracking =
  async (
    deliveryId: string
  ) => {
    const response =
      await apiRequest<TrackingResponse>(
        `/deliveries/${deliveryId}/tracking`,
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data.delivery;
  };
/*
 * =========================================================
 * RIDER WORK SHIFTS
 * =========================================================
 *
 * Admin posts work shifts with a slot limit.
 * Riders request a slot; Admin approves or
 * rejects. A Rider may only go Online and
 * accept NEW deliveries during an approved
 * shift. An active delivery can still be
 * finished after the shift ends.
 * =========================================================
 */

export type RiderShiftReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type RiderShiftStatus =
  | 'open'
  | 'closed'
  | 'cancelled';

export type RiderShiftTimeStatus =
  | 'upcoming'
  | 'active'
  | 'ended';

export type RiderShiftPerson = {
  _id: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phoneNumber?: string;
};

export type RiderShiftReservation = {
  _id: string;

  rider: string;

  /*
   * Populated with name/contact on Admin
   * endpoints; an id string on Rider
   * endpoints.
   */

  riderUser:
    | string
    | RiderShiftPerson;

  status:
    RiderShiftReservationStatus;

  requestedAt: string;

  reviewedAt:
    | string
    | null;

  reviewedBy:
    | string
    | RiderShiftPerson
    | null;
};

export type RiderShift = {
  _id: string;

  startAt: string;

  endAt: string;

  slotLimit: number;

  status: RiderShiftStatus;

  reservations:
    RiderShiftReservation[];

  approvedCount: number;

  remainingSlots: number;

  timeStatus:
    RiderShiftTimeStatus;

  /*
   * The current Rider's own reservation
   * (Rider endpoints only).
   */

  myReservation:
    | RiderShiftReservation
    | null;

  createdAt?: string;

  updatedAt?: string;
};

export type RiderWorkShiftStatus = {
  authorization:
    | 'active'
    | 'upcoming'
    | 'none';

  canGoOnline: boolean;

  canAcceptNewDeliveries: boolean;

  activeShift:
    | RiderShift
    | null;

  nextShift:
    | RiderShift
    | null;
};

type RiderShiftsResponse = {
  success: boolean;

  message: string;

  data: {
    shifts: RiderShift[];
  };
};

type RiderShiftResponse = {
  success: boolean;

  message: string;

  data: {
    shift: RiderShift;
  };
};

/*
 * GET /api/v1/riders/me/shifts/available
 */

export const getRiderAvailableShifts =
  async () => {
    const response =
      await apiRequest<RiderShiftsResponse>(
        '/riders/me/shifts/available',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response
      .data
      .shifts;
  };

/*
 * GET /api/v1/riders/me/shifts
 */

export const getRiderShiftHistory =
  async () => {
    const response =
      await apiRequest<RiderShiftsResponse>(
        '/riders/me/shifts',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response
      .data
      .shifts;
  };

/*
 * POST /api/v1/riders/me/shifts/:shiftId/request
 */

export const requestRiderShift =
  async (
    shiftId: string
  ) => {
    const response =
      await apiRequest<RiderShiftResponse>(
        `/riders/me/shifts/${encodeURIComponent(
          shiftId
        )}/request`,
        {
          method: 'POST',

          authenticated: true,
        }
      );

    return response
      .data
      .shift;
  };

/*
 * =========================================================
 * RIDER DELIVERY-FEE EARNINGS AND PAYOUTS
 * =========================================================
 *
 * GET /api/v1/riders/me/earnings
 * GET /api/v1/riders/me/payouts/:payoutId
 *
 * Earnings come only from Order.deliveryFee
 * of delivered orders. Admin pays Riders by
 * external bank transfer; FLOGRAM records the
 * reference number and proof. COD remittance
 * is a separate flow and is NOT income.
 * =========================================================
 */

export type RiderPayoutStatus =
  | 'pending'
  | 'paid'
  | 'cancelled';

export type RiderPayoutPerson = {
  _id: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phoneNumber?: string;
};

export type RiderPayoutItem = {
  deliveryId: string | null;

  orderId: string | null;

  /*
   * Populated on detail endpoints.
   */

  order:
    | string
    | {
        _id: string;

        productName?: string;

        deliveryFee?: number;

        orderStatus?: string;
      }
    | null;

  deliveryFee: number;

  deliveredAt:
    | string
    | null;
};

export type RiderPayout = {
  id: string;

  riderUser:
    | string
    | RiderPayoutPerson
    | null;

  periodStart: string;

  periodEnd: string;

  deliveryCount: number;

  items: RiderPayoutItem[];

  totalAmount: number;

  status: RiderPayoutStatus;

  paymentMethod: string;

  referenceNumber: string;

  proofImageUrl:
    | string
    | null;

  paidAt:
    | string
    | null;

  paidBy:
    | string
    | RiderPayoutPerson
    | null;

  adminRemarks: string;

  cancelledAt:
    | string
    | null;

  cancellationReason: string;

  createdAt: string;

  updatedAt: string;
};

export type RiderEarningsData = {
  summary: {
    /*
     * Delivery fees earned today
     * (Philippine time).
     */

    today: number;

    totalEarned: number;

    /*
     * Current payout period: earned but not
     * yet included in any payout.
     */

    unpaid: number;

    /*
     * Included in a payout that Admin has
     * not marked as paid yet.
     */

    pendingPayout: number;

    paid: number;
  };

  payouts: RiderPayout[];
};

type RiderEarningsResponse = {
  success: boolean;

  message: string;

  data: RiderEarningsData;
};

type RiderPayoutResponse = {
  success: boolean;

  message: string;

  data: {
    payout: RiderPayout;
  };
};

export const getRiderEarnings =
  async () => {
    const response =
      await apiRequest<RiderEarningsResponse>(
        '/riders/me/earnings',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response.data;
  };

export const getRiderPayout =
  async (
    payoutId: string
  ) => {
    const response =
      await apiRequest<RiderPayoutResponse>(
        `/riders/me/payouts/${encodeURIComponent(
          payoutId
        )}`,
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response
      .data
      .payout;
  };

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

/*
 * Today's completed delivery count from the
 * dashboard's Monday-Sunday weekly series,
 * using Philippine time (UTC+8).
 */

export const getTodayDeliveryCount = (
  dashboard: Pick<
    RiderDashboardData,
    'weeklyDeliveries'
  >
) => {
  const phNow =
    new Date(
      Date.now() +
        8 * 60 * 60 * 1000
    );

  const mondayFirstIndex =
    (phNow.getUTCDay() + 6) % 7;

  return (
    dashboard
      .weeklyDeliveries?.[
        mondayFirstIndex
      ]?.value ?? 0
  );
};

/*
 * =========================================================
 * RIDER PROFILE
 * =========================================================
 *
 * GET /api/v1/riders/profile
 * =========================================================
 */

export type RiderProfile = {
  _id: string;

  owner: {
    _id: string;

    firstName: string;

    lastName: string;

    email: string;

    phoneNumber?: string;
  };

  address?: {
    street?: string;

    barangay?: string;

    city?: string;

    province?: string;

    postalCode?: string;
  };

  vehicleType?: string;

  vehiclePlateNumber?: string;

  driverLicenseNumber?: string;

  emergencyContactName?: string;

  emergencyContactNumber?: string;

  verificationStatus?: string;

  verifiedAt?: string | null;

  isAvailable?: boolean;

  isActive?: boolean;

  createdAt?: string;
};

type RiderProfileResponse = {
  success: boolean;

  message: string;

  data: {
    rider: RiderProfile;
  };
};

export const getMyRiderProfile =
  async () => {
    const response =
      await apiRequest<RiderProfileResponse>(
        '/riders/profile',
        {
          method: 'GET',

          authenticated: true,
        }
      );

    return response
      .data
      .rider;
  };
