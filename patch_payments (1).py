import pathlib

path = pathlib.Path("src/Payments.jsx")
content = path.read_text(encoding="utf-8")

old1 = """  function statusToArabic(computed) {
    if (computed === 'paid') return 'مدفوع'
    if (computed === 'partial') return 'جزئي'
    if (computed === 'not_due') return 'غير مستحق بعد'
    return 'متأخر'
  }"""
new1 = """  function statusToArabic(computed) {
    if (computed === 'paid') return '✓ مدفوع'
    if (computed === 'partial') return '⚠ جزئي'
    if (computed === 'not_due') return '⏳ غير مستحق بعد'
    return '⏰ متأخر'
  }"""
assert content.count(old1) == 1, "old1 not found or not unique"
content = content.replace(old1, new1)

old2 = """      amount: computed === 'partial'
        ? `${paid.toLocaleString()} | ${(due - paid).toLocaleString()} | ${due.toLocaleString()}`
        : `${due.toLocaleString()} ريال`,"""
new2 = """      amount: computed === 'partial'
        ? {
            value: `${due.toLocaleString()} ريال`,
            color: '#d4ac0d',
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: '#B42318'
          }
        : {
            value: `${due.toLocaleString()} ريال`,
            color: computed === 'paid' ? '#27ae60' : computed === 'overdue' ? '#e74c3c' : '#7f8c8d'
          },"""
assert content.count(old2) == 1, "old2 not found or not unique"
content = content.replace(old2, new2)

path.write_text(content, encoding="utf-8")
print("Payments.jsx patched successfully.")
