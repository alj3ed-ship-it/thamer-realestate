// Vercel serverless function. Submits a REAL invoice to ZATCA's Reporting
// or Clearance API (not the compliance-check sandbox) — this is a legally
// binding submission once it succeeds. Kept as a separate endpoint from
// api/zatca-compliance.js on purpose: the two must never be reachable
// through the same code path.

import { runProductionInvoiceSubmission } from '../src/lib/zatcaCompliance.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { invoiceId, submissionType, submittedBy } = req.body || {}

  if (!invoiceId) {
    return res.status(400).json({ error: 'invoiceId مفقود' })
  }

  try {
    const result = await runProductionInvoiceSubmission(invoiceId, submissionType, { submittedBy })
    return res.status(200).json(result)
  } catch (error) {
    console.error('zatca-production-invoice error:', error?.response?.data || error)
    return res.status(500).json({
      error: error?.message || 'حدث خطأ غير متوقع أثناء الإرسال الفعلي للهيئة',
      details: error?.response?.data,
    })
  }
}
