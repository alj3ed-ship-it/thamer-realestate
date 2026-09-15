import pathlib

path = pathlib.Path("src/Payments.jsx")
content = path.read_text(encoding="utf-8")

old1 = """      amount: (() => {
        const amountColor = computed === 'paid' ? '#27ae60'
          : computed === 'overdue' ? '#e74c3c'
          : computed === 'not_due' ? '#7f8c8d'
          : computed === 'partial_early' ? '#2E86C1'
          : '#d4ac0d'
        if (computed === 'partial' || computed === 'partial_early') {
          return {
            value: `${due.toLocaleString()} ريال`,
            color: amountColor,
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: amountColor
          }
        }
        return { value: `${due.toLocaleString()} ريال`, color: amountColor }
      })(),
      tax: taxApplies ? `${getTaxAmount(p).toLocaleString()} ريال` : '—',
      totalWithTax: taxApplies ? `${getTotalWithTax(p).toLocaleString()} ريال` : `${due.toLocaleString()} ريال`,"""

assert content.count(old1) == 1, f"old1 match count: {content.count(old1)}"

new1 = """      amount: `${Math.round(getBaseAmount(p)).toLocaleString()} ريال`,
      tax: taxApplies ? `${getTaxAmount(p).toLocaleString()} ريال` : '—',
      totalWithTax: (() => {
        const amountColor = computed === 'paid' ? '#27ae60'
          : computed === 'overdue' ? '#e74c3c'
          : computed === 'not_due' ? '#7f8c8d'
          : computed === 'partial_early' ? '#2E86C1'
          : '#d4ac0d'
        const gross = taxApplies ? Math.round(getBaseAmount(p) + getTaxAmount(p)) : due
        if (computed === 'partial' || computed === 'partial_early') {
          return {
            value: `${gross.toLocaleString()} ريال`,
            color: amountColor,
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: amountColor
          }
        }
        return { value: `${gross.toLocaleString()} ريال`, color: amountColor }
      })(),"""

content = content.replace(old1, new1)

old2 = "const totalWithTax = filteredPayments.reduce((s, p) => s + getTotalWithTax(p), 0)"
assert content.count(old2) == 1, f"old2 match count: {content.count(old2)}"
new2 = "const totalWithTax = filteredPayments.reduce((s, p) => s + (isTaxApplicable(p) ? Math.round(getBaseAmount(p) + getTaxAmount(p)) : Number(p.amount || 0)), 0)"
content = content.replace(old2, new2)

old3 = "الضريبة: {totalTax.toLocaleString()} ريال — الإجمالي الفعلي المستلم: {totalWithTax.toLocaleString()} ريال"
assert content.count(old3) == 1, f"old3 match count: {content.count(old3)}"
new3 = "الضريبة: {totalTax.toLocaleString()} ريال — الإجمالي: {totalWithTax.toLocaleString()} ريال"
content = content.replace(old3, new3)

old4 = "{ key: 'totalWithTax', label: 'الإجمالي الفعلي' },"
assert content.count(old4) == 1, f"old4 match count: {content.count(old4)}"
new4 = "{ key: 'totalWithTax', label: 'الإجمالي' },"
content = content.replace(old4, new4)

old5 = "{ label: 'الإجمالي الفعلي', value: `${totalWithTax.toLocaleString()} ريال`, color: '#1B4D7A' },"
assert content.count(old5) == 1, f"old5 match count: {content.count(old5)}"
new5 = "{ label: 'الإجمالي', value: `${totalWithTax.toLocaleString()} ريال`, color: '#1B4D7A' },"
content = content.replace(old5, new5)

path.write_text(content, encoding="utf-8")
print("Patched successfully.")