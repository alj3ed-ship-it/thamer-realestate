// Node-only ZATCA sandbox compliance helper. Ports the signing + submission
// logic from check_compliance.mjs into a reusable function that takes real
// invoice data instead of the hardcoded demo line item.
//
// IMPORTANT: this module touches the EGS private key and must only run
// server-side (e.g. from api/zatca-compliance.js). Never import it from
// browser code — zatca-xml-js relies on node:crypto internals that don't
// exist in a browser bundle, and the sandbox credentials must not ship to
// the client.

import axios from 'axios'
import { EGS, ZATCASimplifiedTaxInvoice } from 'zatca-xml-js'
import credentials from '../../zatca_sandbox_credentials.json' with { type: 'json' }

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

function assertCredentials() {
  if (!credentials.private_key || !credentials.csr) {
    throw new Error('بيانات zatca_sandbox_credentials.json غير مكتملة: private_key/csr مفقودة')
  }
  if (!credentials.compliance_certificate || !credentials.compliance_api_secret) {
    throw new Error('بيانات zatca_sandbox_credentials.json غير مكتملة: compliance_certificate/compliance_api_secret مفقودة')
  }
}

function buildEgsUnit(organization) {
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

/**
 * Builds, signs, and submits a real invoice to the ZATCA sandbox compliance
 * endpoint.
 *
 * @param {object} params
 * @param {{ name?: string, vat_number?: string, cr_number?: string, address?: string }} params.organization
 * @param {{ invoice_number?: string, issue_date?: string, customer_name?: string }} params.invoice
 * @param {Array<{ description?: string, quantity?: number|string, unit_price?: number|string, vat_rate?: number|string }>} params.items
 * @returns {Promise<{ invoice_hash: string, qr: string, compliance: object }>}
 */
export async function runZatcaComplianceCheck({ organization, invoice, items }) {
  assertCredentials()

  const egsUnit = buildEgsUnit(organization)
  const egs = new EGS(egsUnit)

  const issue_date = invoice?.issue_date || new Date().toISOString().slice(0, 10)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const issue_time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const line_items = toLineItems(items)

  const zatcaInvoice = new ZATCASimplifiedTaxInvoice({
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
  const status = validation?.status || (response.status === 200 ? 'UNKNOWN' : 'ERROR')
  const passed = response.status === 200 && (status === 'PASS' || status === 'WARNING')

  return {
    invoice_hash,
    qr,
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
