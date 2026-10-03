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

  const response = {
    success: false,
    message: error.message || "Internal server error.",
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;