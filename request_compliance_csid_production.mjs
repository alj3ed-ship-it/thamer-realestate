#!/usr/bin/env node
// Requests the REAL Compliance CSID from ZATCA (not the sandbox test one)
// for the production CSR that generate_csr_production.mjs produced.
// Uses EGS.issueComplianceCertificate() — the exact same library call that
// already worked successfully for the sandbox Compliance CSID — just now
// pointed at the real EGS unit (real VAT number, real CSR/private key).
//
// ⚠️ الـ OTP صالح لدقائق قليلة بس — لا تطلبه من بوابة فاتورة إلا وأنت جاهز
// تشغّل هذا السكربت فورًا بعده.

import fs from "node:fs";
import path from "node:path";
import { EGS } from "zatca-xml-js";

const CREDENTIALS_FILE = path.join(import.meta.dirname, "zatca_production_credentials.json");

// ⚠️ استبدل هذا بالـ OTP الحقيقي اللي طلعته من بوابة فاتورة (fatoora.zatca.gov.sa)
// قبل ما تشغّل السكربت — لا تشغّله وهو لسه فاضي.
const REAL_OTP = "PUT_REAL_OTP_HERE";

const main = async () => {
  if (REAL_OTP === "PUT_REAL_OTP_HERE") {
    throw new Error("لازم تحط الـ OTP الحقيقي بالسكربت قبل التشغيل (متغير REAL_OTP)");
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));

  if (!credentials.private_key || !credentials.csr) {
    throw new Error(`Missing private_key/csr in ${CREDENTIALS_FILE}. Run generate_csr_production.mjs first.`);
  }

  const egsUnit = {
    uuid: credentials.egs_uuid,
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
    private_key: credentials.private_key,
    csr: credentials.csr,
  };

  const egs = new EGS(egsUnit);

  const request_id = await egs.issueComplianceCertificate(REAL_OTP);
  const { compliance_certificate, compliance_api_secret } = egs.get();

  console.log("=== Real Compliance CSID request result ===");
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
  console.log("\nالخطوة الجاية: لازم تعيد اختبارات الامتثال (standard/simplified/credit/debit) بهذي الشهادة الحقيقية قبل طلب Production CSID.");
};

main().catch((error) => {
  console.error("Failed to request real Compliance CSID:");
  if (error.response) {
    console.error("HTTP status:", error.response.status);
    console.error("Response data:", JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message ?? error);
  }
  process.exitCode = 1;
});