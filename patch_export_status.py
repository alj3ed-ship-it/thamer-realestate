import io

path = "src/Bookings.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = """      <ExportToolbar
        title={`حجوزات قاعة مذهلة${selectedYear !== 'all' ? ' - سنة ' + selectedYear + ' هـ' : ' - كل السنين'}${selectedType !== 'all' ? ' - ' + selectedType : ''}`}
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
          { label: 'إجمالي قيمة الحجوزات', value: `${totalRevenue.toLocaleString()} ر.س`, color: '#1B4D7A' },"""
new1 = """      <ExportToolbar
        title={`حجوزات قاعة مذهلة${selectedYear !== 'all' ? ' - سنة ' + selectedYear + ' هـ' : ' - كل السنين'}${selectedType !== 'all' ? ' - ' + selectedType : ''}`}
        data={filteredBookings.map((b) => ({
          ...b,
          event_date_hijri: formatHijriDisplay(b.event_date_hijri),
          booking_status_label: (CANCEL_STATUS_LABELS[b.booking_status] || {}).label || 'نشط',
        }))}
        columns={[
          { key: 'event_date_hijri', label: 'التاريخ الهجري' },
          { key: 'event_type', label: 'النوع' },
          { key: 'client_name', label: 'العميل' },
          { key: 'total_amount', label: 'الإجمالي' },
          { key: 'deposit_amount', label: 'العربون' },
          { key: 'remaining_amount', label: 'الباقي' },
          { key: 'remaining_status', label: 'حالة الباقي' },
          { key: 'booking_status_label', label: 'حالة الحجز' },
        ]}
        stats={[
          { label: 'عدد الحجوزات النشطة', value: activeFilteredBookings.length, color: '#1B4D7A' },
          { label: 'عدد الحجوزات الملغاة', value: filteredBookings.length - activeFilteredBookings.length, color: '#f39c12' },
          { label: 'إجمالي قيمة الحجوزات', value: `${totalRevenue.toLocaleString()} ر.س`, color: '#1B4D7A' },"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم توحيد تقرير PDF/Excel مع الشاشة بنجاح ✅")