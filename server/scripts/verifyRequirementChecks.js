/*
 * =========================================================
 * REQUIREMENT CHECKS — SELF TEST
 * =========================================================
 *
 * npm run verify:requirements
 *
 * Builds small fake files (real PNG/JPEG/PDF headers, a
 * renamed text file, a tiny image, duplicates) and checks
 * that the automated verification rules pass, warn or fail
 * as expected. No database is needed.
 * =========================================================
 */

import assert from "assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  detectFileType,
  evaluateRequirements,
  inspectFile,
  isValidDti,
  isValidTin,
} from "../src/modules/verification/requirement-checks.js";

const png = (width, height, padding = 20000, seed = 0) => {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4, "ascii");
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  return Buffer.concat([header, ihdr, Buffer.alloc(padding, seed)]);
};

const jpeg = (width, height, seed = 1) => {
  const sof = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
  ]);
  return Buffer.concat([sof, Buffer.alloc(20000, seed)]);
};

const pdf = (seed = 2) => Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(20000, seed)]);

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "flogram-checks-"));

const write = async (name, buffer) => {
  const filePath = path.join(directory, name);
  await fs.writeFile(filePath, buffer);
  return inspectFile({ path: filePath });
};

const future = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const recent = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const old = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10);

let passed = 0;
const test = async (name, fn) => {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

try {
  const goodSeller = {
    validId: await write("id.png", png(1200, 800, 20000, 1)),
    dtiRegistration: await write("dti.jpg", jpeg(1500, 1000, 2)),
    birDocument: await write("bir.pdf", pdf(3)),
    bankProof: await write("bank.png", png(1000, 1000, 20000, 4)),
    shopLogo: await write("logo.png", png(400, 400, 3000, 5)),
  };

  const sellerDetails = {
    dtiNumber: "BN-1234567",
    tinNumber: "123-456-789-000",
    validIdType: "Passport",
    validIdExpiry: future,
  };

  await test("detects real file types", async () => {
    assert.equal(detectFileType(png(10, 10)), "png");
    assert.equal(detectFileType(jpeg(10, 10)), "jpeg");
    assert.equal(detectFileType(pdf()), "pdf");
    assert.equal(detectFileType(Buffer.from("hello, this is not an image")), null);
  });

  await test("reads image dimensions", async () => {
    assert.equal(goodSeller.validId.width, 1200);
    assert.equal(goodSeller.dtiRegistration.height, 1000);
  });

  await test("validates DTI and TIN formats", async () => {
    assert.ok(isValidDti("1234567"));
    assert.ok(isValidDti("BN 3456789"));
    assert.ok(!isValidDti("12AB"));
    assert.ok(isValidTin("123456789"));
    assert.ok(isValidTin("123-456-789-00000"));
    assert.ok(!isValidTin("12-34"));
  });

  await test("a correct seller submission passes with low risk", async () => {
    const result = evaluateRequirements({ role: "seller", fingerprints: goodSeller, details: sellerDetails });
    assert.equal(result.failures.length, 0, JSON.stringify(result.failures));
    assert.equal(result.riskLevel, "low");
  });

  await test("a renamed non-image file fails", async () => {
    const fake = await write("fake.jpg", Buffer.alloc(30000, 65));
    const result = evaluateRequirements({
      role: "seller",
      fingerprints: { ...goodSeller, validId: fake },
      details: sellerDetails,
    });
    assert.ok(result.failures.some((check) => check.documentKey === "validId"));
  });

  await test("an unreadable tiny image fails, a small one warns", async () => {
    const tiny = await write("tiny.png", png(120, 90, 20000, 6));
    const small = await write("small.png", png(500, 400, 20000, 7));
    const failing = evaluateRequirements({ role: "seller", fingerprints: { ...goodSeller, bankProof: tiny }, details: sellerDetails });
    const warning = evaluateRequirements({ role: "seller", fingerprints: { ...goodSeller, bankProof: small }, details: sellerDetails });
    assert.ok(failing.failures.some((check) => check.documentKey === "bankProof"));
    assert.equal(warning.failures.length, 0);
    assert.equal(warning.riskLevel, "medium");
  });

  await test("the same photo for two requirements fails", async () => {
    const result = evaluateRequirements({
      role: "seller",
      fingerprints: { ...goodSeller, bankProof: goodSeller.validId },
      details: sellerDetails,
    });
    assert.ok(result.failures.some((check) => /Same file/.test(check.message)));
  });

  await test("a document reused by another account is high risk", async () => {
    const result = evaluateRequirements({
      role: "seller",
      fingerprints: goodSeller,
      details: sellerDetails,
      others: [{ sha256: goodSeller.validId.sha256, role: "seller" }],
    });
    assert.equal(result.failures.length, 0);
    assert.equal(result.riskLevel, "high");
  });

  await test("an expired ID and bad TIN fail", async () => {
    const result = evaluateRequirements({
      role: "seller",
      fingerprints: goodSeller,
      details: { ...sellerDetails, validIdExpiry: past, tinNumber: "99" },
    });
    assert.ok(result.failures.some((check) => check.label === "ID expiry date"));
    assert.ok(result.failures.some((check) => check.label === "BIR TIN"));
  });

  const rider = {
    driverLicense: await write("license.png", png(1200, 760, 20000, 8)),
    orcr: await write("orcr.jpg", jpeg(1600, 1200, 9)),
    policeClearance: await write("police.pdf", pdf(10)),
  };

  await test("a correct rider submission passes", async () => {
    const result = evaluateRequirements({
      role: "rider",
      fingerprints: rider,
      details: { licenseExpiry: future, policeClearanceIssuedAt: recent },
    });
    assert.equal(result.failures.length, 0, JSON.stringify(result.failures));
  });

  await test("an old police clearance and expired license fail", async () => {
    const result = evaluateRequirements({
      role: "rider",
      fingerprints: rider,
      details: { licenseExpiry: past, policeClearanceIssuedAt: old },
    });
    assert.equal(result.failures.length, 2);
  });

  console.log(`\nRequirement checks: ${passed} passed.`);
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
