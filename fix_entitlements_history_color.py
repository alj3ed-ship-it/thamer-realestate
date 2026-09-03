# -*- coding: utf-8 -*-
"""
Patch: يلوّن قائمة تواريخ الدفعات الجزئية (تحت عمود "المبلغ" بجدول
الاستحقاقات داخل التطبيق) بالبرتقالي بدل الرمادي — لأنها كلها مبالغ جزئية.

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_entitlements_history_color.py
"""
import pathlib

FILE = pathlib.Path("src/Entitlements.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """        {r.historyEntries && r.historyEntries.length > 1 && (
          <div style={{ fontSize: 10.5, color: "#6b7280", marginTop: 3 }}>
            {r.historyEntries.map((h, idx) => (
              <div key={h.id || idx}>
                • {Number(h.amount || 0).toLocaleString()} ريال{h.payment_date_hijri ? ` — ${h.payment_date_hijri} هـ` : ""}
              </div>
            ))}
          </div>
        )}"""

NEW = """        {r.historyEntries && r.historyEntries.length > 1 && (
          <div style={{ fontSize: 10.5, color: "#f39c12", marginTop: 3, fontWeight: "bold" }}>
            {r.historyEntries.map((h, idx) => (
              <div key={h.id || idx}>
                • {Number(h.amount || 0).toLocaleString()} ريال{h.payment_date_hijri ? ` — ${h.payment_date_hijri} هـ` : ""}
              </div>
            ))}
          </div>
        )}"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/Entitlements.jsx (تواريخ الدفعات الجزئية بالبرتقالي)")
