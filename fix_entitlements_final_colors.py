# -*- coding: utf-8 -*-
"""
Patch: يغيّر لون "المبلغ المتبقي" بملف التصدير إلى أحمر (بدل برتقالي)،
ويلوّن تواريخ الدفعات الجزئية بالبرتقالي.

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_entitlements_final_colors.py
"""
import pathlib

FILE = pathlib.Path("src/Entitlements.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """        remainingAmount: { value: `${remaining.toLocaleString()} ريال`, color: remaining > 0 ? "#f39c12" : "#27ae60" },
        lastPaymentDate: lastPaymentLabel,"""

NEW = """        remainingAmount: { value: `${remaining.toLocaleString()} ريال`, color: remaining > 0 ? "#e74c3c" : "#27ae60" },
        lastPaymentDate: { value: lastPaymentLabel, color: (r.historyEntries && r.historyEntries.length > 1) ? "#f39c12" : undefined },"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/Entitlements.jsx (المتبقي أحمر / تواريخ الدفعات الجزئية برتقالي)")
