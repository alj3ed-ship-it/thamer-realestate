# -*- coding: utf-8 -*-
"""
Patch: تبسيط تقرير الاستحقاقات المصدَّر — اللون يُستخدم للتنبيه فقط
(المتبقي أحمر لو فيه مبلغ)، وباقي الأرقام نص عادي. تبسيط عمود تاريخ آخر
دفعة، وتقليل بطاقات الإحصائيات من 6 إلى 3 (+ اثنتين شرطيتين لو فيه ضريبة).

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_entitlements_simplify.py
"""
import pathlib

FILE = pathlib.Path("src/Entitlements.jsx")
content = FILE.read_text(encoding="utf-8")

edits = []

# 1) تاريخ الاستحقاق: حذف اللون الأحمر الثابت
edits.append((
"""        dueDateHijri: {
          value: `${r.dueDateHijri} هـ`,
          color: "#e74c3c",
          subtext: r.paymentDateHijri ? `✓ ${r.paymentDateHijri} هـ` : null,
          subtextColor: "#27ae60",
        },""",
"""        dueDateHijri: {
          value: `${r.dueDateHijri} هـ`,
          subtext: r.paymentDateHijri ? `✓ ${r.paymentDateHijri} هـ` : null,
          subtextColor: "#27ae60",
        },"""
))

# 2) المبلغ المدفوع: نص عادي بدون لون
edits.append((
"""        paidAmount: { value: `${r.paidAmount.toLocaleString()} ريال`, color: r.paidState === "full" ? "#27ae60" : r.paidState === "partial" ? "#f39c12" : "#7f8c8d" },""",
"""        paidAmount: `${r.paidAmount.toLocaleString()} ريال`,"""
))

# 3) المبلغ المتبقي: أحمر فقط لو فيه مبلغ فعلي، غير كذا عادي
edits.append((
"""        remainingAmount: { value: `${remaining.toLocaleString()} ريال`, color: remaining > 0 ? "#e74c3c" : "#27ae60" },""",
"""        remainingAmount: remaining > 0 ? { value: `${remaining.toLocaleString()} ريال`, color: "#e74c3c" } : `${remaining.toLocaleString()} ريال`,"""
))

# 4) تبسيط حساب تاريخ آخر دفعة (آخر دفعة بس + عدد الدفعات)
edits.append((
"""      const lastPaymentLabel = r.historyEntries && r.historyEntries.length > 0
        ? r.historyEntries.map(h => `${Number(h.amount || 0).toLocaleString()} ريال${h.payment_date_hijri ? ` (${h.payment_date_hijri} هـ)` : ""}`).join(" + ")
        : (r.paymentDateHijri ? `${r.paymentDateHijri} هـ` : (r.firstPartialDateHijri ? `${r.firstPartialDateHijri} هـ (جزئي)` : "—"));""",
"""      const lastHistoryEntry = r.historyEntries && r.historyEntries.length > 0 ? r.historyEntries[r.historyEntries.length - 1] : null;
      const lastPaymentLabel = lastHistoryEntry
        ? `${lastHistoryEntry.payment_date_hijri ? lastHistoryEntry.payment_date_hijri + " هـ" : "—"}${r.historyEntries.length > 1 ? ` (${r.historyEntries.length} دفعات)` : ""}`
        : (r.paymentDateHijri ? `${r.paymentDateHijri} هـ` : (r.firstPartialDateHijri ? `${r.firstPartialDateHijri} هـ` : "—"));"""
))

# 5) تاريخ آخر دفعة: نص عادي بدون لون
edits.append((
"""        lastPaymentDate: { value: lastPaymentLabel, color: (r.historyEntries && r.historyEntries.length > 1) ? "#f39c12" : undefined },""",
"""        lastPaymentDate: lastPaymentLabel,"""
))

# 6) بطاقات الإحصائيات: من 6 إلى 3 (+ اثنتين شرطيتين لو فيه ضريبة فعلية)
edits.append((
"""            stats={[
              { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#27ae60" },
              { label: "إجمالي المتبقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#e74c3c" },
              { label: "إجمالي المستحق", value: `${totalAmount.toLocaleString()} ريال`, color: "#1B4D7A" },
              { label: "إجمالي الضريبة", value: `${totalTax.toLocaleString()} ريال`, color: "#8e44ad" },
              { label: "الإجمالي شامل الضريبة", value: `${totalWithTax.toLocaleString()} ريال`, color: "#1B4D7A" },
              { label: "الصافي بدون ضريبة", value: `${totalNet.toLocaleString()} ريال`, color: "#16a085" },
            ]}""",
"""            stats={[
              { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#27ae60" },
              { label: "إجمالي المتبقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#e74c3c" },
              { label: "الإجمالي شامل الضريبة", value: `${totalWithTax.toLocaleString()} ريال`, color: "#1B4D7A" },
              ...(totalTax > 0 ? [
                { label: "إجمالي الضريبة", value: `${totalTax.toLocaleString()} ريال`, color: "#8e44ad" },
                { label: "الصافي بدون ضريبة", value: `${totalNet.toLocaleString()} ريال`, color: "#16a085" },
              ] : []),
            ]}"""
))

for i, (old, new) in enumerate(edits, 1):
    count = content.count(old)
    assert count == 1, f"edit #{i}: expected exactly 1 match, found {count}\n--- looking for ---\n{old[:200]}"
    content = content.replace(old, new)

FILE.write_text(content, encoding="utf-8")
print(f"تم تطبيق {len(edits)} تعديلات بنجاح ✅ — src/Entitlements.jsx (تبسيط الألوان)")
