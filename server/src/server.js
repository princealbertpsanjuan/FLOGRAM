import "dotenv/config";

import app from "./app.js";
import connectDatabase, { disconnectDatabase } from "./config/database.js";
import { autoCompleteDeliveredOrders } from "./modules/orders/order-auto-complete.js";
import { expireUnpaidOnlineOrders } from "./modules/orders/order-payment-expiry.js";

const PORT = process.env.PORT || 5000;

/*
 * Required settings: stop with a clear message instead of
 * failing later on the first login.
 */
const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET"];

/*
 * Optional settings: the feature that needs each one is
 * reported at startup so a missing key is easy to spot.
 */
const OPTIONAL_ENV = {
  PUBLIC_BASE_URL: "PayMongo return pages",
  PAYMONGO_SECRET_KEY: "online payment (PayMongo)",
  PAYMONGO_WEBHOOK_SECRET: "PayMongo webhooks",
  OPENROUTESERVICE_API_KEY: "road-distance delivery fees (falls back to an estimate)",
  CLOUDINARY_URL: "permanent photo storage on Render",
  AI_SERVICE_URL: "image search",
  XAI_API_KEY: "AI assistant and bouquet images",
};

const checkEnvironment = () => {
  const missing = REQUIRED_ENV.filter((name) => !String(process.env[name] || "").trim());

  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(", ")} (see server/.env.example).`);
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && String(process.env.JWT_SECRET).length < 32) {
    console.warn("JWT_SECRET is shorter than 32 characters; use a long random value in production.");
  }

  Object.entries(OPTIONAL_ENV).forEach(([name, feature]) => {
    if (!process.env[name] && !(name === "CLOUDINARY_URL" && process.env.CLOUDINARY_CLOUD_NAME)) {
      console.warn(`${name} is not set: ${feature} will not work.`);
    }
  });
};

const startServer = async () => {
  try {
    console.log("Starting FLOGRAM backend...");

    checkEnvironment();

    await connectDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
      // Force exit if connections do not close in time
      setTimeout(() => process.exit(0), 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    /*
     * Complete delivered orders the customer forgot to
     * confirm (24 h after delivery). Every 15 minutes.
     */
    void autoCompleteDeliveredOrders();
    setInterval(() => void autoCompleteDeliveredOrders(), 15 * 60 * 1000).unref();

    /*
     * Cancel online-payment orders that were never paid
     * (not placed; "Payment not completed"). Every 5 minutes.
     */
    void expireUnpaidOnlineOrders();
    setInterval(() => void expireUnpaidOnlineOrders(), 5 * 60 * 1000).unref();
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();