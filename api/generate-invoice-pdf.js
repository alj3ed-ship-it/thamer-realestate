import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import QRCode from 'qrcode'
import { createClient } from '@supabase/supabase-js'
import { TAJAWAL_FONT_CSS } from './tajawal-font.js'

export const config = { maxDuration: 30 }

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function esc(v) { return (v ?? '').toString().replace(/</g, '&lt;') }

async function buildHtml(invoiceId) {
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()

  const [itemsRes, organizationRes, orgSettingsRes] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order'),
    supabase.from('organizations').select('*').eq('id', invoice.organization_id).maybeSingle(),
    supabase.from('organization_settings').select('*').eq('organization_id', invoice.organization_id).maybeSingle(),
  ])
  const { data: items } = itemsRes
  const { data: organization } = organizationRes
  const { data: orgSettings } = orgSettingsRes

  let qrImg = ''
  if (invoice.qr_code) {
    const qrDataUrl = await QRCode.toDataURL(invoice.qr_code, { width: 160 })
    qrImg = `<img src="${qrDataUrl}" width="100" height="100" style="display:block;margin-inline-start:auto" />`
  }

  const addressLines = (organization?.address || '').split('\n').map(l => `<div>${esc(l)}</div>`).join('')

  const idTypeLabel = invoice.customer_id_type === 'iqama' ? 'رقم الإقامة' : invoice.customer_id_type === 'national_id' ? 'رقم الهوية الوطنية' : 'رقم الهوية/الإقامة'

  const itemsRows = (items || []).map((it, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#F5F5F5' : '#fff'}">
      <td style="padding:7px 8px;border:1px solid #ddd">${idx + 1}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${esc(it.description)}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${it.quantity}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${Number(it.unit_price).toLocaleString()}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${Number(it.vat_amount).toLocaleString()}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${Number(it.line_total).toLocaleString()}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${(Number(it.line_total) + Number(it.vat_amount)).toLocaleString()}</td>
    </tr>`).join('')

  const bankBlock = orgSettings?.bank_details_enabled ? `
    <div style="margin-bottom:18px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tbody>
          ${orgSettings.bank_name ? `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;background:#F3F3F3;width:130px">البنك</td><td style="padding:6px 10px;border:1px solid #ddd">${esc(orgSettings.bank_name)}</td></tr>` : ''}
          ${orgSettings.account_name ? `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;background:#F3F3F3">اسم الحساب</td><td style="padding:6px 10px;border:1px solid #ddd">${esc(orgSettings.account_name)}</td></tr>` : ''}
          ${orgSettings.account_number ? `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;background:#F3F3F3">رقم الحساب</td><td style="padding:6px 10px;border:1px solid #ddd" dir="ltr">${esc(orgSettings.account_number)}</td></tr>` : ''}
          ${orgSettings.iban ? `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;background:#F3F3F3">رقم الآيبان</td><td style="padding:6px 10px;border:1px solid #ddd" dir="ltr">${esc(orgSettings.iban)}</td></tr>` : ''}
        </tbody>
      </table>
    </div>` : ''

  const notesBlock = (orgSettings?.notes_enabled && orgSettings?.invoice_notes_ar) ? `
    <div style="margin-bottom:18px;font-size:12px;color:#555;background:#F7F7F7;padding:8px 12px;border-radius:4px">${esc(orgSettings.invoice_notes_ar)}</div>` : ''

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<style>
  ${TAJAWAL_FONT_CSS}
  * { box-sizing: border-box; }
  body { font-family: 'Tajawal', sans-serif; direction: rtl; text-align: right; margin: 0; padding: 38px 45px 32px; color:#111; }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
    <div>
      <h2 style="margin:0;font-size:20px">${esc(organization?.name || 'فاتورة ضريبية')}</h2>
      ${organization?.phone ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">رقم الجوال: <span dir="ltr">${esc(organization.phone)}</span></div>` : ''}
      <div style="font-size:13px;color:#6b7280;margin-top:4px;line-height:1.6">${addressLines}</div>
    </div>
    <div style="text-align:left">
      ${qrImg}
      ${organization?.cr_number ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">السجل التجاري: <span dir="ltr">${esc(organization.cr_number)}</span></div>` : ''}
      ${organization?.vat_number ? `<div style="font-size:12px;color:#6b7280">الرقم الضريبي: <span dir="ltr">${esc(organization.vat_number)}</span></div>` : ''}
    </div>
  </div>

  <div style="text-align:center;border-top:1px solid #333;border-bottom:1px solid #333;padding:6px 0;margin:16px 0">
    <h3 style="margin:0;font-size:15px">${esc(invoice.invoice_type)}</h3>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
    <div style="flex:1">
      <h4 style="margin:0 0 6px;font-size:13px">بيانات العميل</h4>
      <div style="font-size:12px;line-height:1.7">
        <div><strong>${esc(invoice.customer_name)}</strong></div>
        ${invoice.customer_vat_number ? `<div>الرقم الضريبي: <span dir="ltr">${esc(invoice.customer_vat_number)}</span></div>` : ''}
        ${invoice.customer_cr_number ? `<div>السجل التجاري: <span dir="ltr">${esc(invoice.customer_cr_number)}</span></div>` : ''}
        ${invoice.customer_id_number ? `<div>${idTypeLabel}: <span dir="ltr">${esc(invoice.customer_id_number)}</span></div>` : ''}
        ${invoice.customer_phone ? `<div>رقم الجوال: <span dir="ltr">${esc(invoice.customer_phone)}</span></div>` : ''}
        ${invoice.customer_city ? `<div>المدينة: ${esc(invoice.customer_city)}</div>` : ''}
        ${invoice.customer_address ? `<div>العنوان: ${esc(invoice.customer_address)}</div>` : ''}
      </div>
    </div>
    <div style="text-align:left;font-size:12px;color:#6b7280">
      <div>رقم الفاتورة: <span dir="ltr">${esc(invoice.invoice_number)}</span></div>
      <div>تاريخ الإصدار: <span dir="ltr">${esc(invoice.issue_date || '—')}</span></div>
      ${invoice.due_date ? `<div>تاريخ الاستحقاق: <span dir="ltr">${esc(invoice.due_date)}</span></div>` : ''}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px">
    <thead>
      <tr style="background:#1a1a1a;color:#fff;text-align:right">
        <th style="padding:7px 8px;border:1px solid #ccc">#</th>
        <th style="padding:7px 8px;border:1px solid #ccc">الوصف</th>
        <th style="padding:7px 8px;border:1px solid #ccc">الكمية</th>
        <th style="padding:7px 8px;border:1px solid #ccc">سعر الوحدة</th>
        <th style="padding:7px 8px;border:1px solid #ccc">الضريبة 15%</th>
        <th style="padding:7px 8px;border:1px solid #ccc">المجموع الفرعي بدون الضريبة</th>
        <th style="padding:7px 8px;border:1px solid #ccc">الإجمالي</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:18px">
    <div style="padding:10px 4px;min-width:240px;font-size:12.5px">
      <div style="margin-bottom:3px">الإجمالي قبل الضريبة: ${Number(invoice.subtotal || 0).toLocaleString()} ريال</div>
      <div style="margin-bottom:3px">ضريبة القيمة المضافة (15%): ${Number(invoice.vat_amount || 0).toLocaleString()} ريال</div>
      <div style="border-top:1px solid #ccc;margin:6px 0"></div>
      <div style="font-weight:700;font-size:15px">الإجمالي النهائي: ${Number(invoice.total_amount || 0).toLocaleString()} ريال</div>
      <div style="border-top:1px solid #ccc;margin:6px 0"></div>
      <div style="margin-bottom:3px">المستلم: ${Number(invoice.amount_paid || 0).toLocaleString()} ريال</div>
      <div>المتبقي: ${(Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)).toLocaleString()} ريال</div>
    </div>
  </div>

  ${bankBlock}
  ${notesBlock}

  <div style="border-top:1px solid #ccc;padding-top:10px;margin-top:4px;font-size:10.5px;color:#888">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <div>* هذا المستند صادر من النظام الإلكتروني</div>
      <div><span dir="ltr">${esc(invoice.issue_date || '')}</span></div>
    </div>
    <div style="display:flex;justify-content:space-between">
      <div>${organization?.phone ? `رقم الجوال: <span dir="ltr">${esc(organization.phone)}</span> — ` : ''}${esc(organization?.name)}</div>
      <div>1/1</div>
    </div>
  </div>
</body>
</html>`
}

export default async function handler(req, res) {
  try {
    const invoiceId = req.method === 'POST' ? req.body.invoiceId : req.query.invoiceId
    if (!invoiceId) { res.status(400).json({ error: 'invoiceId مطلوب' }); return }

    const html = await buildHtml(invoiceId)

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdfBuffer = await page.pdf({ format: 'a4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
    await browser.close()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.status(200).end(pdfBuffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}