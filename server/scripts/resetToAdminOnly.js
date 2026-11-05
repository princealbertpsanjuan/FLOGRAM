/*
 * =========================================================
 * RESET DATABASE: KEEP ONLY ADMIN ACCOUNTS
 * =========================================================
 *
 * Removes ALL test data before real shops and riders join:
 * customers, sellers, riders, shops, bouquets, add-ons,
 * carts, orders, checkouts, deliveries, payouts,
 * remittances, shifts, reviews, BloomBoard, AI chats,
 * notifications, verifications, price history, disputes,
 * violations and follows.
 *
 * KEEPS:
 *  - every user whose role is "admin"
 *  - Admin settings (commission rate, etc.)
 *  - collection indexes (only documents are removed)
 *
 * SAFE BY DEFAULT: without --confirm it only PRINTS what it
 * would delete. Nothing is changed.
 *
 * Usage (from the server folder, .env with MONGODB_URI):
 *   node scripts/resetToAdminOnly.js            (preview)
 *   node scripts/resetToAdminOnly.js --confirm  (delete)
 *
 * TAKE A BACKUP FIRST (mongodump). This cannot be undone.
 * =========================================================
 */

import "dotenv/config";

import readline from "readline/promises";

import mongoose from "mongoose";

const KEEP_COLLECTIONS = new Set(["adminsettings"]);
const USERS_COLLECTION = "users";

const confirm = process.argv.includes("--confirm");
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("MONGODB_URI is not set. Run this from the server folder with your .env file.");
  process.exit(1);
}

const hostOf = (value) => {
  try {
    return new URL(value.replace(/^mongodb(\+srv)?:/, "http:")).host;
  } catch {
    return "(unknown host)";
  }
};

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

const db = mongoose.connection.db;

try {
  console.log(`\nDatabase: ${db.databaseName} on ${hostOf(uri)}`);
  console.log(confirm ? "Mode: DELETE\n" : "Mode: PREVIEW (nothing will be deleted)\n");

  /*
   * Guard: refuse to touch a database that is not FLOGRAM's
   * (e.g. another project's cluster in a copied .env).
   */
  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name)
  );
  const missing = ["users", "florists", "flowers"].filter((name) => !existing.has(name));

  if (missing.length) {
    console.error(
      `This does not look like the FLOGRAM database (missing: ${missing.join(", ")}). ` +
        "Check MONGODB_URI in server/.env: copy it from Render → flogram-api → Environment."
    );
    process.exit(1);
  }

  const users = db.collection(USERS_COLLECTION);
  const admins = await users
    .find({ role: "admin" }, { projection: { email: 1, firstName: 1, lastName: 1 } })
    .toArray();

  if (admins.length === 0) {
    console.error("No admin account found. Refusing to continue, or nobody could log in afterwards.");
    process.exitCode = 1;
  } else {
    console.log("Admin accounts that will be KEPT:");
    admins.forEach((admin) => console.log(`  - ${admin.firstName || ""} ${admin.lastName || ""} <${admin.email}>`));

    const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((item) => item.name)
      .filter((name) => !name.startsWith("system."))
      .sort();

    const plan = [];

    for (const name of collections) {
      if (KEEP_COLLECTIONS.has(name)) {
        plan.push({ name, filter: null, count: await db.collection(name).countDocuments(), keep: true });
      } else if (name === USERS_COLLECTION) {
        const filter = { role: { $ne: "admin" } };
        plan.push({ name, filter, count: await users.countDocuments(filter) });
      } else {
        plan.push({ name, filter: {}, count: await db.collection(name).countDocuments() });
      }
    }

    console.log("\nCollection                     Documents  Action");
    plan.forEach((item) =>
      console.log(
        `  ${item.name.padEnd(28)} ${String(item.count).padStart(9)}  ${
          item.keep ? "keep" : item.name === USERS_COLLECTION ? "delete non-admin users" : "delete all"
        }`
      )
    );

    const total = plan.filter((item) => !item.keep).reduce((sum, item) => sum + item.count, 0);
    console.log(`\nDocuments to delete: ${total}`);

    if (!confirm) {
      console.log("\nPreview only. Run again with --confirm to delete.");
    } else {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`\nType the database name "${db.databaseName}" to delete ${total} documents: `);
      rl.close();

      if (answer.trim() !== db.databaseName) {
        console.log("Name did not match. Nothing was deleted.");
      } else {
        for (const item of plan) {
          if (item.keep || item.count === 0) continue;

          // Native driver: skips Mongoose hooks (e.g. append-only price history)
          const result = await db.collection(item.name).deleteMany(item.filter);
          console.log(`  ${item.name}: deleted ${result.deletedCount}`);
        }

        // Admin accounts: clear any half-finished password reset
        await users.updateMany(
          { role: "admin" },
          { $unset: { passwordResetCode: "", passwordResetCodeExpiresAt: "", passwordResetVerified: "", passwordResetAttempts: "" } }
        );

        console.log("\nDone. Only admin accounts and Admin settings remain.");
      }
    }
  }
} finally {
  await mongoose.disconnect();
}
