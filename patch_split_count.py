import io

path = "src/Bookings.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = """      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SummaryCard label="عدد الحجوزات" value={filteredBookings.length} color="#1B4D7A" />
        <SummaryCard label="المصاريف" value={`${totalExpenses.toLocaleString()} ر.س`} color="#D35400" />"""
new1 = """      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SummaryCard label="عدد الحجوزات النشطة" value={activeFilteredBookings.length} color="#1B4D7A" />
        <SummaryCard label="عدد الحجوزات الملغاة" value={filteredBookings.length - activeFilteredBookings.length} color="#f39c12" />
        <SummaryCard label="المصاريف" value={`${totalExpenses.toLocaleString()} ر.س`} color="#D35400" />"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم فصل عدد الحجوزات النشطة عن الملغاة بنجاح ✅")