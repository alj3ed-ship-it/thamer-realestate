#!/usr/bin/env node
// Builds a single-line B2C ZATCA Simplified Tax Invoice, signs it with the
// EGS's compliance certificate/private key, and submits it to the ZATCA
// sandbox compliance check endpoint (EGS.checkInvoiceCompliance()).
//
// Extra vs original: prints a human-readable invoice summary and saves the
// QR as an actual scannable PNG image (qr_output.png) in the project folder.

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import QRCode from "qrcode";
import { EGS, ZATCASimplifiedTaxInvoice } from "zatca-xml-js";

const SANDBOX_BASEURL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal";

const cleanUpCertificateString = (certificate_string) =>
  certificate_string.replace(`-----BEGIN CERTIFICATE-----\n`, "").replace("-----END CERTIFICATE-----", "").trim();

const getAuthHeaders = (certificate, secret) => {
  const certificate_stripped = cleanUpCertificateString(certificate);
  const basic = Buffer.from(`${Buffer.from(certificate_stripped).toString("base64")}:${secret}`).toString("base64");
  return { Authorization: `Basic ${basic}` };
};

const CREDENTIALS_FILE = path.join(import.meta.dirname, "zatca_sandbox_credentials.json");
const QR_IMAGE_FILE = path.join(import.meta.dirname, "qr_output.png");

const FIRST_INVOICE_PIH =
  "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

const main = async () => {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));

  if (!credentials.private_key || !credentials.csr) {
    throw new Error(`Missing private_key/csr in ${CREDENTIALS_FILE}. Run generate_csr.mjs first.`);
  }
  if (!credentials.compliance_certificate || !credentials.compliance_api_secret) {
    throw new Error(
      `Missing compliance_certificate/compliance_api_secret in ${CREDENTIALS_FILE}. Run request_compliance_csid.mjs first.`
    );
  }

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
      street: "Ajyad Street",
      plot_identification: "0000",
      building: "0000",
      postal_zone: "00000",
    },
    private_key: credentials.private_key,
    csr: credentials.csr,
    compliance_certificate: credentials.compliance_certificate,
    compliance_api_secret: credentials.compliance_api_secret,
  };

  const egs = new EGS(egsUnit);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const issue_date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const issue_time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const line_item = {
    id: "1",
    name: "Real Estate Rental Service",
    quantity: 1,
    tax_exclusive_price: 86.96,
    VAT_percent: 0.15,
  };
  const vat_amount = Math.round(line_item.tax_exclusive_price * line_item.VAT_percent * 100) / 100;
  const total_amount = line_item.tax_exclusive_price + vat_amount;

  const invoice = new ZATCASimplifiedTaxInvoice({
    props: {
      egs_info: egs.get(),
      invoice_counter_number: 1,
      invoice_serial_number: "THAMER-SANDBOX-EGS-1-1",
      issue_date,
      issue_time,
      previous_invoice_hash: FIRST_INVOICE_PIH,
      line_items: [line_item],
    },
  });

  const buyer_name = "Cash Customer";
  invoice.getXML().set("Invoice/cac:AccountingCustomerParty", true, {
    "cac:Party": {
      "cac:PartyLegalEntity": {
        "cbc:RegistrationName": buyer_name,
      },
    },
  });

  // --- Human-readable invoice summary ---
  console.log("=== ملخص الفاتورة ===");
  console.log("البائع (EGS):", egsUnit.VAT_name);
  console.log("الرقم الضريبي (تجريبي):", egsUnit.VAT_number);
  console.log("المشتري:", buyer_name);
  console.log("رقم الفاتورة التسلسلي:", "THAMER-SANDBOX-EGS-1-1");
  console.log("التاريخ والوقت:", `${issue_date} ${issue_time}`);
  console.log("البند:", line_item.name);
  console.log("السعر قبل الضريبة:", line_item.tax_exclusive_price.toFixed(2), "SAR");
  console.log("قيمة الضريبة (15%):", vat_amount.toFixed(2), "SAR");
  console.log("الإجمالي شامل الضريبة:", total_amount.toFixed(2), "SAR");

  const { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice);

  console.log("\n=== Signed invoice hash ===");
  console.log(invoice_hash);
  console.log("\n=== QR (base64 TLV - كما يُخزّن بالفاتورة) ===");
  console.log(qr);

  // Save the QR as an actual scannable PNG image.
  await QRCode.toFile(QR_IMAGE_FILE, qr, { width: 400 });
  console.log("\n=== صورة QR محفوظة بالمسار ===");
  console.log(QR_IMAGE_FILE);

  console.log("\n=== Submitting to ZATCA sandbox compliance check ===");
  const response = await axios.post(
    `${SANDBOX_BASEURL}/compliance/invoices`,
    {
      invoiceHash: invoice_hash,
      uuid: credentials.egs_uuid,
      invoice: Buffer.from(signed_invoice_string).toString("base64"),
    },
    {
      headers: {
        "Accept-Version": "V2",
        "Accept-Language": "en",
        ...getAuthHeaders(credentials.compliance_certificate, credentials.compliance_api_secret),
      },
      validateStatus: () => true,
    }
  );

  console.log("\n=== Compliance check result ===");
  console.log("HTTP status:", response.status);
  console.log(JSON.stringify(response.data, null, 2));
};

main().catch((error) => {
  console.error("Compliance check failed:");
  if (error.response) {
    console.error("HTTP status:", error.response.status);
    console.error("Response data:", JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message ?? error);
  }
  process.exitCode = 1;
});
