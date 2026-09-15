import pathlib

path = pathlib.Path("src/VatReturns.jsx")
content = path.read_text(encoding="utf-8")

# 1) select lease_id too (needed for the real link)
old1 = "supabase.from('invoices').select('id, invoice_number, customer_name, total_amount, issue_date'),"
new1 = "supabase.from('invoices').select('id, invoice_number, customer_name, total_amount, issue_date, lease_id'),"
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) replace the date-range matching with lease_id matching against the quarter's
# own breakdown (which is keyed by lease.id — the same leases whose payments
# actually produced this quarter's tax figures)
old2 = """  // فواتير العملاء (من صفحة الفواتير الإلكترونية) اللي تاريخ إصدارها يقع داخل هذا الربع
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
new2 = """  // فواتير العملاء (من صفحة الفواتير الإلكترونية) المرتبطة بنفس العقود اللي أنتجت
  // أرقام هذا الربع فعلياً — الربط بالعقد (lease_id) مو بتاريخ الإصدار الحر اليدوي،
  // لأن تاريخ الإصدار حقل يدوي ما له علاقة ضرورية بموعد استحقاق الدفعة الفعلي
  function getQuarterInvoices(quarter) {
    const leaseIds = new Set(Object.keys(quarter.breakdown))
    return invoices
      .filter(inv => inv.lease_id && leaseIds.has(inv.lease_id))
      .sort((a, b) => new Date(a.issue_date || 0) - new Date(b.issue_date || 0))
  }"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

path.write_text(content, encoding="utf-8")
print("Patched src/VatReturns.jsx (invoice-to-quarter linking now based on lease_id) successfully")