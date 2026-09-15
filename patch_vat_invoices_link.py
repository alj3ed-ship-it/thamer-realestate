import pathlib

path = pathlib.Path("src/VatReturns.jsx")
content = path.read_text(encoding="utf-8")

# 1) add invoices state
old1 = "  const [filings, setFilings] = useState([])"
new1 = """  const [filings, setFilings] = useState([])
  const [invoices, setInvoices] = useState([])"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) fetch invoices alongside everything else
old2 = """    const [pay, lea, pro, ten, fil] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, tax_enabled, tax_effective_hijri, amount_includes_vat, start_date_hijri, payment_type, payment_frequency'),
      supabase.from('properties').select('id, name'),
      supabase.from('tenants').select('id, name'),
      supabase.from('vat_filings').select('*'),
    ])
    setPayments(pay.data || [])
    setLeases(lea.data || [])
    setProperties(pro.data || [])
    setTenants(ten.data || [])
    setFilings(fil.data || [])
    setLoading(false)"""
new2 = """    const [pay, lea, pro, ten, fil, inv] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, tax_enabled, tax_effective_hijri, amount_includes_vat, start_date_hijri, payment_type, payment_frequency'),
      supabase.from('properties').select('id, name'),
      supabase.from('tenants').select('id, name'),
      supabase.from('vat_filings').select('*'),
      supabase.from('invoices').select('id, invoice_number, customer_name, total_amount, issue_date'),
    ])
    setPayments(pay.data || [])
    setLeases(lea.data || [])
    setProperties(pro.data || [])
    setTenants(ten.data || [])
    setFilings(fil.data || [])
    setInvoices(inv.data || [])
    setLoading(false)"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) add helper to find invoices issued within a given quarter
old3 = """  function getFiling(key) {
    return filings.find(f => f.quarter_key === key)
  }"""
new3 = """  function getFiling(key) {
    return filings.find(f => f.quarter_key === key)
  }

  // فواتير العملاء (من صفحة الفواتير الإلكترونية) اللي تاريخ إصدارها يقع داخل هذا الربع
  function getQuarterInvoices(quarter) {
    const start = new Date(quarter.year, (quarter.q - 1) * 3, 1)
    const end = new Date(quarter.year, quarter.q * 3, 0)
    return invoices
      .filter(inv => {
        if (!inv.issue_date) return false
        const d = new Date(inv.issue_date)
        return d >= start && d <= end
      })
      .sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date))
  }"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) show the quarter's linked invoices under the payment breakdown
old4 = """                  {breakdownList.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {breakdownList.map((b, i) => (
                        <div key={i} style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <span><strong style={{ color: '#374151' }}>{b.property}</strong> — {b.tenant}</span>
                          <span>
                            أساسي <strong style={{ color: '#1d4ed8' }}>{b.base.toLocaleString()}</strong> + ضريبة <strong style={{ color: '#dc2626' }}>{b.tax.toLocaleString()}</strong> ريال
                          </span>
                        </div>
                      ))}
                    </div>
                  )}"""
new4 = """                  {breakdownList.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {breakdownList.map((b, i) => (
                        <div key={i} style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <span><strong style={{ color: '#374151' }}>{b.property}</strong> — {b.tenant}</span>
                          <span>
                            أساسي <strong style={{ color: '#1d4ed8' }}>{b.base.toLocaleString()}</strong> + ضريبة <strong style={{ color: '#dc2626' }}>{b.tax.toLocaleString()}</strong> ريال
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const quarterInvoices = getQuarterInvoices(q)
                    if (quarterInvoices.length === 0) return null
                    return (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e5e7eb' }}>
                        <div style={{ fontSize: 11.5, color: '#374151', fontWeight: 700, marginBottom: 4 }}>فواتير العملاء بهذا الربع ({quarterInvoices.length}):</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {quarterInvoices.map(inv => (
                            <div key={inv.id} style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                              <span><strong style={{ color: '#374151' }}>{inv.invoice_number}</strong> — {inv.customer_name || '—'}</span>
                              <span>{Number(inv.total_amount || 0).toLocaleString()} ريال</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

# 5) remove the "ملف الإقرار" upload button — keep only "إيصال السداد"
old5 = """                    {[
                      { field: 'declaration_file_url', label: 'ملف الإقرار', icon: '📄' },
                      { field: 'payment_receipt_url', label: 'إيصال السداد', icon: '🧾' },
                    ].map(({ field, label, icon }) => {"""
new5 = """                    {[
                      { field: 'payment_receipt_url', label: 'إيصال السداد', icon: '🧾' },
                    ].map(({ field, label, icon }) => {"""
assert content.count(old5) == 1
content = content.replace(old5, new5)

path.write_text(content, encoding="utf-8")
print("Patched src/VatReturns.jsx (invoice linking + removed declaration upload) successfully")