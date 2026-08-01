# -*- coding: utf-8 -*-
"""
يضيف فلتر تبويبات لنوع الحفلة (كاملة / رجال / نساء / أخرى) بصفحة حجوزات قاعة مذهلة
يشتغل جنب فلتر السنين الموجود، وما يمسح ولا يغير أي شي ثاني بالملف
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1) إضافة state لنوع الحفلة المختار
old1 = "  const [selectedYear, setSelectedYear] = useState('all');"
new1 = (
    "  const [selectedYear, setSelectedYear] = useState('all');\n"
    "  const [selectedType, setSelectedType] = useState('all');"
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على سطر selectedYear state — تحقق يدوياً")

# 2) تعديل منطق الفلترة ليشمل النوع مع السنة معاً
old2 = """  const filteredBookings = selectedYear === 'all'
    ? approvedBookings
    : approvedBookings.filter((b) => getHijriYear(b.event_date_hijri) === selectedYear);"""
new2 = """  const filteredBookings = approvedBookings.filter((b) => {
    const yearMatch = selectedYear === 'all' || getHijriYear(b.event_date_hijri) === selectedYear;
    const typeMatch = selectedType === 'all' || b.event_type === selectedType;
    return yearMatch && typeMatch;
  });"""
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على منطق filteredBookings الأصلي — تحقق يدوياً")

# 3) إضافة تبويبات نوع الحفلة تحت تبويبات السنين مباشرة
old3 = """        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            style={yearTabStyle(selectedYear === y)}
          >
            {y} هـ
          </button>
        ))}
      </div>"""
new3 = """        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            style={yearTabStyle(selectedYear === y)}
          >
            {y} هـ
          </button>
        ))}
      </div>

      {/* تبويبات نوع الحفلة */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedType('all')}
          style={typeTabStyle('all', selectedType === 'all')}
        >
          كل الأنواع
        </button>
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            style={typeTabStyle(t, selectedType === t)}
          >
            {t}
          </button>
        ))}
      </div>"""
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على مكان تبويبات السنين — تحقق يدوياً")

# 4) إضافة دالة typeTabStyle جنب yearTabStyle
old4 = """function yearTabStyle(active) {
  return {
    padding: '8px 20px',
    borderRadius: '8px',
    border: active ? 'none' : '1px solid #ddd',
    background: active ? '#1B4D7A' : '#fff',
    color: active ? '#fff' : '#555',
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer',
  };
}"""
new4 = """function yearTabStyle(active) {
  return {
    padding: '8px 20px',
    borderRadius: '8px',
    border: active ? 'none' : '1px solid #ddd',
    background: active ? '#1B4D7A' : '#fff',
    color: active ? '#fff' : '#555',
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer',
  };
}

function typeTabStyle(type, active) {
  const c = TYPE_COLORS[type] || { text: '#1B4D7A', border: '#ddd' };
  return {
    padding: '8px 20px',
    borderRadius: '8px',
    border: active ? 'none' : `1px solid ${c.border}`,
    background: active ? c.text : '#fff',
    color: active ? '#fff' : c.text,
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer',
  };
}"""
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على دالة yearTabStyle — تحقق يدوياً")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ تم تطبيق {changes} من أصل 4 تعديلات على {path}")
