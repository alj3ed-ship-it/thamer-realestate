# -*- coding: utf-8 -*-
FILE = "src/Payments.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

old_amount_cell = '''  function amountCell(p) {
    const computed = computePaymentStatus(p)
    const due = Number(p.amount || 0)
    const paid = Number(p.amount_paid || 0)
    const taxApplies = isTaxApplicable(p)
    const tax = getTaxAmount(p)
    const inclusive = isAmountVatInclusive(p)
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
      base = <span style={{ fontWeight: 700, color: '#27ae60' }}>{due.toLocaleString()} ريال</span>
    }
    return (
      <div>
        {base}'''

new_amount_cell = '''  function amountCell(p) {
    const computed = computePaymentStatus(p)
    const due = Number(p.amount || 0)
    const paid = Number(p.amount_paid || 0)
    const taxApplies = isTaxApplicable(p)
    const tax = getTaxAmount(p)
    const inclusive = isAmountVatInclusive(p)
    // لون المبلغ حسب الحالة الفعلية: أخضر لمدفوع، أحمر لمتأخر، رمادي لغير مستحق بعد
    const amountColor = computed === 'paid' ? '#27ae60'
      : computed === 'overdue' ? '#e74c3c'
      : computed === 'not_due' ? '#7f8c8d'
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
    }
    return (
      <div>
        {base}'''

if old_amount_cell not in content:
    raise SystemExit("PATCH FAILED: amountCell function not found — aborting safely.")
content = content.replace(old_amount_cell, new_amount_cell)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل Payments.jsx بنجاح — تلوين المبلغ حسب الحالة")
