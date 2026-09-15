#!/usr/bin/env node
// Generates a secp256k1 private key + ZATCA-compliant CSR for the ZATCA
// sandbox environment, using the EGS class from zatca-xml-js.
// Requires OpenSSL to be installed (the library shells out to it).

import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { EGS } from "zatca-xml-js";

const OUTPUT_FILE = path.join(import.meta.dirname, "zatca_sandbox_credentials.json");

// Fixed EGS unit UUID so re-running this script always identifies the same
// sandbox device instead of minting a new one each time.
const EGS_UUID = "24c4c2ce-0702-4648-9fbb-bc122a7e7dc1";

// The library defaults TEMP_FOLDER to "/tmp/" for its scratch files
// (private key + CSR config), which doesn't exist on Windows.
process.env.TEMP_FOLDER = os.tmpdir() + path.sep;

// The library spawns `openssl` directly via PATH. Make sure it resolves
// (Git for Windows ships one but doesn't always put it on PATH outside Git Bash).
function ensureOpenSSLOnPath() {
  try {
    execSync("openssl version", { stdio: "ignore" });
    return;
  } catch {
    // fall through to Git for Windows' bundled binary
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
      // try next candidate
    }
  }
  throw new Error("OpenSSL executable not found. Install OpenSSL or add it to PATH.");
}

if (process.platform === "win32") ensureOpenSSLOnPath();

// EGS unit info for the ZATCA sandbox onboarding test.
// location fields beyond city are placeholders (only "Makkah, Saudi Arabia" was given)
// and only city/street/building actually end up in the CSR's registeredAddress field.
const egsUnit = {
  uuid: EGS_UUID,
  custom_id: "THAMER-SANDBOX-EGS-1",
  model: "ThamerInvoicing",
  CRN_number: "1003352828",
  VAT_name: "ThamerInvoicing Sandbox Test",
  VAT_number: "399999999900003",
  branch_name: "Main Branch",
  branch_industry: "Real Estate Rental Services",
  location: {
    city: "Makkah",
    city_subdivision: "Makkah",
    street: "",
    plot_identification: "0000",
    building: "0000",
    postal_zone: "00000",
  },
};

const main = async () => {
  const egs = new EGS(egsUnit);

  // production = false -> sandbox/compliance CSR (TSTZATCA-Code-Signing OID).
  await egs.generateNewKeysAndCSR(false, "ThamerInvoicing");

  let { uuid, private_key, csr } = egs.get();

  // OpenSSL on Windows writes CRLF line endings. The library's own PEM
  // header/footer stripping (used later when signing invoices) hardcodes "\n",
  // so CRLF-formatted keys/CSRs fail to parse downstream. Normalize to LF.
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
        environment: "sandbox",
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
};

main().catch((error) => {
  console.error("Failed to generate CSR:", error.message ?? error);
  process.exitCode = 1;
});
