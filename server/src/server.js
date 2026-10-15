import "dotenv/config";

import app from "./app.js";
import connectDatabase from "./config/database.js";
import { autoCompleteDeliveredOrders } from "./modules/orders/order-auto-complete.js";
import { expireUnpaidOnlineOrders } from "./modules/orders/order-payment-expiry.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("Starting FLOGRAM backend...");

    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

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