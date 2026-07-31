import re

path = r"src\Leases.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''  const totalAmount = filteredLeases.reduce((sum, l) => sum + Number(l.rent_amount || 0), 0);'''

new = '''  function getNetRentAmount(lease) {
    const amt = Number(lease.rent_amount || 0);
    if (lease.tax_enabled && lease.amount_includes_vat) {
      return Math.round(amt / 1.15);
    }
    return amt;
  }

  const totalAmount = filteredLeases.reduce((sum, l) => sum + getNetRentAmount(l), 0);'''

if old not in content:
    print("❌ لم يتم العثور على النص المطلوب استبداله. تحقق من الملف يدوياً.")
else:
    content = content.replace(old, new)

    old_label = '''          <span style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 18 }}>
            الإجمالي: {totalAmount.toLocaleString()} ريال
          </span>'''

    new_label = '''          <span style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 18 }}>
            الإجمالي (صافي بدون ضريبة): {totalAmount.toLocaleString()} ريال
          </span>'''

    if old_label in content:
        content = content.replace(old_label, new_label)
    else:
        print("⚠️ لم يتم العثور على تسمية الشارة لتحديثها (التعديل الأساسي تم رغم ذلك).")

    old_export_label = '''    { label: "الإجمالي", value: `${totalAmount.toLocaleString()} ريال`, color: "#1d4ed8" },'''
    new_export_label = '''    { label: "الإجمالي (صافي بدون ضريبة)", value: `${totalAmount.toLocaleString()} ريال`, color: "#1d4ed8" },'''
    if old_export_label in content:
        content = content.replace(old_export_label, new_export_label)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print("✅ تم تحديث Leases.jsx: الإجمالي الآن صافي بدون ضريبة (يطرح 15% من العقود الشاملة للضريبة).")
