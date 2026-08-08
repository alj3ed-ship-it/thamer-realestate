path = "src/Entitlements.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة دالة تحسم مصدر التاريخ: أولوية للتاريخ اليدوي المخزّن، وإلا حساب تلقائي من بداية العقد
old1 = '''  return `${hy}/${String(hm).padStart(2, "0")}/${String(hd).padStart(2, "0")}`;
}'''
new1 = '''  return `${hy}/${String(hm).padStart(2, "0")}/${String(hd).padStart(2, "0")}`;
}

// تاريخ استحقاق القسط: نعطي الأولوية للتاريخ المخزّن يدوياً (مطابقةً لمنطق صفحة الإقرارات الضريبية)
// ونحسبه تلقائياً من بداية العقد فقط إذا ما فيه تاريخ مخزّن
function getDueHijri(lease, row) {
  if (row.payment_date_hijri) {
    const parsed = parseHijri(row.payment_date_hijri);
    if (parsed) return parsed;
  }
  if (row.payment_date) {
    const hijriText = gregorianToHijri(row.payment_date);
    const parsed = parseHijri(hijriText);
    if (parsed) return parsed;
  }
  return computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
}'''
assert content.count(old1) == 1, "old1 not found or not unique"
content = content.replace(old1, new1)

# 2) استخدام الدالة الجديدة بدل الحساب التلقائي المباشر
old2 = '      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);'
new2 = '      const hijri = getDueHijri(lease, row);'
assert content.count(old2) == 1, "old2 not found or not unique"
content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅ (2 تعديلات)")
