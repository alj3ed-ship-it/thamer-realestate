# -*- coding: utf-8 -*-
"""
Patch: يحذف عمود "المبلغ المستحق" من التقرير المصدَّر (يكتفى بـ
"الإجمالي شامل الضريبة" فقط، يغطي الحالتين بضريبة وبدونها).

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_entitlements_remove_due_column.py
"""
import pathlib

FILE = pathlib.Path("src/Entitlements.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """              { key: "dueDateHijri", label: "تاريخ الاستحقاق" },
              { key: "amountDisplay", label: "المبلغ المستحق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },"""

NEW = """              { key: "dueDateHijri", label: "تاريخ الاستحقاق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/Entitlements.jsx (حذف عمود المبلغ المستحق)")
