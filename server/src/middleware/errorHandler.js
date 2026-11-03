const errorHandler = (error, req, res, next) => {
  /*
   * Multer upload errors (file too large, too many files,
   * unexpected field) are user errors, not server errors.
   */
  if (error?.name === "MulterError") {
    error.statusCode = 400;

    if (error.code === "LIMIT_FILE_SIZE") {
      error.message = "The photo is too large. Please choose an image under 10 MB.";
    }
  }

  const statusCode =
    error.statusCode ||
    (res.statusCode !== 200 ? res.statusCode : 500);

  /*
   * Mongoose errors caused by bad input are 400s, not 500s.
   */
  let resolvedStatus = statusCode;
  let message = error.message || "Internal server error.";

  if (!error.statusCode && error?.name === "CastError") {
    resolvedStatus = 400;
    message = `Invalid ${error.path || "value"}.`;
  } else if (!error.statusCode && error?.name === "ValidationError") {
    resolvedStatus = 422;
    message = Object.values(error.errors || {})
      .map((item) => item.message)
      .join(" ") || "Validation failed.";
  } else if (!error.statusCode && error?.code === 11000) {
    resolvedStatus = 409;
    message = "This record already exists.";
  } else if (error instanceof SyntaxError && error.type === "entity.parse.failed") {
    resolvedStatus = 400;
    message = "The request body is not valid JSON.";
  }

  /*
   * Unexpected crashes: log the details on the server and
   * send a generic message, so database or library internals
   * are never shown to users.
   */
  if (resolvedStatus >= 500 && !error.statusCode) {
    console.error(`[${req.method} ${req.originalUrl}]`, error);

    if (process.env.NODE_ENV === "production") {
      message = "Something went wrong on the server. Please try again.";
    }
  }

  const response = {
    success: false,
    message,
  };

  /*
   * Field-level problems (e.g. requirement checks) so the
   * app can show exactly what to fix.
   */
  if (Array.isArray(error.errors)) {
    response.errors = error.errors;
  }

  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(resolvedStatus).json(response);
};

export default errorHandler;