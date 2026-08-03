path = r"src\Payments.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_sort = """  const filteredPayments = (filterProperty === 'الكل'
    ? payments
    : payments.filter(p => getPropertyId(p.lease_id) === filterProperty)
  )
    .filter(p => filterTenants.length === 0 || filterTenants.includes(getTenantId(p.lease_id)))
    .sort((a, b) => hijriSortKey(a.payment_date_hijri) - hijriSortKey(b.payment_date_hijri))"""

new_sort = """  function getEffectiveSortKey(p) {
    const { hijriText } = getPaymentHijriDisplay(p)
    return hijriSortKey(hijriText)
  }

  const filteredPayments = (filterProperty === 'الكل'
    ? payments
    : payments.filter(p => getPropertyId(p.lease_id) === filterProperty)
  )
    .filter(p => filterTenants.length === 0 || filterTenants.includes(getTenantId(p.lease_id)))
    .sort((a, b) => getEffectiveSortKey(a) - getEffectiveSortKey(b))"""

assert content.count(old_sort) == 1, "sort block not found"
content = content.replace(old_sort, new_sort)

old_amount = """  function amountCell(p) {
    const computed = computePaymentStatus(p)
    const due = Number(p.amount || 0)
    const paid = Number(p.amount_paid || 0)
    const taxApplies = isTaxApplicable(p)
    const tax = getTaxAmount(p)
    const inclusive = isAmountVatInclusive(p)
    // لون المبلغ حسب الحالة الفعلية: أخضر لمدفوع، أحمر لمتأخر، رمادي لغير مستحق بعد
    const amountColor = computed === 'paid' ? '#27ae60'
      : computed === 'overdue' ? '#e74c3c'
      : computed === 'not_due' ? '#b7950b'
      : '#27ae60'
    let base
    if (computed === 'partial') {
      const remaining = due - paid
      base = (
        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#f39c12' }}>{paid.toLocaleString()}</span>
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ color: '#e74c3c', fontWeight: 700 }}>{remaining.toLocaleString()}</span>
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ color: '#27ae60' }}>{due.toLocaleString()}</span>
        </span>
      )
    } else {
      base = <span style={{ fontWeight: 700, color: amountColor }}>{due.toLocaleString()} ريال</span>
    }"""

new_amount = """  function amountCell(p) {
    const computed = computePaymentStatus(p)
    const due = Number(p.amount || 0)
    const paid = Number(p.amount_paid || 0)
    const taxApplies = isTaxApplicable(p)
    const tax = getTaxAmount(p)
    const inclusive = isAmountVatInclusive(p)
    // ألوان واضحة ومنفصلة: أخضر=مدفوع، أحمر=متأخر (إجمالي غير محصّل)، رمادي=غير مستحق بعد، ذهبي=جزئي
    const amountColor = computed === 'paid' ? '#27ae60'
      : computed === 'overdue' ? '#e74c3c'
      : computed === 'not_due' ? '#7f8c8d'
      : '#d4ac0d'
    let base
    if (computed === 'partial') {
      const remaining = due - paid
      const partialColor = '#d4ac0d'
      base = (
        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: partialColor }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>مدفوع </span>
          {paid.toLocaleString()}
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>متبقي </span>
          {remaining.toLocaleString()}
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>الإجمالي </span>
          {due.toLocaleString()}
        </span>
      )
    } else {
      base = <span style={{ fontWeight: 700, color: amountColor }}>{due.toLocaleString()} ريال</span>
    }"""

assert content.count(old_amount) == 1, "amountCell block not found"
content = content.replace(old_amount, new_amount)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التصحيح بنجاح ✓")