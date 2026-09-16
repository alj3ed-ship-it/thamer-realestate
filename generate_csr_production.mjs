#!/usr/bin/env node
// Generates a NEW secp256k1 private key + ZATCA-compliant CSR for the REAL
// production onboarding (real VAT number, real EGS unit) — completely
// separate from zatca_sandbox_credentials.json used by the sandbox scripts.
// Requires OpenSSL (same as generate_csr.mjs).

import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { EGS } from "zatca-xml-js";

const OUTPUT_FILE = path.join(import.meta.dirname, "zatca_production_credentials.json");

// New, distinct UUID for the production EGS unit (never reuse the sandbox
// one — ZATCA treats each UUID as a separate device).
const EGS_UUID = "b3e9a3d2-8f1c-4e6a-9d3b-7a2c4f5e6d1a";

process.env.TEMP_FOLDER = os.tmpdir() + path.sep;

function ensureOpenSSLOnPath() {
  try {
    execSync("openssl version", { stdio: "ignore" });
    return;
  } catch {
    // fall through
  }
  const candidates = [
    "C:\\Program Files\\Git\\mingw64\\bin",
    "C:\\Program Files\\Git\\usr\\bin",
  ];
  for (const dir of candidates) {
    try {
      execSync(`"${path.join(dir, "openssl.exe")}" version`, { stdio: "ignore" });
      process.env.PATH = `${dir}${path.delimiter}${process.env.PATH}`;
      return;
    } catch {
      // try next
    }
  }
  throw new Error("OpenSSL executable not found. Install OpenSSL or add it to PATH.");
}

if (process.platform === "win32") ensureOpenSSLOnPath();

// ⚠️ عدّل هذي البيانات إذا احتجت — هذي بيانات الوالد الحقيقية المعروفة حاليًا
const egsUnit = {
  uuid: EGS_UUID,
  custom_id: "THAMER-PRODUCTION-EGS-1",
  model: "ThamerInvoicing",
  CRN_number: "1003352828",
  VAT_name: "سلمان عويض سلمان الجعيد",
  VAT_number: "3149277635000003",
  branch_name: "Main Branch",
  branch_industry: "Real Estate Rental Services",
  location: {
    city: "Makkah",
    city_subdivision: "Makkah",
    street: "شارع قلعة العلم",
    plot_identification: "0000",
    building: "7393",
    postal_zone: "24431",
  },
};

const main = async () => {
  const egs = new EGS(egsUnit);

  // production = true -> production CSR (PREZATCA-Code-Signing OID),
  // NOT the sandbox/compliance CSR type used by generate_csr.mjs.
  await egs.generateNewKeysAndCSR(true, "ThamerInvoicing");

  let { uuid, private_key, csr } = egs.get();

  private_key = private_key.replace(/\r\n/g, "\n");
  csr = csr.replace(/\r\n/g, "\n");

  console.log("=== Private Key (secp256k1, PEM) ===");
  console.log(private_key);
  console.log("\n=== CSR (PEM) ===");
  console.log(csr);

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        environment: "production",
        egs_uuid: uuid,
        private_key,
        csr,
        generated_at: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`\nSaved private key + CSR to ${OUTPUT_FILE}`);
  console.log("\n⚠️ هذا الملف حساس جداً — تأكد إنه مضاف بـ .gitignore ولا يتم رفعه لـ GitHub أبداً");
};

main().catch((error) => {
  console.error("Failed to generate CSR:", error.message ?? error);
  process.exitCode = 1;
});