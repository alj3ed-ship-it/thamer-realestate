// Vercel serverless function. Issues a Credit or Debit Note referencing an
// already-cleared invoice, using the same ZATCA sandbox compliance flow.

import { runZatcaCreditDebitNote } from '../src/lib/zatcaCompliance.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { organization, originalInvoice, noteType, reason, items } = req.body || {}

  if (!originalInvoice || !noteType || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'بيانات الفاتورة الأصلية أو نوع الإشعار أو البنود مفقودة' })
  }

  try {
    const result = await runZatcaCreditDebitNote({ organization, originalInvoice, noteType, reason, items })
    return res.status(200).json(result)
  } catch (error) {
    console.error('zatca-credit-debit-note error:', error?.response?.data || error)
    return res.status(500).json({
      error: error?.message || 'حدث خطأ غير متوقع أثناء إصدار الإشعار',
      details: error?.response?.data,
    })
  }
}
