const errorHandler = (error, req, res, next) => {
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