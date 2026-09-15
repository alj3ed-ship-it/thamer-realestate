// Node-only ZATCA sandbox compliance helper. Ports the signing + submission
// logic from check_compliance.mjs into a reusable function that takes real
// invoice data instead of the hardcoded demo line item.
//
// IMPORTANT: this module touches the EGS private key and must only run
// server-side (e.g. from api/zatca-compliance.js). Never import it from
// browser code — zatca-xml-js relies on node:crypto internals that don't
// exist in a browser bundle, and the sandbox credentials must not ship to
// the client.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import axios from 'axios'
import { EGS, ZATCASimplifiedTaxInvoice } from 'zatca-xml-js'
import { ZATCAStandardTaxInvoice } from './zatca/ZATCAStandardTaxInvoice.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_FILE = path.join(__dirname, '../../zatca_sandbox_credentials.json')

const SANDBOX_BASEURL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal'

// Same placeholder PIH used by check_compliance.mjs — the compliance-check
// sandbox endpoint doesn't verify invoice chaining, so every test submission
// can reuse it.
const FIRST_INVOICE_PIH =
  'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ=='

function cleanUpCertificateString(certificate_string) {
  return certificate_string
    .replace('-----BEGIN CERTIFICATE-----\n', '')
    .replace('-----END CERTIFICATE-----', '')
    .trim()
}

function getAuthHeaders(certificate, secret) {
  const certificate_stripped = cleanUpCertificateString(certificate)
  const basic = Buffer.from(`${Buffer.from(certificate_stripped).toString('base64')}:${secret}`).toString('base64')
  return { Authorization: `Basic ${basic}` }
}

// PEM fields pasted into Vercel's env var UI sometimes lose real newlines
// (single-line paste with literal "\n"). Unescape them; a value that already
// has real newlines is left untouched since it has no literal "\n" to match.
function unescapeNewlines(value) {
  return typeof value === 'string' ? value.replace(/\\n/g, '\n') : value
}

// Credentials come from Vercel env vars in production (the sandbox JSON file
// is gitignored and never deployed). Locally, when those env vars aren't
// set, fall back to reading the JSON file so `vercel dev` keeps working
// exactly as before.
function loadCredentials() {
  if (process.env.ZATCA_PRIVATE_KEY && process.env.ZATCA_COMPLIANCE_CERTIFICATE) {
    return {
      egs_uuid: process.env.ZATCA_EGS_UUID,
      private_key: unescapeNewlines(process.env.ZATCA_PRIVATE_KEY),
      csr: unescapeNewlines(process.env.ZATCA_CSR),
      compliance_certificate: unescapeNewlines(process.env.ZATCA_COMPLIANCE_CERTIFICATE),
      compliance_api_secret: process.env.ZATCA_COMPLIANCE_API_SECRET,
    }
  }

  if (fs.existsSync(CREDENTIALS_FILE)) {
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
  }

  throw new Error(
    'بيانات اعتماد ZATCA غير موجودة: لا متغيرات بيئة (ZATCA_PRIVATE_KEY...) ولا ملف zatca_sandbox_credentials.json محليًا'
  )
}

function assertCredentials(credentials) {
  if (!credentials.private_key || !credentials.csr) {
    throw new Error('بيانات اعتماد ZATCA غير مكتملة: private_key/csr مفقودة')
  }
  if (!credentials.compliance_certificate || !credentials.compliance_api_secret) {
    throw new Error('بيانات اعتماد ZATCA غير مكتملة: compliance_certificate/compliance_api_secret مفقودة')
  }
}

function buildEgsUnit(credentials, organization) {
  return {
    uuid: credentials.egs_uuid,
    custom_id: 'THAMER-SANDBOX-EGS-1',
    model: 'ThamerInvoicing',
    CRN_number: organization?.cr_number || '1003352828',
    VAT_name: organization?.name || 'ThamerInvoicing Sandbox Test',
    VAT_number: organization?.vat_number || '399999999900003',
    branch_name: 'Main Branch',
    branch_industry: 'Real Estate Rental Services',
    location: {
      city: 'Makkah',
      city_subdivision: 'Makkah',
      street: organization?.address || 'Ajyad Street',
      plot_identification: '0000',
      building: '0000',
      postal_zone: '00000',
    },
    private_key: credentials.private_key,
    csr: credentials.csr,
    compliance_certificate: credentials.compliance_certificate,
    compliance_api_secret: credentials.compliance_api_secret,
  }
}

function toLineItems(items) {
  if (!items || items.length === 0) {
    throw new Error('لا توجد بنود في هذه الفاتورة')
  }
  return items.map((it, idx) => ({
    id: String(idx + 1),
    name: it.description || `بند ${idx + 1}`,
    quantity: Number(it.quantity) || 1,
    tax_exclusive_price: Number(it.unit_price) || 0,
    VAT_percent: (Number(it.vat_rate) || 15) / 100,
  }))
}

// Standard (B2B) invoices are chosen automatically whenever the customer has
// a VAT number on file — matches the rule: قياسية إذا فيه بيانات مشتري VAT،
// مبسّطة إذا لا.
// Standard (B2B) is used whenever the customer is identifiable as an
// establishment/legal entity — via a VAT number OR a CR number. A customer
// with neither is treated as a private individual (Simplified/B2C is always
// permitted for individuals regardless of amount, per Art. 53(7)).
function isStandardInvoice(invoice) {
  const hasVat = Boolean(invoice?.customer_vat_number && String(invoice.customer_vat_number).trim())
  const hasCr = Boolean(invoice?.customer_cr_number && String(invoice.customer_cr_number).trim())
  return hasVat || hasCr
}

function buildBuyer(invoice) {
  return {
    name: invoice?.customer_name || 'Unnamed Buyer',
    vat_number: invoice?.customer_vat_number || undefined,
    cr_number: invoice?.customer_cr_number || undefined,
    city: invoice?.customer_city || undefined,
    street: invoice?.customer_address || undefined,
  }
}

/**
 * Builds, signs, and submits a real invoice to the ZATCA sandbox compliance
 * endpoint. Automatically picks Standard (B2B) vs Simplified (B2C) based on
 * whether the customer has a VAT number.
 *
 * @param {object} params
 * @param {{ name?: string, vat_number?: string, cr_number?: string, address?: string }} params.organization
 * @param {{ invoice_number?: string, issue_date?: string, customer_name?: string, customer_vat_number?: string, customer_cr_number?: string, customer_city?: string, customer_address?: string }} params.invoice
 * @param {Array<{ description?: string, quantity?: number|string, unit_price?: number|string, vat_rate?: number|string }>} params.items
 * @returns {Promise<{ invoice_hash: string, qr: string, invoice_type: string, compliance: object }>}
 */
export async function runZatcaComplianceCheck({ organization, invoice, items }) {
  const credentials = loadCredentials()
  assertCredentials(credentials)

  const egsUnit = buildEgsUnit(credentials, organization)
  const egs = new EGS(egsUnit)

  const issue_date = invoice?.issue_date || new Date().toISOString().slice(0, 10)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const issue_time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const line_items = toLineItems(items)
  const standard = isStandardInvoice(invoice)

  let zatcaInvoice
  if (standard) {
    zatcaInvoice = new ZATCAStandardTaxInvoice({
      props: {
        egs_info: egs.get(),
        invoice_counter_number: 1,
        invoice_serial_number: invoice?.invoice_number || `THAMER-${Date.now()}`,
        issue_date,
        issue_time,
        previous_invoice_hash: FIRST_INVOICE_PIH,
        buyer: buildBuyer(invoice),
        line_items,
      },
    })
  } else {
    zatcaInvoice = new ZATCASimplifiedTaxInvoice({
      props: {
        egs_info: egs.get(),
        invoice_counter_number: 1,
        invoice_serial_number: invoice?.invoice_number || `THAMER-${Date.now()}`,
        issue_date,
        issue_time,
        previous_invoice_hash: FIRST_INVOICE_PIH,
        line_items,
      },
    })

    const buyer_name = invoice?.customer_name || 'Cash Customer'
    zatcaInvoice.getXML().set('Invoice/cac:AccountingCustomerParty', true, {
      'cac:Party': {
        'cac:PartyLegalEntity': {
          'cbc:RegistrationName': buyer_name,
        },
      },
    })
  }

  const { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(zatcaInvoice)

  const response = await axios.post(
    `${SANDBOX_BASEURL}/compliance/invoices`,
    {
      invoiceHash: invoice_hash,
      uuid: credentials.egs_uuid,
      invoice: Buffer.from(signed_invoice_string).toString('base64'),
    },
    {
      headers: {
        'Accept-Version': 'V2',
        'Accept-Language': 'en',
        ...getAuthHeaders(credentials.compliance_certificate, credentials.compliance_api_secret),
      },
      validateStatus: () => true,
    }
  )

  const validation = response.data?.validationResults
  const ok = response.status >= 200 && response.status < 300
  const status = validation?.status || (ok ? 'UNKNOWN' : 'ERROR')
  const passed = ok && (status === 'PASS' || status === 'WARNING')

  return {
    invoice_hash,
    qr,
    invoice_type: standard ? 'قياسية' : 'مبسطة',
    compliance: {
      passed,
      status,
      http_status: response.status,
      messages: {
        info: validation?.infoMessages || [],
        warnings: validation?.warningMessages || [],
        errors: validation?.errorMessages || [],
      },
      raw: response.data,
    },
  }
}