import fs from 'node:fs'
import { EGS, ZATCASimplifiedTaxInvoice } from 'zatca-xml-js'
import signingPkg from 'zatca-xml-js/lib/zatca/signing/index.js'
import { ZATCAStandardTaxInvoice } from './src/lib/zatca/ZATCAStandardTaxInvoice.js'

const { getPureInvoiceString } = signingPkg

const credentials = JSON.parse(fs.readFileSync('./zatca_sandbox_credentials.json', 'utf8'))
const egsUnit = {
  uuid: credentials.egs_uuid,
  custom_id: 'THAMER-SANDBOX-EGS-1',
  model: 'ThamerInvoicing',
  CRN_number: '1003352828',
  VAT_name: 'ThamerInvoicing Sandbox Test',
  VAT_number: '399999999900003',
  branch_name: 'Main Branch',
  branch_industry: 'Real Estate Rental Services',
  location: { city: 'Makkah', city_subdivision: 'Makkah', street: 'Ajyad Street', plot_identification: '0000', building: '0000', postal_zone: '00000' },
  private_key: credentials.private_key,
  csr: credentials.csr,
  compliance_certificate: credentials.compliance_certificate,
  compliance_api_secret: credentials.compliance_api_secret,
}
const egs = new EGS(egsUnit)
const now = new Date()
const pad = (n) => String(n).padStart(2, '0')
const FIRST_PIH = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ=='

// --- Simplified (known working) ---
const simplified = new ZATCASimplifiedTaxInvoice({
  props: {
    egs_info: egs.get(),
    invoice_counter_number: 1,
    invoice_serial_number: 'DEBUG-SIMPLIFIED-1',
    issue_date: now.toISOString().slice(0, 10),
    issue_time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    previous_invoice_hash: FIRST_PIH,
    line_items: [{ id: '1', name: 'Test', quantity: 1, tax_exclusive_price: 1000, VAT_percent: 0.15 }],
  },
})
fs.writeFileSync('debug_simplified_pure.txt', getPureInvoiceString(simplified.getXML()))

// --- Standard (broken) ---
const standard = new ZATCAStandardTaxInvoice({
  props: {
    egs_info: egs.get(),
    invoice_counter_number: 1,
    invoice_serial_number: 'DEBUG-STANDARD-1',
    issue_date: now.toISOString().slice(0, 10),
    issue_time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    previous_invoice_hash: FIRST_PIH,
    buyer: { name: 'Test Buyer', vat_number: '311373998500003', cr_number: '4031218527', city: 'Makkah', street: 'Test St' },
    line_items: [{ id: '1', name: 'Test', quantity: 1, tax_exclusive_price: 1000, VAT_percent: 0.15 }],
  },
})
fs.writeFileSync('debug_standard_pure.txt', getPureInvoiceString(standard.getXML()))

console.log('Done. Compare debug_simplified_pure.txt vs debug_standard_pure.txt')