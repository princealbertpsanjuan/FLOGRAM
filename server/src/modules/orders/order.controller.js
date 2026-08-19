import {
  cancelCustomerOrder,
  completeCustomerOrder,
  createOrder,
  getCustomerOrders,
  getOrderById,
  getSellerOrders,
  updateSellerOrderStatus,
} from "./order.service.js";

export const create = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await createOrder(
        req.user.userId,
        req.body
      );

    res.status(201).json({
      success:
        true,

      message:
        "Order created successfully.",

      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMine = async (
  req,
  res,
  next
) => {
  try {
    const orders =
      await getCustomerOrders(
        req.user.userId,
        {
          status:
            req.query.status,

          paymentStatus:
            req.query.paymentStatus,
        }
      );

    res.status(200).json({
      success:
        true,

      message:
        "Customer orders retrieved successfully.",

      data: {
        count:
          orders.length,

        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getForSeller =
  async (
    req,
    res,
    next
  ) => {
    try {
      const orders =
        await getSellerOrders(
          req.user.userId,
          {
            status:
              req.query.status,

            paymentStatus:
              req.query.paymentStatus,
          }
        );

      res.status(200).json({
        success:
          true,

        message:
          "Seller orders retrieved successfully.",

        data: {
          count:
            orders.length,

          orders,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const getOne = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await getOrderById(
        req.params.orderId,
        req.user.userId
      );

    res.status(200).json({
      success:
        true,

      message:
        "Order retrieved successfully.",

      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateStatus =
  async (
    req,
    res,
    next
  ) => {
    try {
      const order =
        await updateSellerOrderStatus(
          req.params.orderId,
          req.user.userId,
          req.body.status,
          req.body.sellerNotes
        );

      res.status(200).json({
        success:
          true,

        message:
          "Order status updated successfully.",

        data: {
          order,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const cancel = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await cancelCustomerOrder(
        req.params.orderId,
        req.user.userId,
        req.body.reason
      );

    res.status(200).json({
      success:
        true,

      message:
        "Order cancelled successfully.",

      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER
 * COMPLETE DELIVERED ORDER
 * =========================================================
 */
export const complete = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await completeCustomerOrder(
        req.params.orderId,
        req.user.userId
      );

    res.status(200).json({
      success:
        true,

      message:
        "Order completed successfully.",

      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
};