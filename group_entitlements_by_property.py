# -*- coding: utf-8 -*-
"""
1) يعمّم منطق التجميع بـ ExportToolbar.jsx: بدل ما يكون مربوط فقط بعمود "الربع"،
   يقبل أي عمود يُعلَّم بـ group: true (بدون ما يكسر تجميع الربع الموجود بالإقرارات الضريبية).
2) يفعّل التجميع حسب "العقار" بصفحة الاستحقاقات (كل عقار قسم لحاله + إجمالي فرعي)،
   ويضيف عنوان واضح للتقرير المطبوع يوضح الشهر والسنة وحالة الفلتر.
"""

toolbar_path = "src/components/ExportToolbar.jsx"
entitlements_path = "src/Entitlements.jsx"

changes = 0

# ==== 1) تعميم التجميع بـ ExportToolbar.jsx ====
with open(toolbar_path, "r", encoding="utf-8") as f:
    toolbar_content = f.read()

old1 = '  const groupCol = columns.find((c) => c.label === "الربع" || c.key === "quarter");'
new1 = '  const groupCol = columns.find((c) => c.label === "الربع" || c.key === "quarter" || c.group === true);'

if old1 in toolbar_content:
    toolbar_content = toolbar_content.replace(old1, new1, 1)
    with open(toolbar_path, "w", encoding="utf-8") as f:
        f.write(toolbar_content)
    changes += 1
    print("✅ تم تعميم منطق التجميع بـ ExportToolbar.jsx")
else:
    print("⚠ لم يتم العثور على سطر groupCol بـ ExportToolbar.jsx — تحقق يدوياً")

# ==== 2) تفعيل التجميع حسب العقار + عنوان واضح بصفحة الاستحقاقات ====
with open(entitlements_path, "r", encoding="utf-8") as f:
    ent_content = f.read()

old2 = '''            columns={[
              { key: "property", label: "العقار" },
              { key: "tenant", label: "المستأجر" },
              { key: "activity", label: "النشاط" },
              { key: "unit", label: "الوحدة" },
              { key: "dueDateHijri", label: "تاريخ الاستحقاق" },
              { key: "amount", label: "المبلغ المستحق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },
              { key: "taxLabel", label: "الضريبة" },
              { key: "totalWithTax", label: "الإجمالي شامل الضريبة" },
              { key: "statusLabel", label: "الحالة" },
            ]}
            filename={`entitlements_${selectedYear}_${selectedMonthNum}${statusFilter !== "all" ? "_" + statusFilter : ""}`}'''

new2 = '''            columns={[
              { key: "property", label: "العقار", group: true },
              { key: "tenant", label: "المستأجر" },
              { key: "activity", label: "النشاط" },
              { key: "unit", label: "الوحدة" },
              { key: "dueDateHijri", label: "تاريخ الاستحقاق" },
              { key: "amount", label: "المبلغ المستحق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },
              { key: "taxLabel", label: "الضريبة" },
              { key: "totalWithTax", label: "الإجمالي شامل الضريبة" },
              { key: "statusLabel", label: "الحالة" },
            ]}
            filename={`entitlements_${selectedYear}_${selectedMonthNum}${statusFilter !== "all" ? "_" + statusFilter : ""}`}
            title={`جدول الاستحقاقات - ${HIJRI_MONTHS[parseInt(selectedMonthNum) - 1]} ${selectedYear} هـ${statusFilter !== "all" ? " - " + (STATUS_FILTERS.find((f) => f.key === statusFilter)?.label || "") : ""}`}'''

if old2 in ent_content:
    ent_content = ent_content.replace(old2, new2, 1)
    with open(entitlements_path, "w", encoding="utf-8") as f:
        f.write(ent_content)
    changes += 1
    print("✅ تم تفعيل التجميع حسب العقار وإضافة العنوان الواضح بصفحة الاستحقاقات")
else:
    print("⚠ لم يتم العثور على مكوّن ExportToolbar بصفحة الاستحقاقات — تحقق يدوياً")

print(f"\nالإجمالي: تم تطبيق {changes} من أصل 2 تعديلات")
