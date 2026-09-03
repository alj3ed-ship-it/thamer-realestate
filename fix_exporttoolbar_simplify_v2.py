# -*- coding: utf-8 -*-
"""
Patch (مصحّح): تبسيط منطق تلوين ExportToolbar.jsx — بس عمود "المتبقي"
يطلع أحمر (تنبيه)، وباقي الأعمدة عادية. + خلفية فاتحة لصفوف "متبقي جزء".

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_exporttoolbar_simplify_v2.py
"""
import pathlib

FILE = pathlib.Path("src/components/ExportToolbar.jsx")
content = FILE.read_text(encoding="utf-8")

edits = []

# 1) دالة تلوين صفوف المجاميع: تبسيط لعمود "المتبقي" فقط
edits.append((
"""    if (col.key === "amountDisplay") return "#1B4D7A";
    if (col.key === "paidAmount") return "#27ae60";
    if (col.key === "remainingAmount") return "#f39c12";
    if (col.key === "totalWithTax") return "#e74c3c";
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
    if (col.key === "totalWithTax") return "FFE74C3C";
    if (col.key === "taxLabel") return "FF8E44AD";
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label === "الضريبة") return "FFB42318";""",
"""    if (col.key === "remainingAmount") return "#e74c3c";
    // نمط قديم (تقارير أخرى تستخدم هذا المكوّن، مثل VatReturns)
    if (col.label.includes("الأساسي")) return "#1B4D7A";
    if (col.label === "الضريبة") return "#B42318";
    if (col.label === "المبلغ المستحق") return "#e74c3c";
    return null;
  };
  const amountFontColorArgb = (col) => {
    if (col.key === "remainingAmount") return "FFE74C3C";
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label === "الضريبة") return "FFB42318";"""
))

# 2) خلفية فاتحة لصفوف "متبقي جزء" بالجدول المجمَّع
edits.append((
"""                  group.rows.forEach((row, ri) => {
                    elements.push(
                      <tr key={`row-${gi}-${ri}`} style={{ background: ri % 2 === 0 ? "#ffffff" : "#f5f7fa" }}>""",
"""                  group.rows.forEach((row, ri) => {
                    const statusValRow = statusCol ? String(row[statusCol.key] ?? "") : "";
                    const isPartialRow = statusValRow.includes("جزئي");
                    const rowBg = isPartialRow ? "#F5EFE0" : ri % 2 === 0 ? "#ffffff" : "#f5f7fa";
                    elements.push(
                      <tr key={`row-${gi}-${ri}`} style={{ background: rowBg }}>"""
))

for i, (old, new) in enumerate(edits, 1):
    count = content.count(old)
    assert count == 1, f"edit #{i}: expected exactly 1 match, found {count}\n--- looking for ---\n{old[:200]}"
    content = content.replace(old, new)

FILE.write_text(content, encoding="utf-8")
print(f"تم تطبيق {len(edits)} تعديلات بنجاح ✅ — src/components/ExportToolbar.jsx (تبسيط + خلفية الصف الجزئي)")
