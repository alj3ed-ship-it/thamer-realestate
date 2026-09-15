import pathlib

path = pathlib.Path("src/Bookings/index.jsx")
content = path.read_text(encoding="utf-8")

old1 = """      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
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
      </div>"""
assert content.count(old1) == 1, f"old1 match count: {content.count(old1)}"

new1 = """      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          list="hall-client-names"
          placeholder="اختر عميلاً لتصدير حجوزاته فقط..."
          value={clientExportSearch}
          onChange={(e) => setClientExportSearch(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', width: 280, fontFamily: 'Cairo, sans-serif', fontSize: 13 }}
        />
        <datalist id="hall-client-names">
          {[...new Set(filteredBookings.map((b) => b.client_name).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'ar'))
            .map((name) => (
              <option key={name} value={name} />
            ))}
        </datalist>
        {clientExportSearch.trim() && (
          <button
            type="button"
            onClick={() => setClientExportSearch('')}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 13 }}
          >
            إلغاء البحث
          </button>
        )}
      </div>"""
content = content.replace(old1, new1)

old2 = """        stats={[
          { label: 'عدد الحجوزات النشطة', value: activeFilteredBookings.length, color: '#1B4D7A' },
          { label: 'عدد الحجوزات الملغاة', value: filteredBookings.length - activeFilteredBookings.length, color: '#f39c12' },
          { label: 'إجمالي قيمة الحجوزات', value: `${totalRevenue.toLocaleString()} ر.س`, color: '#1B4D7A' },
          { label: 'دخل إضافي', value: `${totalExtraIncome.toLocaleString()} ر.س`, color: '#148F77' },
          { label: 'الإجمالي الكلي', value: `${grandTotal.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'مباشرين/مباشرات', value: `${totalStaffCost.toLocaleString()} ر.س`, color: '#8E44AD' },
          { label: 'قهوة وشاهي ومنظفات', value: `${totalSuppliesCost.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'عمولة أبو أيوب', value: `${totalAbuAyoubCost.toLocaleString()} ر.س`, color: '#6C3483' },
          { label: 'الراتب السنوي', value: `${totalSalaryCost.toLocaleString()} ر.س`, color: '#7f8c8d' },
          { label: 'الكهرباء السنوية', value: `${totalElectricityCost.toLocaleString()} ر.س`, color: '#B7950B' },
          { label: 'الماء', value: `${totalWaterCost.toLocaleString()} ر.س`, color: '#2E86C1' },
          { label: 'إجمالي المصاريف', value: `${totalExpenses.toLocaleString()} ر.س`, color: '#D35400' },
          { label: 'صافي الدخل', value: `${totalNet.toLocaleString()} ر.س`, color: '#27ae60' },
        ]}"""
assert content.count(old2) == 1, f"old2 match count: {content.count(old2)}"

new2 = """        stats={clientExportSearch.trim() ? null : [
          { label: 'عدد الحجوزات النشطة', value: activeFilteredBookings.length, color: '#1B4D7A' },
          { label: 'عدد الحجوزات الملغاة', value: filteredBookings.length - activeFilteredBookings.length, color: '#f39c12' },
          { label: 'إجمالي قيمة الحجوزات', value: `${totalRevenue.toLocaleString()} ر.س`, color: '#1B4D7A' },
          { label: 'دخل إضافي', value: `${totalExtraIncome.toLocaleString()} ر.س`, color: '#148F77' },
          { label: 'الإجمالي الكلي', value: `${grandTotal.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'مباشرين/مباشرات', value: `${totalStaffCost.toLocaleString()} ر.س`, color: '#8E44AD' },
          { label: 'قهوة وشاهي ومنظفات', value: `${totalSuppliesCost.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'عمولة أبو أيوب', value: `${totalAbuAyoubCost.toLocaleString()} ر.س`, color: '#6C3483' },
          { label: 'الراتب السنوي', value: `${totalSalaryCost.toLocaleString()} ر.س`, color: '#7f8c8d' },
          { label: 'الكهرباء السنوية', value: `${totalElectricityCost.toLocaleString()} ر.س`, color: '#B7950B' },
          { label: 'الماء', value: `${totalWaterCost.toLocaleString()} ر.س`, color: '#2E86C1' },
          { label: 'إجمالي المصاريف', value: `${totalExpenses.toLocaleString()} ر.س`, color: '#D35400' },
          { label: 'صافي الدخل', value: `${totalNet.toLocaleString()} ر.س`, color: '#27ae60' },
        ]}"""
content = content.replace(old2, new2)

path.write_text(content, encoding="utf-8")
print("Patched successfully.")