#!/usr/bin/env node
// Requests a Compliance CSID from the ZATCA sandbox for the CSR that
// generate_csr.mjs produced, using EGS.issueComplianceCertificate() from
// zatca-xml-js (which POSTs csr + OTP to /developer-portal/compliance and
// decodes the returned binarySecurityToken into a PEM certificate).

import fs from "node:fs";
import path from "node:path";
import { EGS } from "zatca-xml-js";

const CREDENTIALS_FILE = path.join(import.meta.dirname, "zatca_sandbox_credentials.json");
const SANDBOX_OTP = "123345"; // common placeholder OTP used in ZATCA sandbox docs/examples

const main = async () => {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));

  if (!credentials.private_key || !credentials.csr) {
    throw new Error(`Missing private_key/csr in ${CREDENTIALS_FILE}. Run generate_csr.mjs first.`);
  }

  // Same EGS unit info used by generate_csr.mjs, now carrying the saved
  // private_key/csr so issueComplianceCertificate() can use them.
  const egsUnit = {
    uuid: credentials.egs_uuid,
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
    private_key: credentials.private_key,
    csr: credentials.csr,
  };

  const egs = new EGS(egsUnit);

  const request_id = await egs.issueComplianceCertificate(SANDBOX_OTP);
  const { compliance_certificate, compliance_api_secret } = egs.get();

  console.log("=== Compliance CSID request result ===");
  console.log("request_id:", request_id);
  console.log("compliance_api_secret:", compliance_api_secret);
  console.log("compliance_certificate (decoded binarySecurityToken, PEM):");
  console.log(compliance_certificate);

  credentials.compliance_request_id = request_id;
  credentials.compliance_api_secret = compliance_api_secret;
  credentials.compliance_certificate = compliance_certificate;
  credentials.compliance_requested_at = new Date().toISOString();

  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  console.log(`\nSaved compliance CSID fields to ${CREDENTIALS_FILE}`);
};

main().catch((error) => {
  console.error("Failed to request Compliance CSID:");
  if (error.response) {
    console.error("HTTP status:", error.response.status);
    console.error("Response data:", JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message ?? error);
  }
  process.exitCode = 1;
});
