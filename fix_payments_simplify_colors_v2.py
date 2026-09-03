# -*- coding: utf-8 -*-
"""
Patch (مصحّح): تبسيط تلوين عمود "المبلغ" بتقرير الدفعات المصدَّر.

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_payments_simplify_colors_v2.py
"""
import pathlib

FILE = pathlib.Path("src/Payments.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """      amount: (computed === 'partial' || computed === 'partial_early')
        ? {
            value: `${due.toLocaleString()} ريال`,
            color: computed === 'partial_early' ? '#2E86C1' : '#d4ac0d',
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: computed === 'partial_early' ? '#2E86C1' : '#B42318'
          }
        : {
            value: `${due.toLocaleString()} ريال`,
            color: computed === 'paid' ? '#27ae60' : computed === 'overdue' ? '#e74c3c' : '#7f8c8d'
          },"""

NEW = """      amount: (computed === 'partial' || computed === 'partial_early')
        ? {
            value: `${due.toLocaleString()} ريال`,
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: '#e74c3c'
          }
        : `${due.toLocaleString()} ريال`,"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/Payments.jsx (تبسيط تلوين المبلغ)")
