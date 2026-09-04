import mongoose from "mongoose";

/*
 * =========================================================
 * CART ITEM
 * =========================================================
 *
 * A cart item only stores:
 *
 * - Flower listing reference
 * - Quantity
 * - Date added
 *
 * IMPORTANT:
 *
 * We intentionally DO NOT store:
 *
 * - Product price
 * - Florist
 * - Seller
 * - Product availability
 *
 * Those values must always come from the real Flower
 * document so the customer cannot use outdated or
 * manipulated cart information during checkout.
 * =========================================================
 */

const cartItemSchema =
  new mongoose.Schema(
    {
      flower: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Flower",

        required: true,
      },

      quantity: {
        type: Number,

        required: true,

        min: 1,

        default: 1,
      },

      addedAt: {
        type: Date,

        default:
          Date.now,
      },
    },
    {
      _id: true,
    }
  );

/*
 * =========================================================
 * CART
 * =========================================================
 *
 * One customer = one cart.
 *
 * Example:
 *
 * {
 *   customer: ObjectId,
 *
 *   items: [
 *     {
 *       flower: ObjectId,
 *       quantity: 2
 *     },
 *     {
 *       flower: ObjectId,
 *       quantity: 1
 *     }
 *   ]
 * }
 * =========================================================
 */

const cartSchema =
  new mongoose.Schema(
    {
      customer: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        unique: true,

        index: true,
      },

      items: {
        type: [cartItemSchema],

        default: [],
      },
    },
    {
      timestamps: true,

      versionKey: false,
    }
  );

/*
 * =========================================================
 * DUPLICATE FLOWER PROTECTION
 * =========================================================
 *
 * A flower should only appear once inside a customer's
 * cart.
 *
 * If the customer adds the same flower again, the service
 * should increase the existing item's quantity instead of
 * inserting another cart item.
 *
 * This validation provides an additional database-model
 * safety check.
 * =========================================================
 */

cartSchema.path(
  "items"
).validate({
  validator(items) {
    if (
      !Array.isArray(items)
    ) {
      return true;
    }

    const flowerIds =
      items
        .map((item) =>
          item?.flower
            ? String(
                item.flower
              )
            : null
        )
        .filter(Boolean);

    return (
      new Set(
        flowerIds
      ).size ===
      flowerIds.length
    );
  },

  message:
    "The same flower listing cannot appear more than once in the cart.",
});

/*
 * =========================================================
 * INDEXES
 * =========================================================
 */

/*
 * Customer lookup.
 *
 * customer already has:
 *
 * unique: true
 * index: true
 *
 * so MongoDB will maintain one cart per customer.
 */

/*
 * Useful when checking whether a particular flower is
 * already inside a customer's cart.
 */

cartSchema.index({
  "items.flower": 1,
});

/*
 * =========================================================
 * MODEL
 * =========================================================
 */

const Cart =
  mongoose.models.Cart ||
  mongoose.model(
    "Cart",
    cartSchema
  );

export default Cart;