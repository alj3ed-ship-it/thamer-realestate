# -*- coding: utf-8 -*-
"""
Patch: يلوّن عمود "المبلغ المدفوع" و"المبلغ المتبقي" بالتقرير المُصدَّر:
- المدفوع: أخضر لو مكتمل بالكامل، برتقالي لو جزئي، رمادي لو صفر
- المتبقي: برتقالي لو فيه مبلغ متبقي، أخضر لو صفر

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_entitlements_colors.py
"""
import pathlib

FILE = pathlib.Path("src/Entitlements.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """        amountDisplay: { value: `${r.amount.toLocaleString()} ريال`, color: amountColor },
        remainingAmount: { value: `${remaining.toLocaleString()} ريال`, color: remaining > 0 ? "#e74c3c" : "#27ae60" },
        lastPaymentDate: lastPaymentLabel,"""

NEW = """        amountDisplay: { value: `${r.amount.toLocaleString()} ريال`, color: amountColor },
        paidAmount: { value: `${r.paidAmount.toLocaleString()} ريال`, color: r.paidState === "full" ? "#27ae60" : r.paidState === "partial" ? "#f39c12" : "#7f8c8d" },
        remainingAmount: { value: `${remaining.toLocaleString()} ريال`, color: remaining > 0 ? "#f39c12" : "#27ae60" },
        lastPaymentDate: lastPaymentLabel,"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/Entitlements.jsx (تلوين المدفوع/المتبقي)")
