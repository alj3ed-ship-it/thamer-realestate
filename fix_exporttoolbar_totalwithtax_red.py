# -*- coding: utf-8 -*-
"""
Patch: يلوّن عمود "الإجمالي شامل الضريبة" بالأحمر (بدل الأزرق) — صار هو
العمود الوحيد للمبلغ الإجمالي بعد حذف عمود "المبلغ المستحق".

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_exporttoolbar_totalwithtax_red.py
"""
import pathlib

FILE = pathlib.Path("src/components/ExportToolbar.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """    if (col.key === "totalWithTax") return "#1B4D7A";"""
NEW = """    if (col.key === "totalWithTax") return "#e74c3c";"""

OLD_ARGB = """    if (col.key === "totalWithTax") return "FF1B4D7A";"""
NEW_ARGB = """    if (col.key === "totalWithTax") return "FFE74C3C";"""

assert content.count(OLD) == 1, f"expected exactly 1 match (hex), found {content.count(OLD)}"
assert content.count(OLD_ARGB) == 1, f"expected exactly 1 match (argb), found {content.count(OLD_ARGB)}"
content = content.replace(OLD, NEW)
content = content.replace(OLD_ARGB, NEW_ARGB)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/components/ExportToolbar.jsx (الإجمالي شامل الضريبة أحمر)")
