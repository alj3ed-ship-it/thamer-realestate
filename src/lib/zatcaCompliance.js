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
import { createClient } from '@supabase/supabase-js'
import { EGS, ZATCASimplifiedTaxInvoice } from 'zatca-xml-js'
import { ZATCAStandardTaxInvoice } from './zatca/ZATCAStandardTaxInvoice.js'
import { ZATCAInvoiceTypes } from './zatca/standardTaxInvoiceTemplate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_FILE = path.join(__dirname, '../../zatca_sandbox_credentials.json')

const SANDBOX_BASEURL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal'

// Real (non-compliance-check) submission base URLs, keyed by
// ZATCA_ENVIRONMENT. Deliberately separate from SANDBOX_BASEURL above,
// which is only ever used for the /compliance/invoices onboarding check.
// NOTE: gw-apic-gov.gazt.gov.sa (the sandbox host originally specified) is a
// dead domain — gazt.gov.sa itself does not resolve at all (DNS NXDOMAIN;
// GAZT was ZATCA's pre-2021 name and the domain appears fully decommissioned,
// confirmed by comparing against zatca.gov.sa which resolves fine). Using
// the same gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal host already
// used for the compliance-check sandbox (SANDBOX_BASEURL above) instead —
// ZATCA's developer-portal sandbox serves Reporting/Clearance under the same
// base as the compliance check, just different paths.
const PRODUCTION_BASE_URLS = {
  sandbox: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal',
  simulation: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation',
  production: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core',
}

/**
 * Reads which real-submission environment this deployment targets.
 * NEVER inferred from certificate type or any other implicit source —
 * only process.env.ZATCA_ENVIRONMENT. Defaults to the safest option
 * (sandbox) if unset, rather than failing open into production.
 */
export function getZatcaEnvironment() {
  const raw = (process.env.ZATCA_ENVIRONMENT || 'sandbox').trim().toLowerCase()
  if (!PRODUCTION_BASE_URLS[raw]) {
    throw new Error(`قيمة ZATCA_ENVIRONMENT غير صالحة: "${raw}" — القيم المسموحة: sandbox, simulation, production`)
  }
  return raw
}

function getProductionBaseUrl(environment) {
  return PRODUCTION_BASE_URLS[environment]
}

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
// Some of these values (copy-pasted from a Windows-originated PEM) also
// carry a literal "\r" — handle "\r\n" as one unit first, then strip any
// leftover literal "\r" outright, or it survives as junk text sitting
// right before a "-----END ...-----" footer and breaks PEM parsing
// (Node's crypto rejects it with a DECODER/PEM error).
function unescapeNewlines(value) {
  if (typeof value !== 'string') return value
  return value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '')
}

// Credentials come from Vercel env vars in production (the sandbox JSON file
// is gitignored and never deployed). Locally, when those env vars aren't
// set, fall back to reading the JSON file so `vercel dev` keeps working
// exactly as before.
function loadCredentials() {
  if (process.env.ZATCA_PRIVATE_KEY && process.env.ZATCA_COMPLIANCE_CERTIFICATE) {
    let compliance_request_id = process.env.ZATCA_COMPLIANCE_REQUEST_ID

    // Fallback: compliance_request_id isn't in Vercel env vars yet, but it
    // exists in the local sandbox JSON file — read just that one field.
    if (!compliance_request_id && fs.existsSync(CREDENTIALS_FILE)) {
      const fileCreds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
      compliance_request_id = fileCreds.compliance_request_id
    }

    return {
      egs_uuid: process.env.ZATCA_EGS_UUID,
      private_key: unescapeNewlines(process.env.ZATCA_PRIVATE_KEY),
      csr: unescapeNewlines(process.env.ZATCA_CSR),
      compliance_certificate: unescapeNewlines(process.env.ZATCA_COMPLIANCE_CERTIFICATE),
      compliance_api_secret: process.env.ZATCA_COMPLIANCE_API_SECRET,
      compliance_request_id,
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

// Production (real submission) credentials are deliberately kept separate
// from the compliance-check ones above — they come from ZATCA's
// /production/csids onboarding step (see runProductionCsidOnboarding) and
// must never be confused with the compliance sandbox certificate. Same
// env-var-first, local-JSON-fallback pattern as loadCredentials().
function loadProductionCredentials() {
  if (process.env.ZATCA_PRODUCTION_CERTIFICATE && process.env.ZATCA_PRODUCTION_API_SECRET) {
    return {
      production_certificate: unescapeNewlines(process.env.ZATCA_PRODUCTION_CERTIFICATE),
      production_api_secret: process.env.ZATCA_PRODUCTION_API_SECRET,
    }
  }

  if (fs.existsSync(CREDENTIALS_FILE)) {
    const fileCreds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
    if (fileCreds.production_certificate && fileCreds.production_api_secret) {
      return {
        production_certificate: unescapeNewlines(fileCreds.production_certificate),
        production_api_secret: fileCreds.production_api_secret,
      }
    }
  }

  throw new Error(
    'بيانات اعتماد الإنتاج (Production CSID) غير موجودة: لا ZATCA_PRODUCTION_CERTIFICATE/ZATCA_PRODUCTION_API_SECRET ولا ملف محلي — نفّذ خطوة onboarding الإنتاج أولاً'
  )
}

let supabaseAdminSingleton = null

// Service-role Supabase client — server-only, bypasses RLS. Required here
// because this module reads/writes invoices, the ZATCA hash chain, and the
// zatca_submission_log audit table from a Vercel serverless function
// (no browser session/anon key available in that context).
function getSupabaseAdmin() {
  if (supabaseAdminSingleton) return supabaseAdminSingleton
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('إعدادات Supabase (service role) غير مكتملة: VITE_SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY مفقود')
  }
  supabaseAdminSingleton = createClient(url, serviceKey, { auth: { persistSession: false } })
  return supabaseAdminSingleton
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

// Business decision (17 Sept 2026, confirmed by tax advisor أصيل الجعيد):
// every invoice this office issues is a Standard (B2B) tax invoice,
// regardless of whether the customer has a VAT number or CR number on
// file. Simplified (B2C) invoices are reserved for end-consumer retail
// sales (groceries, restaurants, cafes) under 1,000 SAR with no buyer
// identity recorded at all — not applicable to this office's tenant
// invoices, which always identify a specific contracting party.
function isStandardInvoice(invoice) {
  return true
}

function buildBuyer(invoice) {
  return {
    name: invoice?.customer_name || 'Unnamed Buyer',
    vat_number: invoice?.customer_vat_number || undefined,
    cr_number: invoice?.customer_cr_number || undefined,
    id_number: invoice?.customer_id_number || undefined,
    id_type: invoice?.customer_id_type || undefined,
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


/**
 * Builds, signs, and submits a Credit or Debit Note referencing an existing
 * (already-cleared) invoice. Always uses the Standard invoice template,
 * since notes follow the same B2B/B2C rules as their parent document —
 * ZATCA requires the buyer info on the note to match the original invoice.
 *
 * @param {object} params
 * @param {{ name?: string, vat_number?: string, cr_number?: string, address?: string }} params.organization
 * @param {{ invoice_number?: string, issue_date?: string, customer_name?: string, customer_vat_number?: string, customer_cr_number?: string, customer_city?: string, customer_address?: string }} params.originalInvoice
 * @param {'credit_note'|'debit_note'} params.noteType
 * @param {string} params.reason
 * @param {Array<{ description?: string, quantity?: number|string, unit_price?: number|string, vat_rate?: number|string }>} params.items
 * @returns {Promise<{ invoice_hash: string, qr: string, invoice_type: string, compliance: object }>}
 */
export async function runZatcaCreditDebitNote({ organization, originalInvoice, noteType, reason, items }) {
  const credentials = loadCredentials()
  assertCredentials(credentials)

  const egsUnit = buildEgsUnit(credentials, organization)
  const egs = new EGS(egsUnit)

  const issue_date = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const issue_time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  const line_items = toLineItems(items)
  const invoiceTypeCode = noteType === 'debit_note' ? ZATCAInvoiceTypes.DEBIT_NOTE : ZATCAInvoiceTypes.CREDIT_NOTE

  const zatcaInvoice = new ZATCAStandardTaxInvoice({
    props: {
      egs_info: egs.get(),
      invoice_counter_number: 1,
      invoice_serial_number: `${noteType === 'debit_note' ? 'DN' : 'CN'}-${Date.now()}`,
      issue_date,
      issue_time,
      previous_invoice_hash: FIRST_INVOICE_PIH,
      buyer: buildBuyer(originalInvoice),
      line_items,
      cancelation: {
        cancelation_type: invoiceTypeCode,
        payment_method: 'CASH',
        reason: reason || 'No note reason specified',
        billing_reference: { id: originalInvoice?.invoice_number },
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
  const ok = response.status >= 200 && response.status < 300
  const status = validation?.status || (ok ? 'UNKNOWN' : 'ERROR')
  const passed = ok && (status === 'PASS' || status === 'WARNING')

  return {
    invoice_hash,
    qr,
    invoice_type: noteType === 'debit_note' ? 'إشعار مدين' : 'إشعار دائن',
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


export async function runProductionCsidOnboarding() {
  const credentials = loadCredentials()
  assertCredentials(credentials)

  if (!credentials.compliance_request_id) {
    throw new Error('compliance_request_id غير موجود ببيانات الاعتماد — لا يمكن طلب شهادة الإنتاج')
  }

  const response = await axios.post(
    `${getProductionBaseUrl(getZatcaEnvironment())}/production/csids`,
    {
      compliance_request_id: String(credentials.compliance_request_id),
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

  const ok = response.status >= 200 && response.status < 300
  if (!ok) {
    throw new Error(`فشل طلب شهادة الإنتاج (HTTP ${response.status}): ${JSON.stringify(response.data)}`)
  }

  // binarySecurityToken is base64 of the PEM body (not the whole PEM) —
  // must be base64-decoded and re-wrapped in PEM markers before it's usable
  // as a certificate, same treatment zatca-xml-js's own library code gives
  // the compliance certificate in api/index.js.
  const decoded_certificate = response.data?.binarySecurityToken
    ? `-----BEGIN CERTIFICATE-----\n${Buffer.from(response.data.binarySecurityToken, 'base64').toString()}\n-----END CERTIFICATE-----`
    : undefined

  const result = {
    production_certificate: decoded_certificate,
    production_api_secret: response.data?.secret,
    request_id: response.data?.requestID,
    disposition_message: response.data?.dispositionMessage,
    raw: response.data,
  }

  // Persist alongside the existing sandbox compliance credentials so
  // subsequent calls (real invoice submission) can read them back.
  if (fs.existsSync(CREDENTIALS_FILE)) {
    const existing = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
    existing.production_certificate = result.production_certificate
    existing.production_api_secret = result.production_api_secret
    existing.production_request_id = result.request_id
    existing.production_onboarded_at = new Date().toISOString()
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(existing, null, 2), 'utf8')
  }

  return result
}

// Invoice statuses from which a real submission may be attempted. 'ready'
// means the sandbox compliance check already passed; 'rejected' allows
// retrying a previously-failed real submission. Anything else (draft,
// cleared, submitted, paused, pending_*) is refused — either because the
// invoice was never validated, or because it was already sent.
const SUBMITTABLE_STATUSES = ['ready', 'rejected']

async function getChainState(supabaseAdmin, organizationId) {
  if (!organizationId) {
    return { nextIcv: 1, previousHash: FIRST_INVOICE_PIH }
  }
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('icv, invoice_hash')
    .eq('organization_id', organizationId)
    .not('icv', 'is', null)
    .order('icv', { ascending: false })
    .limit(1)
  if (error) throw new Error(`تعذر قراءة سلسلة فواتير ZATCA السابقة: ${error.message}`)

  const last = data?.[0]
  return {
    nextIcv: (last?.icv || 0) + 1,
    previousHash: last?.invoice_hash || FIRST_INVOICE_PIH,
  }
}

/**
 * Builds, signs, and submits a REAL invoice to ZATCA's Reporting or
 * Clearance API — not the compliance-check sandbox endpoint. This is a
 * legally binding submission once it succeeds.
 *
 * submissionType is always derived from the invoice itself (Standard/B2B
 * invoices are legally required to go through Clearance; Simplified/B2C
 * invoices go through Reporting) — a caller-supplied value is accepted for
 * API-shape compatibility but is only used as a sanity check, never to
 * override the mandated routing.
 *
 * @param {string} invoiceId
 * @param {'reporting'|'clearance'} [submissionType]
 * @param {{ submittedBy?: string }} [options]
 */
export async function runProductionInvoiceSubmission(invoiceId, submissionType, { submittedBy } = {}) {
  if (!invoiceId) throw new Error('invoiceId مطلوب')

  const environment = getZatcaEnvironment()
  const baseUrl = getProductionBaseUrl(environment)
  const supabaseAdmin = getSupabaseAdmin()

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()
  if (invoiceError || !invoice) {
    throw new Error(`الفاتورة غير موجودة: ${invoiceError?.message || invoiceId}`)
  }
  if (!SUBMITTABLE_STATUSES.includes(invoice.status)) {
    throw new Error(
      `لا يمكن إرسال هذه الفاتورة فعلياً بحالتها الحالية (${invoice.status}) — يجب فحص الامتثال أولاً (حالة "جاهزة للإرسال"), ولا يمكن إعادة إرسال فاتورة تم اعتمادها/إرسالها مسبقاً`
    )
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order')
  if (itemsError) throw new Error(itemsError.message)
  if (!items || items.length === 0) throw new Error('لا توجد بنود بهذه الفاتورة')

  let organization = null
  if (invoice.organization_id) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, name, vat_number, cr_number, address')
      .eq('id', invoice.organization_id)
      .single()
    organization = org || null
  }

  const credentials = loadCredentials()
  assertCredentials(credentials)
  const productionCredentials = loadProductionCredentials()

  const standard = isStandardInvoice(invoice)
  const mandatedSubmissionType = standard ? 'clearance' : 'reporting'
  if (submissionType && submissionType !== mandatedSubmissionType) {
    throw new Error(
      `نوع الإرسال المطلوب لهذه الفاتورة هو "${mandatedSubmissionType}" (${standard ? 'قياسية/B2B تلزم Clearance' : 'مبسّطة/B2C تلزم Reporting'}), وليس "${submissionType}"`
    )
  }
  const effectiveSubmissionType = mandatedSubmissionType

  const egsUnit = {
    ...buildEgsUnit(credentials, organization),
    production_certificate: productionCredentials.production_certificate,
    production_api_secret: productionCredentials.production_api_secret,
  }
  const egs = new EGS(egsUnit)

  const { nextIcv, previousHash } = await getChainState(supabaseAdmin, invoice.organization_id)

  const issue_date = invoice.issue_date || new Date().toISOString().slice(0, 10)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const issue_time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const line_items = toLineItems(items)

  let zatcaInvoice
  if (standard) {
    zatcaInvoice = new ZATCAStandardTaxInvoice({
      props: {
        egs_info: egs.get(),
        invoice_counter_number: nextIcv,
        invoice_serial_number: invoice.invoice_number,
        issue_date,
        issue_time,
        previous_invoice_hash: previousHash,
        buyer: buildBuyer(invoice),
        line_items,
      },
    })
  } else {
    zatcaInvoice = new ZATCASimplifiedTaxInvoice({
      props: {
        egs_info: egs.get(),
        invoice_counter_number: nextIcv,
        invoice_serial_number: invoice.invoice_number,
        issue_date,
        issue_time,
        previous_invoice_hash: previousHash,
        line_items,
      },
    })
    const buyer_name = invoice.customer_name || 'Cash Customer'
    zatcaInvoice.getXML().set('Invoice/cac:AccountingCustomerParty', true, {
      'cac:Party': {
        'cac:PartyLegalEntity': {
          'cbc:RegistrationName': buyer_name,
        },
      },
    })
  }

  const { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(zatcaInvoice, true)

  const endpoint = effectiveSubmissionType === 'clearance' ? '/invoices/clearance/single' : '/invoices/reporting/single'
  let response
  let requestFailed = false
  let requestError = null
  try {
    response = await axios.post(
      `${baseUrl}${endpoint}`,
      {
        invoiceHash: invoice_hash,
        uuid: credentials.egs_uuid,
        invoice: Buffer.from(signed_invoice_string).toString('base64'),
      },
      {
        headers: {
          'Accept-Version': 'V2',
          'Accept-Language': 'en',
          'Clearance-Status': effectiveSubmissionType === 'clearance' ? '1' : '0',
          ...getAuthHeaders(productionCredentials.production_certificate, productionCredentials.production_api_secret),
        },
        validateStatus: () => true,
      }
    )
  } catch (err) {
    requestFailed = true
    requestError = err
  }

  const validation = response?.data?.validationResults
  const ok = !requestFailed && response.status >= 200 && response.status < 300
  const status = requestFailed ? 'NETWORK_ERROR' : validation?.status || (ok ? 'UNKNOWN' : 'ERROR')
  const passed = ok && (status === 'PASS' || status === 'WARNING')

  const messages = {
    info: validation?.infoMessages || [],
    warnings: validation?.warningMessages || [],
    errors: validation?.errorMessages || [],
  }

  const nowIso = new Date().toISOString()

  if (passed) {
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        invoice_hash,
        previous_invoice_hash: previousHash,
        icv: nextIcv,
        invoice_counter: nextIcv,
        qr_code: qr,
        zatca_hash: invoice_hash,
        zatca_uuid: credentials.egs_uuid,
        submitted_at: nowIso,
        submission_status: effectiveSubmissionType === 'clearance' ? 'cleared' : 'submitted',
        status: effectiveSubmissionType === 'clearance' ? 'cleared' : 'submitted',
        compliance_status: status,
      })
      .eq('id', invoiceId)
    if (updateError) throw new Error(`تم الإرسال للهيئة لكن فشل تحديث الفاتورة محلياً: ${updateError.message}`)
  } else {
    await supabaseAdmin
      .from('invoices')
      .update({
        retry_count: (invoice.retry_count || 0) + 1,
        retry_log: [
          ...(invoice.retry_log || []),
          { at: nowIso, environment, submission_type: effectiveSubmissionType, status, http_status: response?.status ?? null, error: requestError?.message },
        ],
        status: 'rejected',
        submission_status: 'failed',
      })
      .eq('id', invoiceId)
  }

  const { data: logRow, error: logError } = await supabaseAdmin
    .from('zatca_submission_log')
    .insert([{
      invoice_id: invoiceId,
      submission_type: effectiveSubmissionType,
      environment,
      status: passed ? 'success' : 'failed',
      response_summary: {
        http_status: response?.status ?? null,
        status,
        messages,
        disposition_message: response?.data?.dispositionMessage,
        network_error: requestError?.message,
      },
      submitted_by: submittedBy || null,
    }])
    .select('id')
    .single()
  // A logging failure must not hide a real (successful or failed)
  // submission result from the caller — surface it as a warning field
  // instead of throwing.
  const submissionLogId = logRow?.id || null
  const submissionLogError = logError?.message || null

  return {
    invoice_hash,
    qr,
    invoice_type: standard ? 'قياسية' : 'مبسطة',
    submission_type: effectiveSubmissionType,
    environment,
    submission: {
      passed,
      status,
      http_status: response?.status ?? null,
      messages,
      raw: response?.data,
      network_error: requestError?.message,
    },
    submission_log_id: submissionLogId,
    submission_log_error: submissionLogError,
  }
}
