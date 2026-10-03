/*
 * =========================================================
 * VERIFY RIDER SHIFT RULES (integration test)
 * =========================================================
 *
 * Runs the real service functions against a TEST database
 * and checks the Rider work-shift rules:
 *
 *  1. Concurrent approvals never exceed the slot limit
 *  2. A Rider cannot reserve the same shift twice
 *     (even with simultaneous taps)
 *  3. A Rider cannot go Online without an active
 *     approved shift
 *  4. A Rider can go Online during an approved shift
 *  5. Going Offline keeps the approved shift slot
 *  6. After the shift ends the Rider is no longer
 *     authorized to go Online
 *
 * Usage (never point this at your real database):
 *
 *   TEST_MONGODB_URI="mongodb://127.0.0.1:27017/flogram_test" \
 *     npm run verify:shifts
 *
 * The script deletes only the documents it creates.
 * =========================================================
 */

import mongoose from "mongoose";

import User from "../src/modules/auth/auth.model.js";
import Rider from "../src/modules/riders/rider.model.js";
import RiderShift from "../src/modules/riders/rider-shift.model.js";

import {
  createRiderShift,
  getRiderWorkShiftStatus,
  requestRiderShift,
  reviewRiderShiftRequest,
} from "../src/modules/riders/rider-shift.service.js";

import { updateRiderAvailability } from "../src/modules/riders/rider.service.js";

const uri = process.env.TEST_MONGODB_URI;

if (!uri) {
  console.error(
    "Set TEST_MONGODB_URI to a throwaway test database. Refusing to run against MONGODB_URI."
  );
  process.exit(1);
}

const RUN = `shifttest${Date.now()}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let failures = 0;
const check = (name, condition, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!condition) failures += 1;
};

const expectError = async (promise) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
};

const createdUsers = [];
const createdRiders = [];
const createdShifts = [];

const makeRider = async (index) => {
  const user = await User.create({
    firstName: "Test",
    lastName: `Rider${index}`,
    email: `${RUN}.rider${index}@example.com`,
    phoneNumber: `0917${String(1000000 + index).slice(-7)}`,
    password: "TestPassword123!",
    role: "rider",
    accountStatus: "active",
    verificationStatus: "approved",
  });
  createdUsers.push(user._id);

  const rider = await Rider.create({
    owner: user._id,
    address: { street: "1 Test St", barangay: "Test", city: "Naga", province: "Camarines Sur" },
    vehicleType: "motorcycle",
    driverLicenseNumber: `DL-${RUN}-${index}`,
    emergencyContactName: "Test Contact",
    emergencyContactNumber: "09170000000",
    verificationStatus: "approved",
    isActive: true,
    isAvailable: false,
  });
  createdRiders.push(rider._id);

  return { user, rider };
};

const main = async () => {
  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}\n`);

  const admin = await User.create({
    firstName: "Test",
    lastName: "Admin",
    email: `${RUN}.admin@example.com`,
    phoneNumber: "09179999999",
    password: "TestPassword123!",
    role: "admin",
  });
  createdUsers.push(admin._id);

  const riders = await Promise.all([1, 2, 3, 4, 5].map(makeRider));

  /*
   * ---------------------------------------------------
   * 1. Concurrent approvals vs slot limit
   * ---------------------------------------------------
   */
  const future = await createRiderShift(
    {
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      endAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
      slotLimit: 2,
    },
    admin._id
  );
  createdShifts.push(future._id);

  for (const { user } of riders) {
    await requestRiderShift(future._id, user._id);
  }

  const pending = (await RiderShift.findById(future._id)).reservations;

  await Promise.allSettled(
    pending.map((reservation) =>
      reviewRiderShiftRequest(future._id, reservation._id, "approved", admin._id)
    )
  );

  const afterApprovals = await RiderShift.findById(future._id);
  const approvedCount = afterApprovals.reservations.filter((r) => r.status === "approved").length;
  check("5 simultaneous approvals on a 2-slot shift", approvedCount === 2, `approved=${approvedCount}`);

  /*
   * ---------------------------------------------------
   * 2. Same Rider, same shift, simultaneous requests
   * ---------------------------------------------------
   */
  const second = await createRiderShift(
    {
      startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      slotLimit: 3,
    },
    admin._id
  );
  createdShifts.push(second._id);

  await Promise.allSettled(
    Array.from({ length: 6 }, () => requestRiderShift(second._id, riders[0].user._id))
  );

  const afterDouble = await RiderShift.findById(second._id);
  check(
    "6 simultaneous requests from one Rider create one reservation",
    afterDouble.reservations.length === 1,
    `reservations=${afterDouble.reservations.length}`
  );

  /*
   * ---------------------------------------------------
   * 3. Online without an active approved shift
   * ---------------------------------------------------
   */
  const noShiftError = await expectError(updateRiderAvailability(riders[4].user._id, true));
  check(
    "Rider without an active approved shift cannot go Online",
    noShiftError?.statusCode === 403,
    noShiftError?.message
  );

  /*
   * ---------------------------------------------------
   * 4–6. Short live shift: online, offline, expiry
   * ---------------------------------------------------
   */
  const live = await createRiderShift(
    {
      startAt: new Date(Date.now() + 3000),
      endAt: new Date(Date.now() + 9000),
      slotLimit: 1,
    },
    admin._id
  );
  createdShifts.push(live._id);

  const requested = await requestRiderShift(live._id, riders[1].user._id);
  await reviewRiderShiftRequest(live._id, requested.myReservation._id, "approved", admin._id);

  await sleep(3500);

  const online = await expectError(updateRiderAvailability(riders[1].user._id, true));
  check("Rider can go Online during the approved shift", online === null, online?.message);

  await updateRiderAvailability(riders[1].user._id, false);
  const statusAfterOffline = await getRiderWorkShiftStatus(riders[1].rider._id);
  const liveDoc = await RiderShift.findById(live._id);
  check(
    "Going Offline keeps the approved shift slot",
    statusAfterOffline.authorization === "active" &&
      liveDoc.reservations[0].status === "approved",
    `authorization=${statusAfterOffline.authorization}`
  );

  await sleep(6000);

  const afterEnd = await getRiderWorkShiftStatus(riders[1].rider._id);
  const lateOnline = await expectError(updateRiderAvailability(riders[1].user._id, true));
  check(
    "After the shift ends the Rider cannot go Online",
    afterEnd.authorization !== "active" && lateOnline?.statusCode === 403,
    `authorization=${afterEnd.authorization}`
  );

  console.log(
    "\nNote: finishing an active delivery after the shift ends is allowed because" +
      " pickup / start / proof / delivered do not check the shift (see delivery.service.js)."
  );
};

main()
  .catch((error) => {
    console.error("Verification crashed:", error);
    failures += 1;
  })
  .finally(async () => {
    try {
      await RiderShift.deleteMany({ _id: { $in: createdShifts } });
      await Rider.deleteMany({ _id: { $in: createdRiders } });
      await User.deleteMany({ _id: { $in: createdUsers } });
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError.message);
    }

    await mongoose.disconnect();

    console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll shift checks passed.");
    process.exit(failures ? 1 : 0);
  });
