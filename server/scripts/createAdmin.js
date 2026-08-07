import "dotenv/config";
import mongoose from "mongoose";

import User from "../src/modules/auth/auth.model.js";
import connectDatabase from "../src/config/database.js";

const createAdmin = async () => {
  try {
    await connectDatabase();

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be defined in the .env file."
      );
    }

    const existingAdmin = await User.findOne({
      email: adminEmail.toLowerCase().trim(),
    });

    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const admin = await User.create({
      firstName: "FLOGRAM",
      lastName: "Administrator",
      email: adminEmail.toLowerCase().trim(),
      phoneNumber: "09170000000",
      password: adminPassword,
      role: "admin",
      accountStatus: "active",
      verificationStatus: "not_required",
    });

    console.log("✅ Admin account created successfully.");
    console.log(`Email: ${admin.email}`);
  } catch (error) {
    console.error(`❌ Failed to create admin: ${error.message}`);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createAdmin();