import {
  acceptCustomBouquetQuote,
  acceptCustomBouquetRequest,
  cancelCustomBouquetRequest,
  createCustomBouquetRequest,
  declineCustomBouquetQuote,
  getCustomerCustomBouquetRequests,
  getCustomBouquetRequestById,
  getSellerCustomBouquetRequests,
  quoteCustomBouquetRequest,
  rejectCustomBouquetRequest,
} from "./customBouquetRequest.service.js";

/*
 * CUSTOMER
 * Create a custom bouquet request
 * and send it to a florist.
 */
export const create = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await createCustomBouquetRequest(
        req.user.userId,
        req.body
      );

    res.status(201).json({
      success: true,
      message:
        "Custom bouquet request created successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * CUSTOMER
 * Get current customer's own
 * custom bouquet requests.
 */
export const getMine = async (
  req,
  res,
  next
) => {
  try {
    const requests =
      await getCustomerCustomBouquetRequests(
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet requests retrieved successfully.",
      data: {
        count:
          requests.length,

        requests,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * SELLER
 * Get custom bouquet requests sent
 * to the seller's own florist shop.
 */
export const getForSeller = async (
  req,
  res,
  next
) => {
  try {
    const filters = {
      status:
        req.query.status,
    };

    const requests =
      await getSellerCustomBouquetRequests(
        req.user.userId,
        filters
      );

    res.status(200).json({
      success: true,
      message:
        "Florist custom bouquet requests retrieved successfully.",
      data: {
        count:
          requests.length,

        requests,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * CUSTOMER / SELLER
 * Get one custom bouquet request.
 */
export const getOne = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await getCustomBouquetRequestById(
        req.params.requestId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet request retrieved successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * SELLER
 * Accept a pending custom bouquet
 * request.
 */
export const accept = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await acceptCustomBouquetRequest(
        req.params.requestId,
        req.user.userId,
        req.body.sellerResponse
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet request accepted successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * SELLER
 * Reject a pending custom bouquet
 * request.
 */
export const reject = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await rejectCustomBouquetRequest(
        req.params.requestId,
        req.user.userId,
        req.body.sellerResponse
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet request rejected successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * SELLER
 * Send a price quote.
 */
export const quote = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await quoteCustomBouquetRequest(
        req.params.requestId,
        req.user.userId,
        {
          quotedPrice:
            req.body.quotedPrice,

          sellerResponse:
            req.body.sellerResponse,
        }
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet quote sent successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * CUSTOMER
 * Accept seller quotation.
 */
export const acceptQuote = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await acceptCustomBouquetQuote(
        req.params.requestId,
        req.user.userId,
        req.body
          .customerDecisionMessage
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet quote accepted successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * CUSTOMER
 * Decline seller quotation.
 */
export const declineQuote = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await declineCustomBouquetQuote(
        req.params.requestId,
        req.user.userId,
        req.body
          .customerDecisionMessage
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet quote declined successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * CUSTOMER
 * Cancel own pending or accepted
 * custom bouquet request.
 */
export const cancel = async (
  req,
  res,
  next
) => {
  try {
    const request =
      await cancelCustomBouquetRequest(
        req.params.requestId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Custom bouquet request cancelled successfully.",
      data: {
        request,
      },
    });
  } catch (error) {
    next(error);
  }
};