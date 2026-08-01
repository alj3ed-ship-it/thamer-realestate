# -*- coding: utf-8 -*-
"""
يضيف بطاقات ملخص تفصيلية (عدد الحجوزات + الإجمالي + تفصيل المصاريف + الصافي)
فوق جدول التقرير المطبوع/PDF لصفحة حجوزات قاعة مذهلة، بدل ما يطلع جدول أسماء خام بدون أرقام.
كذلك يصلح صف البطاقات بمكوّن ExportToolbar ليلتف (wrap) بدل ما ينضغط بصف واحد ضيق.
"""

bookings_path = "src/Bookings.jsx"
toolbar_path = "src/components/ExportToolbar.jsx"

changes = 0

# ============ 1) Bookings.jsx: إضافة title + stats لمكوّن ExportToolbar ============
with open(bookings_path, "r", encoding="utf-8") as f:
    bookings_content = f.read()

old_export = """      <ExportToolbar
        data={filteredBookings.map((b) => ({ ...b, event_date_hijri: formatHijriDisplay(b.event_date_hijri) }))}
        columns={[
          { key: 'event_date_hijri', label: 'التاريخ الهجري' },
          { key: 'event_type', label: 'النوع' },
          { key: 'client_name', label: 'العميل' },
          { key: 'total_amount', label: 'الإجمالي' },
          { key: 'deposit_amount', label: 'العربون' },
          { key: 'remaining_amount', label: 'الباقي' },
          { key: 'remaining_status', label: 'حالة الباقي' },
        ]}
      />"""

new_export = """      <ExportToolbar
        title="حجوزات قاعة مذهلة"
        data={filteredBookings.map((b) => ({ ...b, event_date_hijri: formatHijriDisplay(b.event_date_hijri) }))}
        columns={[
          { key: 'event_date_hijri', label: 'التاريخ الهجري' },
          { key: 'event_type', label: 'النوع' },
          { key: 'client_name', label: 'العميل' },
          { key: 'total_amount', label: 'الإجمالي' },
          { key: 'deposit_amount', label: 'العربون' },
          { key: 'remaining_amount', label: 'الباقي' },
          { key: 'remaining_status', label: 'حالة الباقي' },
        ]}
        stats={[
          { label: 'عدد الحجوزات', value: filteredBookings.length, color: '#1B4D7A' },
          { label: 'إجمالي قيمة الحجوزات', value: `${totalRevenue.toLocaleString()} ر.س`, color: '#1B4D7A' },
          { label: 'دخل إضافي', value: `${totalExtraIncome.toLocaleString()} ر.س`, color: '#148F77' },
          { label: 'الإجمالي الكلي', value: `${grandTotal.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'مباشرين/مباشرات', value: `${totalStaffCost.toLocaleString()} ر.س`, color: '#8E44AD' },
          { label: 'قهوة وشاهي ومنظفات', value: `${totalSuppliesCost.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'الراتب السنوي', value: `${totalSalaryCost.toLocaleString()} ر.س`, color: '#7f8c8d' },
          { label: 'إجمالي المصاريف', value: `${totalExpenses.toLocaleString()} ر.س`, color: '#D35400' },
          { label: 'صافي الدخل', value: `${totalNet.toLocaleString()} ر.س`, color: '#27ae60' },
        ]}
      />"""

if old_export in bookings_content:
    bookings_content = bookings_content.replace(old_export, new_export, 1)
    changes += 1
    with open(bookings_path, "w", encoding="utf-8") as f:
        f.write(bookings_content)
else:
    print("⚠ لم يتم العثور على مكوّن ExportToolbar بـ Bookings.jsx — تحقق يدوياً")

# ============ 2) ExportToolbar.jsx: جعل صف البطاقات يلتف بدل الانضغاط ============
with open(toolbar_path, "r", encoding="utf-8") as f:
    toolbar_content = f.read()

old_styles = """  statsRow: { display: "flex", gap: "14px", marginBottom: "20px" },
  statBox: {
    flex: 1,
    border: "2px solid",
    borderRadius: "10px",
    padding: "12px 18px",
    textAlign: "center",
    background: "#fafbfc",
  },"""
new_styles = """  statsRow: { display: "flex", gap: "14px", marginBottom: "20px", flexWrap: "wrap" },
  statBox: {
    flex: "1 1 160px",
    border: "2px solid",
    borderRadius: "10px",
    padding: "12px 18px",
    textAlign: "center",
    background: "#fafbfc",
  },"""

if old_styles in toolbar_content:
    toolbar_content = toolbar_content.replace(old_styles, new_styles, 1)
    changes += 1
    with open(toolbar_path, "w", encoding="utf-8") as f:
        f.write(toolbar_content)
else:
    print("⚠ لم يتم العثور على styles.statsRow/statBox بـ ExportToolbar.jsx — تحقق يدوياً")

print(f"✅ تم تطبيق {changes} من أصل 2 تعديلات")
