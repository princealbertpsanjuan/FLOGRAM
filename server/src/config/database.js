import mongoose from "mongoose";

/*
 * Connect once at startup. serverSelectionTimeoutMS makes a
 * wrong URI / blocked Atlas IP fail in 15 s with a clear
 * message instead of hanging every request.
 */
const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MongoDB connection failed: MONGODB_URI is not set (see server/.env.example).");
    process.exit(1);
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    if (/whitelist|IP|ENOTFOUND|timed out|Server selection/i.test(error.message)) {
      console.error(
        "Check MongoDB Atlas → Network Access: allow 0.0.0.0/0 (Render) or your current IP (local)."
      );
    }

    process.exit(1);
  }
};

/*
 * Close the connection when Render stops or restarts the
 * service, so in-flight writes finish cleanly.
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error(`MongoDB disconnect failed: ${error.message}`);
  }
};

export default connectDatabase;
