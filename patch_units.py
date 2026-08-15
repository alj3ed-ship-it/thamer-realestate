import pathlib

path = pathlib.Path("src/Units.jsx")
text = path.read_text(encoding="utf-8")

old = """  const total = units.length
  const rented = units.filter(u => u.status === 'مؤجرة').length
  const vacant = units.filter(u => u.status === 'شاغرة').length
  const maintenance = units.filter(u => u.status === 'صيانة').length
  const taxableCount = units.filter(u => u.vat_status === 'taxable').length"""

new = """  const propertyScoped = filterProperty === 'الكل' ? units : units.filter(u => u.property_id === filterProperty)
  const total = propertyScoped.length
  const rented = propertyScoped.filter(u => u.status === 'مؤجرة').length
  const vacant = propertyScoped.filter(u => u.status === 'شاغرة').length
  const maintenance = propertyScoped.filter(u => u.status === 'صيانة').length
  const taxableCount = propertyScoped.filter(u => u.vat_status === 'taxable').length"""

if old not in text:
    raise SystemExit("OLD BLOCK NOT FOUND")

text = text.replace(old, new)

old_subtitle = """      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>الوحدات</h1>
      <p style={{ color: '#666', margin: '0 0 20px' }}>جميع الوحدات في كل العقارات</p>"""

new_subtitle = """      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>الوحدات</h1>
      <p style={{ color: '#666', margin: '0 0 20px' }}>
        {filterProperty === 'الكل'
          ? 'جميع الوحدات في كل العقارات'
          : `وحدات عقار: ${properties.find(p => p.id === filterProperty)?.name || ''}`}
      </p>"""

if old_subtitle not in text:
    raise SystemExit("SUBTITLE BLOCK NOT FOUND")

text = text.replace(old_subtitle, new_subtitle)

path.write_text(text, encoding="utf-8")
print("تم التعديل بنجاح")
