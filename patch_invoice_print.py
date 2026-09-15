import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

# 1) add printingInvoice state right after selectedTenantId state
old1 = "  const [selectedTenantId, setSelectedTenantId] = useState('')"
new1 = """  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [printingInvoice, setPrintingInvoice] = useState(null)"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) close the print overlay automatically after the print dialog closes,
# and trigger window.print() once the printable content is ready
old2 = "  useEffect(() => { fetchAll() }, [])"
new2 = """  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    function handleAfterPrint() { setPrintingInvoice(null) }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  useEffect(() => {
    if (printingInvoice) {
      const t = setTimeout(() => window.print(), 200)
      return () => clearTimeout(t)
    }
  }, [printingInvoice])"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) add the print handler right after handleDeleteDraft
old3 = """    setFormSuccess('تم حذف المسودة بنجاح')
    fetchAll()
  }"""
new3 = """    setFormSuccess('تم حذف المسودة بنجاح')
    fetchAll()
  }

  async function handlePrintInvoice(inv) {
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
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) insert the print overlay + page-scoped print CSS right after the outer wrapper div opens
old4 = """  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        onClick={onBack}"""
new4 = """  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .inv-print-area, .inv-print-area * { visibility: visible; }
          .inv-print-area { position: fixed; inset: 0; }
          .inv-hide-print { display: none !important; }
        }
      `}</style>

      {printingInvoice && (
        <div className="inv-print-area" style={{
          position: 'fixed', inset: 0, background: '#fff', zIndex: 9999, padding: 40,
          overflow: 'auto', fontFamily: 'Cairo, sans-serif', direction: 'rtl',
        }}>
          <button className="inv-hide-print" onClick={() => setPrintingInvoice(null)}
            style={{ position: 'absolute', top: 16, left: 16, padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
            ✕ إغلاق
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1B4D7A', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, color: '#1B4D7A' }}>{printingInvoice.organization?.name || 'فاتورة ضريبية'}</h2>
              {printingInvoice.organization?.vat_number && <div style={{ fontSize: 13, color: '#6b7280' }}>الرقم الضريبي: {printingInvoice.organization.vat_number}</div>}
              {printingInvoice.organization?.cr_number && <div style={{ fontSize: 13, color: '#6b7280' }}>السجل التجاري: {printingInvoice.organization.cr_number}</div>}
              {printingInvoice.organization?.address && <div style={{ fontSize: 13, color: '#6b7280' }}>{printingInvoice.organization.address}</div>}
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0 }}>{printingInvoice.invoice.invoice_type}</h3>
              <div style={{ fontSize: 13, color: '#6b7280' }}>رقم الفاتورة: {printingInvoice.invoice.invoice_number}</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>تاريخ الإصدار: {printingInvoice.invoice.issue_date || '—'}</div>
              {printingInvoice.invoice.due_date && <div style={{ fontSize: 13, color: '#6b7280' }}>تاريخ الاستحقاق: {printingInvoice.invoice.due_date}</div>}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 8px', color: '#1B4D7A' }}>بيانات العميل</h4>
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div><strong>{printingInvoice.invoice.customer_name}</strong></div>
              {printingInvoice.invoice.customer_vat_number && <div>الرقم الضريبي: {printingInvoice.invoice.customer_vat_number}</div>}
              {printingInvoice.invoice.customer_cr_number && <div>السجل التجاري: {printingInvoice.invoice.customer_cr_number}</div>}
              {printingInvoice.invoice.customer_id_number && <div>رقم الهوية/الإقامة: {printingInvoice.invoice.customer_id_number}</div>}
              {printingInvoice.invoice.customer_city && <div>المدينة: {printingInvoice.invoice.customer_city}</div>}
              {printingInvoice.invoice.customer_address && <div>العنوان: {printingInvoice.invoice.customer_address}</div>}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>البيان</th>
                <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>الكمية</th>
                <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>سعر الوحدة</th>
                <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>الإجمالي قبل الضريبة</th>
                <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>الضريبة 15%</th>
                <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>الإجمالي شامل</th>
              </tr>
            </thead>
            <tbody>
              {printingInvoice.items.map(it => (
                <tr key={it.id}>
                  <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{it.description}</td>
                  <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{it.quantity}</td>
                  <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{Number(it.unit_price).toLocaleString()}</td>
                  <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{Number(it.line_total).toLocaleString()}</td>
                  <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{Number(it.vat_amount).toLocaleString()}</td>
                  <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{(Number(it.line_total) + Number(it.vat_amount)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              {printingInvoice.qrDataUrl && (
                <img src={printingInvoice.qrDataUrl} alt="ZATCA QR" width={140} height={140} />
              )}
            </div>
            <div style={{ textAlign: 'left', fontSize: 14 }}>
              <div>الإجمالي قبل الضريبة: {Number(printingInvoice.invoice.subtotal || 0).toLocaleString()} ريال</div>
              <div>ضريبة القيمة المضافة (15%): {Number(printingInvoice.invoice.vat_amount || 0).toLocaleString()} ريال</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>الإجمالي شامل الضريبة: {Number(printingInvoice.invoice.total_amount || 0).toLocaleString()} ريال</div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onBack}"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

# 5) add a "طباعة" header column
old5 = '<th style={{ padding: \'10px 12px\', fontSize: 13, color: \'#6b7280\' }}>فحص ZATCA (تجريبي)</th>'
new5 = '''<th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>فحص ZATCA (تجريبي)</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>طباعة</th>'''
assert content.count(old5) == 1
content = content.replace(old5, new5)

# 6) add a print button cell for every invoice row (draft or not)
old6 = """                    </td>
                  </tr>
                ))}
              </tbody>"""
new6 = """                    </td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handlePrintInvoice(inv)}
                        style={{
                          padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                          borderRadius: 6, border: '1px solid #1B4D7A', background: '#fff',
                          color: '#1B4D7A', fontWeight: 700,
                        }}>
                        🖨 طباعة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>"""
assert content.count(old6) == 1
content = content.replace(old6, new6)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx (print invoice) successfully")