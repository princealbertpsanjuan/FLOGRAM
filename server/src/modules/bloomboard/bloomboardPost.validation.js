import {
  body,
  validationResult,
} from "express-validator";

export const createBloomboardPostValidation =
  [
    body("caption")
      .optional({
        checkFalsy: true,
      })
      .isString()
      .withMessage(
        "Caption must be a string."
      )
      .trim()
      .isLength({
        max: 2000,
      })
      .withMessage(
        "Caption cannot exceed 2000 characters."
      ),

    body("taggedFlorist")
      .optional({ checkFalsy: true })
      .isMongoId()
      .withMessage("Tagged shop is invalid."),

    body("shopRating")
      .optional({ checkFalsy: true })
      .isInt({ min: 1, max: 5 })
      .withMessage("Shop rating must be 1 to 5 stars.")
      .toInt(),

    body("postType")
      .optional()
      .isIn([
        "general",
        "bouquet_inspiration",
      ])
      .withMessage(
        "Post type must be either general or bouquet_inspiration."
      ),
  ];

export const createBloomboardCommentValidation =
  [
    body("content")
      .trim()
      .notEmpty()
      .withMessage(
        "Comment content is required."
      )
      .isLength({
        max: 1000,
      })
      .withMessage(
        "Comment cannot exceed 1000 characters."
      ),
  ];

export const validateBloomboardPostRequest =
  (
    req,
    res,
    next
  ) => {
    const errors =
      validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message:
          "BloomBoard validation failed.",
        errors:
          errors.array().map(
            (error) => ({
              field:
                error.path,
              message:
                error.msg,
            })
          ),
      });
    }

    next();
  };