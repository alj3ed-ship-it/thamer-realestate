// Standalone test: builds a real Standard (B2B) invoice using our new
// ZATCAStandardTaxInvoice class and submits it to the ZATCA sandbox
// compliance endpoint, mirroring check_compliance.mjs's flow.

import fs from 'node:fs'
import axios from 'axios'
import { EGS } from 'zatca-xml-js'
import { ZATCAStandardTaxInvoice } from './src/lib/zatca/ZATCAStandardTaxInvoice.js'

const credentials = JSON.parse(fs.readFileSync('./zatca_sandbox_credentials.json', 'utf8'))
const SANDBOX_BASEURL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal'
const FIRST_INVOICE_PIH =
  'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ=='

function cleanUpCertificateString(certificate_string) {
  return certificate_string.replace('-----BEGIN CERTIFICATE-----\n', '').replace('-----END CERTIFICATE-----', '').trim()
}
function getAuthHeaders(certificate, secret) {
  const stripped = cleanUpCertificateString(certificate)
  const basic = Buffer.from(`${Buffer.from(stripped).toString('base64')}:${secret}`).toString('base64')
  return { Authorization: `Basic ${basic}` }
}

const egsUnit = {
  uuid: credentials.egs_uuid,
  custom_id: 'THAMER-SANDBOX-EGS-1',
  model: 'ThamerInvoicing',
  CRN_number: '1003352828',
  VAT_name: 'ThamerInvoicing Sandbox Test',
  VAT_number: '399999999900003',
  branch_name: 'Main Branch',
  branch_industry: 'Real Estate Rental Services',
  location: {
    city: 'Makkah',
    city_subdivision: 'Makkah',
    street: 'Ajyad Street',
    plot_identification: '0000',
    building: '0000',
    postal_zone: '00000',
  },
  private_key: credentials.private_key,
  csr: credentials.csr,
  compliance_certificate: credentials.compliance_certificate,
  compliance_api_secret: credentials.compliance_api_secret,
}

const egs = new EGS(egsUnit)
const now = new Date()
const pad = (n) => String(n).padStart(2, '0')

const invoice = new ZATCAStandardTaxInvoice({
  props: {
    egs_info: egs.get(),
    invoice_counter_number: 1,
    invoice_serial_number: `THAMER-STD-TEST-${Date.now()}`,
    issue_date: now.toISOString().slice(0, 10),
    issue_time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    previous_invoice_hash: FIRST_INVOICE_PIH,
    buyer: {
      name: 'شركة فايف سنتر التجارية (اختبار)',
      vat_number: '311373998500003',
      cr_number: '4031218527',
      city: 'Makkah',
      street: 'Test Street',
    },
    line_items: [
      {
        id: '1',
        name: 'إيجار عقاري تجريبي',
        quantity: 1,
        tax_exclusive_price: 1000,
        VAT_percent: 0.15,
      },
    ],
  },
})
console.log('--- RAW UNSIGNED XML ---')
console.log(invoice.getXML().toString({ no_header: false }))
const { signed_invoice_string, invoice_hash, qr } = egs.signInvoice(invoice)

console.log('--- Invoice built and signed successfully ---')
console.log('Hash:', invoice_hash)

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

console.log('--- ZATCA Sandbox Response ---')
console.log('HTTP Status:', response.status)
console.log(JSON.stringify(response.data, null, 2))