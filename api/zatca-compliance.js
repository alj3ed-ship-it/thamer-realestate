// Vercel serverless function (Node.js runtime). Bridges the browser to the
// Node-only ZATCA signing/compliance logic in src/lib/zatcaCompliance.js —
// the EGS private key and zatca-xml-js's node:crypto usage must never reach
// client-side code, and calling the sandbox directly from a Vercel function
// avoids the ZATCA API's lack of browser CORS support.

import { runZatcaComplianceCheck } from '../src/lib/zatcaCompliance.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { organization, invoice, items } = req.body || {}

  if (!invoice || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'بيانات الفاتورة (invoice) أو البنود (items) مفقودة' })
  }

  try {
    const result = await runZatcaComplianceCheck({ organization, invoice, items })
    return res.status(200).json(result)
  } catch (error) {
    console.error('zatca-compliance error:', error?.response?.data || error)
    return res.status(500).json({
      error: error?.message || 'حدث خطأ غير متوقع أثناء فحص الامتثال',
      details: error?.response?.data,
    })
  }
}
