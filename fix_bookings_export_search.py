import pathlib

path = pathlib.Path("src/Bookings/index.jsx")
content = path.read_text(encoding="utf-8")

old1 = "  const [selectedType, setSelectedType] = useState('all');"
assert content.count(old1) == 1, f"old1 match count: {content.count(old1)}"
new1 = old1 + "\n  const [clientExportSearch, setClientExportSearch] = useState('');"
content = content.replace(old1, new1)

old2 = """      <ExportToolbar
        title={`حجوزات قاعة مذهلة${selectedYear !== 'all' ? ' - سنة ' + selectedYear + ' هـ' : ' - كل السنين'}${selectedType !== 'all' ? ' - ' + selectedType : ''}`}
        data={filteredBookings.map((b) => ({
          ...b,
          event_date_hijri: formatHijriDisplay(b.event_date_hijri),
          booking_status_label: (CANCEL_STATUS_LABELS[b.booking_status] || {}).label || 'نشط',
        }))}"""
assert content.count(old2) == 1, f"old2 match count: {content.count(old2)}"
new2 = """      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          placeholder="ابحث باسم العميل لتصدير حجوزاته فقط..."
          value={clientExportSearch}
          onChange={(e) => setClientExportSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', width: 280, fontFamily: 'Cairo, sans-serif', fontSize: 13 }}
        />
        {clientExportSearch.trim() && (
          <button
            type="button"
            onClick={() => setClientExportSearch('')}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}
          >
            إلغاء البحث
          </button>
        )}
      </div>

      <ExportToolbar
        title={`حجوزات قاعة مذهلة${selectedYear !== 'all' ? ' - سنة ' + selectedYear + ' هـ' : ' - كل السنين'}${selectedType !== 'all' ? ' - ' + selectedType : ''}${clientExportSearch.trim() ? ' - العميل: ' + clientExportSearch.trim() : ''}`}
        data={filteredBookings
          .filter((b) => !clientExportSearch.trim() || (b.client_name || '').includes(clientExportSearch.trim()))
          .map((b) => ({
          ...b,
          event_date_hijri: formatHijriDisplay(b.event_date_hijri),
          booking_status_label: (CANCEL_STATUS_LABELS[b.booking_status] || {}).label || 'نشط',
        }))}"""
content = content.replace(old2, new2)

path.write_text(content, encoding="utf-8")
print("Patched successfully.")