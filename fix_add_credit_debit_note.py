import pathlib

path = pathlib.Path("src/lib/zatcaCompliance.js")
content = path.read_text(encoding="utf-8")

# 1) نستورد ZATCAInvoiceTypes عشان نقدر نحدد نوع الإشعار
old_import = "import { ZATCAStandardTaxInvoice } from './zatca/ZATCAStandardTaxInvoice.js'\n"
new_import = (
    "import { ZATCAStandardTaxInvoice } from './zatca/ZATCAStandardTaxInvoice.js'\n"
    "import { ZATCAInvoiceTypes } from './zatca/standardTaxInvoiceTemplate.js'\n"
)
assert content.count(old_import) == 1
content = content.replace(old_import, new_import)

# 2) نضيف الدالة الجديدة في نهاية الملف
addition = '''

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
'''

assert content.count(addition.strip()[:50]) == 0  # تأكيد إن الدالة مو مضافة من قبل
content = content.rstrip() + "\n" + addition
path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅")