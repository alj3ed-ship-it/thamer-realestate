import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

# 1) imports: useRef + html2canvas + jsPDF
old1 = """import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'"""
new1 = """import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) add a ref to the printable content
old2 = "  const [printingInvoice, setPrintingInvoice] = useState(null)"
new2 = """  const [printingInvoice, setPrintingInvoice] = useState(null)
  const printAreaRef = useRef(null)"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) mode-aware effect: 'print' opens the browser print dialog (unchanged),
# 'pdf' captures the same content and downloads it directly as a PDF file
old3 = """  useEffect(() => {
    if (printingInvoice) {
      const t = setTimeout(() => window.print(), 200)
      return () => clearTimeout(t)
    }
  }, [printingInvoice])"""
new3 = """  useEffect(() => {
    if (!printingInvoice) return

    if (printingInvoice.mode === 'print') {
      const t = setTimeout(() => window.print(), 200)
      return () => clearTimeout(t)
    }

    if (printingInvoice.mode === 'pdf') {
      let cancelled = false
      ;(async () => {
        await new Promise(r => setTimeout(r, 200))
        const node = printAreaRef.current
        if (!node || cancelled) { setPrintingInvoice(null); return }
        try {
          const canvas = await html2canvas(node, {
            scale: 2, useCORS: true, backgroundColor: '#ffffff', foreignObjectRendering: false,
          })
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
          const pageWidth = pdf.internal.pageSize.getWidth()
          const pageHeight = pdf.internal.pageSize.getHeight()
          const margin = 10
          const usableWidth = pageWidth - margin * 2
          const usableHeight = pageHeight - margin * 2
          const imgHeight = (canvas.height * usableWidth) / canvas.width
          const imgData = canvas.toDataURL('image/png')

          let heightLeft = imgHeight
          let position = margin
          pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight)
          heightLeft -= usableHeight
          while (heightLeft > 0) {
            pdf.addPage()
            position = margin - (imgHeight - heightLeft)
            pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight)
            heightLeft -= usableHeight
          }
          pdf.save(`${printingInvoice.invoice.invoice_number}.pdf`)
        } catch (err) {
          alert('فشل توليد PDF: ' + err.message)
        } finally {
          if (!cancelled) setPrintingInvoice(null)
        }
      })()
      return () => { cancelled = true }
    }
  }, [printingInvoice])"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) handlePrintInvoice now takes an explicit mode ('print' default, or 'pdf')
old4 = """  async function handlePrintInvoice(inv) {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')
    let qrDataUrl = null
    if (inv.qr_code) {
      try { qrDataUrl = await QRCode.toDataURL(inv.qr_code, { width: 160 }) } catch {}
    }
    const organization = organizations.find(o => o.id === inv.organization_id) || null
    setPrintingInvoice({ invoice: inv, items: items || [], qrDataUrl, organization })
  }"""
new4 = """  async function handlePrintInvoice(inv, mode = 'print') {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')
    let qrDataUrl = null
    if (inv.qr_code) {
      try { qrDataUrl = await QRCode.toDataURL(inv.qr_code, { width: 160 }) } catch {}
    }
    const organization = organizations.find(o => o.id === inv.organization_id) || null
    setPrintingInvoice({ invoice: inv, items: items || [], qrDataUrl, organization, mode })
  }"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

# 5) attach the ref to the printable content div
old5 = """      {printingInvoice && (
        <div className="inv-print-area" style={{
          position: 'fixed', inset: 0, background: '#fff', zIndex: 9999, padding: 40,
          overflow: 'auto', fontFamily: 'Cairo, sans-serif', direction: 'rtl',
        }}>"""
new5 = """      {printingInvoice && (
        <div ref={printAreaRef} className="inv-print-area" style={{
          position: 'fixed', inset: 0, background: '#fff', zIndex: 9999, padding: 40,
          overflow: 'auto', fontFamily: 'Cairo, sans-serif', direction: 'rtl',
        }}>"""
assert content.count(old5) == 1
content = content.replace(old5, new5)

# 6) add a second "تحميل PDF" button next to "طباعة" in the table
old6 = """                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(inv)}
                        style={{
                          padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                          borderRadius: 6, border: '1px solid #1B4D7A', background: '#fff',
                          color: '#1B4D7A', fontWeight: 700,
                        }}>
                        🖨 طباعة
                      </button>"""
new6 = """                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(inv, 'print')}
                          style={{
                            padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                            borderRadius: 6, border: '1px solid #1B4D7A', background: '#fff',
                            color: '#1B4D7A', fontWeight: 700,
                          }}>
                          🖨 طباعة
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(inv, 'pdf')}
                          style={{
                            padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                            borderRadius: 6, border: '1px solid #27ae60', background: '#fff',
                            color: '#27ae60', fontWeight: 700,
                          }}>
                          ⬇️ تحميل PDF
                        </button>
                      </div>"""
assert content.count(old6) == 1
content = content.replace(old6, new6)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx (direct PDF download) successfully")