export const getHealthStatus = (req, res) => {
  res.status(200).json({
    success: true,
    message: "FLOGRAM API is healthy.",
    data: {
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
};