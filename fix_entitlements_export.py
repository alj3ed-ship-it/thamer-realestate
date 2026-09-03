# -*- coding: utf-8 -*-
"""
Patch: يضيف عمود "المبلغ المتبقي" وعمود "تاريخ آخر دفعة" (يعرض كل الدفعات
الجزئية بتاريخها) لتقرير جدول الاستحقاقات المُصدَّر (PDF/Excel/طباعة).

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_entitlements_export.py
"""
import pathlib

FILE = pathlib.Path("src/Entitlements.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """      return {
        ...r,
        dueDateHijri: {
          value: `${r.dueDateHijri} هـ`,
          color: "#e74c3c",
          subtext: r.paymentDateHijri ? `✓ ${r.paymentDateHijri} هـ` : null,
          subtextColor: "#27ae60",
        },
        amountDisplay: { value: `${r.amount.toLocaleString()} ريال`, color: amountColor },
        statusLabel: { value: r.statusLabel, color: statusColor },
        taxLabel: r.taxApplies ? `${r.taxAmount.toLocaleString()} ريال` : "—",
        totalWithTax: r.taxApplies ? `${(r.grossTotal ?? (r.amount + r.taxAmount)).toLocaleString()} ريال` : `${r.amount.toLocaleString()} ريال`,
      };
    })}
            columns={[
              { key: "property", label: "العقار", group: true },
              { key: "tenant", label: "المستأجر" },
              { key: "activity", label: "النشاط" },
              { key: "unit", label: "الوحدة" },
              { key: "dueDateHijri", label: "تاريخ الاستحقاق" },
              { key: "amountDisplay", label: "المبلغ المستحق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },
              { key: "taxLabel", label: "الضريبة" },
              { key: "totalWithTax", label: "الإجمالي شامل الضريبة" },
              { key: "statusLabel", label: "الحالة" },
            ]}"""

NEW = """      const remaining = Math.max((r.amount || 0) - (r.paidAmount || 0), 0);
      const lastPaymentLabel = r.historyEntries && r.historyEntries.length > 0
        ? r.historyEntries.map(h => `${Number(h.amount || 0).toLocaleString()} ريال${h.payment_date_hijri ? ` (${h.payment_date_hijri} هـ)` : ""}`).join(" + ")
        : (r.paymentDateHijri ? `${r.paymentDateHijri} هـ` : (r.firstPartialDateHijri ? `${r.firstPartialDateHijri} هـ (جزئي)` : "—"));
      return {
        ...r,
        dueDateHijri: {
          value: `${r.dueDateHijri} هـ`,
          color: "#e74c3c",
          subtext: r.paymentDateHijri ? `✓ ${r.paymentDateHijri} هـ` : null,
          subtextColor: "#27ae60",
        },
        amountDisplay: { value: `${r.amount.toLocaleString()} ريال`, color: amountColor },
        remainingAmount: { value: `${remaining.toLocaleString()} ريال`, color: remaining > 0 ? "#e74c3c" : "#27ae60" },
        lastPaymentDate: lastPaymentLabel,
        statusLabel: { value: r.statusLabel, color: statusColor },
        taxLabel: r.taxApplies ? `${r.taxAmount.toLocaleString()} ريال` : "—",
        totalWithTax: r.taxApplies ? `${(r.grossTotal ?? (r.amount + r.taxAmount)).toLocaleString()} ريال` : `${r.amount.toLocaleString()} ريال`,
      };
    })}
            columns={[
              { key: "property", label: "العقار", group: true },
              { key: "tenant", label: "المستأجر" },
              { key: "activity", label: "النشاط" },
              { key: "unit", label: "الوحدة" },
              { key: "dueDateHijri", label: "تاريخ الاستحقاق" },
              { key: "amountDisplay", label: "المبلغ المستحق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },
              { key: "remainingAmount", label: "المبلغ المتبقي" },
              { key: "lastPaymentDate", label: "تاريخ آخر دفعة" },
              { key: "taxLabel", label: "الضريبة" },
              { key: "totalWithTax", label: "الإجمالي شامل الضريبة" },
              { key: "statusLabel", label: "الحالة" },
            ]}"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/Entitlements.jsx")
