# -*- coding: utf-8 -*-
"""
Patch: يصلح تلوين صفوف المجاميع (subtotal / الإجمالي الكلي) بالتقرير
المُصدَّر — بدل التلوين العشوائي بالأحمر لأي عمود فيه كلمة "المستحق" أو
"الضريبة"، صار التلوين محدد لكل عمود حسب معناه الفعلي.

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_exporttoolbar_totals_color.py
"""
import pathlib

FILE = pathlib.Path("src/components/ExportToolbar.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """  const amountFontColor = (col) => {
    if (col.label.includes("الأساسي")) return "#1B4D7A";
    if (col.label.includes("الضريبة")) return "#B42318";
    if (col.label.includes("المستحق")) return "#e74c3c";
    return null;
  };
  const amountFontColorArgb = (col) => {
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label.includes("الضريبة")) return "FFB42318";
    if (col.label.includes("المستحق")) return "FFE74C3C";
    return null;
  };"""

NEW = """  const amountFontColor = (col) => {
    // ألوان صريحة حسب مفتاح العمود (جدول الاستحقاقات) — تُفحص أولاً
    // لتفادي التصادم مع النمط النصي القديم أدناه
    if (col.key === "amountDisplay") return "#1B4D7A";
    if (col.key === "paidAmount") return "#27ae60";
    if (col.key === "remainingAmount") return "#f39c12";
    if (col.key === "totalWithTax") return "#1B4D7A";
    if (col.key === "taxLabel") return "#8e44ad";
    // نمط قديم (تقارير أخرى تستخدم هذا المكوّن، مثل VatReturns)
    if (col.label.includes("الأساسي")) return "#1B4D7A";
    if (col.label === "الضريبة") return "#B42318";
    if (col.label === "المبلغ المستحق") return "#e74c3c";
    return null;
  };
  const amountFontColorArgb = (col) => {
    if (col.key === "amountDisplay") return "FF1B4D7A";
    if (col.key === "paidAmount") return "FF27AE60";
    if (col.key === "remainingAmount") return "FFF39C12";
    if (col.key === "totalWithTax") return "FF1B4D7A";
    if (col.key === "taxLabel") return "FF8E44AD";
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label === "الضريبة") return "FFB42318";
    if (col.label === "المبلغ المستحق") return "FFE74C3C";
    return null;
  };"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/components/ExportToolbar.jsx (تلوين صفوف المجاميع)")
