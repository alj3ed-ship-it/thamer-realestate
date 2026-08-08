path = "src/Entitlements.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة amount_includes_vat لاستعلام العقود
old1 = '''      id, property_id, start_date_hijri, tax_enabled, tax_effective_hijri,
        properties ( name, priority ),'''
new1 = '''      id, property_id, start_date_hijri, tax_enabled, tax_effective_hijri, amount_includes_vat,
        properties ( name, priority ),'''
assert content.count(old1) == 1, "old1 not found or not unique"
content = content.replace(old1, new1)

# 2) إضافة دالة حساب الضريبة الصحيحة (تراعي amount_includes_vat)
old2 = 'const TAX_RATE = 0.15;'
new2 = '''const TAX_RATE = 0.15;

function computeTaxAmount(lease, amountDue) {
  const amt = Number(amountDue || 0);
  if (lease?.amount_includes_vat) {
    return Math.round(amt - (amt / 1.15));
  }
  return Math.round(amt * TAX_RATE);
}'''
assert content.count(old2) == 1, "old2 not found or not unique"
content = content.replace(old2, new2)

# 3) استخدام الدالة الصحيحة بدل الضرب المباشر بـ 15%
old3 = '''      const taxApplies = isTaxApplicable(lease, dueDateHijri);
      const taxAmount = taxApplies ? Math.round(Number(row.amount_due || 0) * TAX_RATE) : 0;'''
new3 = '''      const taxApplies = isTaxApplicable(lease, dueDateHijri);
      const includesVat = !!lease.amount_includes_vat;
      const taxAmount = taxApplies ? computeTaxAmount(lease, row.amount_due) : 0;
      const grossTotal = taxApplies && includesVat ? Number(row.amount_due || 0) : Number(row.amount_due || 0) + taxAmount;'''
assert content.count(old3) == 1, "old3 not found or not unique"
content = content.replace(old3, new3)

# 4) حفظ includesVat و grossTotal مع كل صف
old4 = '''        taxApplies,
        taxAmount,
      });'''
new4 = '''        taxApplies,
        taxAmount,
        includesVat,
        grossTotal,
      });'''
assert content.count(old4) == 1, "old4 not found or not unique"
content = content.replace(old4, new4)

# 5) إجمالي شامل الضريبة الصحيح (بدون تكرار الضريبة على المبالغ الشاملة أصلاً)
old5 = '  const totalWithTax = totalAmount + totalTax;'
new5 = '  const totalWithTax = filteredResults.reduce((sum, r) => sum + (r.grossTotal ?? ((r.amount || 0) + (r.taxAmount || 0))), 0);'
assert content.count(old5) == 1, "old5 not found or not unique"
content = content.replace(old5, new5)

# 6) نفس الإصلاح داخل تصدير Excel/PDF
old6 = '''        taxLabel: r.taxApplies ? `${r.taxAmount.toLocaleString()} ريال` : "—",
        totalWithTax: r.taxApplies ? `${(r.amount + r.taxAmount).toLocaleString()} ريال` : `${r.amount.toLocaleString()} ريال`,'''
new6 = '''        taxLabel: r.taxApplies ? `${r.taxAmount.toLocaleString()} ريال` : "—",
        totalWithTax: r.taxApplies ? `${(r.grossTotal ?? (r.amount + r.taxAmount)).toLocaleString()} ريال` : `${r.amount.toLocaleString()} ريال`,'''
assert content.count(old6) == 1, "old6 not found or not unique"
content = content.replace(old6, new6)

# 7) عرض الضريبة بالجدول: شامل داخل المبلغ (لا يُضاف) أو مضافة عليه، حسب الحالة
old7 = '''        {r.taxApplies && (
          <div style={{ fontSize: 11, color: "#8e44ad", marginTop: 2, fontWeight: "bold" }}>
            + ضريبة 15%: {r.taxAmount.toLocaleString()} = {(r.amount + r.taxAmount).toLocaleString()} ريال
          </div>
        )}'''
new7 = '''        {r.taxApplies && (
          <div style={{ fontSize: 11, color: "#8e44ad", marginTop: 2, fontWeight: "bold" }}>
            {r.includesVat
              ? `شامل ضريبة 15%: ${r.taxAmount.toLocaleString()} ريال (ضمن المبلغ أعلاه)`
              : `+ ضريبة 15%: ${r.taxAmount.toLocaleString()} = ${(r.amount + r.taxAmount).toLocaleString()} ريال`}
          </div>
        )}'''
assert content.count(old7) == 1, "old7 not found or not unique"
content = content.replace(old7, new7)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅ (7 تعديلات)")
