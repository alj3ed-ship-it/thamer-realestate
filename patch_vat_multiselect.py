import re

path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1) استبدال state exportScope بـ selectedQuarters
old1 = "  const [exportScope, setExportScope] = useState('all')"
new1 = "  const [selectedQuarters, setSelectedQuarters] = useState([]) // فارغ = كل الأرباع"
replacements.append((old1, new1))

# 2) تعديل buildExportRows لتقبل مصفوفة مفاتيح بدل قيمة واحدة
old2 = """  function buildExportRows(scope) {
    const list = scope === 'all' ? quarters : quarters.filter(q => q.key === scope)"""
new2 = """  function buildExportRows(selected) {
    const list = selected.length === 0 ? quarters : quarters.filter(q => selected.includes(q.key))"""
replacements.append((old2, new2))

# 3) استبدال exportData / exportStatsScoped بمنطق متعدد الاختيار
old3 = """  const exportData = buildExportRows(exportScope)
  const exportStatsScoped = exportScope === 'all'
    ? [
        { label: 'إجمالي الضريبة', value: `${grandTotalTax.toLocaleString()} ريال`, color: '#dc2626' },
        { label: 'غير مقدَّم', value: `${unfiledTax.toLocaleString()} ريال`, color: '#e74c3c' },
      ]
    : (() => {
        const q = quarters.find(x => x.key === exportScope)
        return q ? [
          { label: 'الإيراد الأساسي', value: `${q.baseTotal.toLocaleString()} ريال`, color: '#1d4ed8' },
          { label: 'الضريبة المستحقة', value: `${q.taxTotal.toLocaleString()} ريال`, color: '#dc2626' },
        ] : []
      })()"""
new3 = """  const exportData = buildExportRows(selectedQuarters)
  const isAllSelected = selectedQuarters.length === 0 || selectedQuarters.length === quarters.length
  const selectedList = isAllSelected ? quarters : quarters.filter(q => selectedQuarters.includes(q.key))
  const scopedBaseTotal = selectedList.reduce((s, q) => s + q.baseTotal, 0)
  const scopedTaxTotal = selectedList.reduce((s, q) => s + q.taxTotal, 0)
  const exportStatsScoped = isAllSelected
    ? [
        { label: 'إجمالي الضريبة', value: `${grandTotalTax.toLocaleString()} ريال`, color: '#dc2626' },
        { label: 'غير مقدَّم', value: `${unfiledTax.toLocaleString()} ريال`, color: '#e74c3c' },
      ]
    : [
        { label: 'الإيراد الأساسي', value: `${scopedBaseTotal.toLocaleString()} ريال`, color: '#1d4ed8' },
        { label: 'الضريبة المستحقة', value: `${scopedTaxTotal.toLocaleString()} ريال`, color: '#dc2626' },
      ]
  const scopeSuffix = isAllSelected ? 'all' : selectedQuarters.slice().sort().join('_')
  const scopeTitle = isAllSelected
    ? 'تقرير الإقرارات الضريبية'
    : selectedQuarters.length === 1
      ? `إقرار ${selectedQuarters[0]}`
      : `إقرارات ${selectedQuarters.slice().sort().join(' + ')}`"""
replacements.append((old3, new3))

# 4) استبدال قائمة الـ select المنسدلة بشريط أزرار تحديد الكل / مسح
old4 = """          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: '#374151' }}>تصدير:</label>
            <select value={exportScope} onChange={e => setExportScope(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
              <option value="all">كل الإقرارات</option>
              {quarters.map(q => (
                <option key={q.key} value={q.key}>{q.key} ({getQuarterRangeLabel(q.year, q.q)})</option>
              ))}
            </select>
          </div>"""
new4 = """          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>تصدير/طباعة:</label>
            <button
              onClick={() => setSelectedQuarters(quarters.map(q => q.key))}
              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              تحديد الكل
            </button>
            <button
              onClick={() => setSelectedQuarters([])}
              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
              مسح التحديد (= الكل)
            </button>
            <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
              {isAllSelected ? 'سيتم تصدير/طباعة كل الأرباع' : `محدد: ${selectedQuarters.length} ربع`}
            </span>
          </div>"""
replacements.append((old4, new4))

# 5) تحديث filename / title في ExportToolbar
old5 = """            filename={exportScope === 'all' ? 'vat_returns_report' : `vat_return_${exportScope}`}
            title={exportScope === 'all' ? 'تقرير الإقرارات الضريبية' : `إقرار ${exportScope}`}"""
new5 = """            filename={`vat_returns_${scopeSuffix}`}
            title={scopeTitle}"""
replacements.append((old5, new5))

# 6) إضافة checkbox تحديد على كل بطاقة ربع
old6 = """                    <div style={{ minWidth: 190 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1B4D7A' }}>
                        {q.key} <span style={{ fontWeight: 400, fontSize: 12, color: '#6b7280' }}>({getQuarterRangeLabel(q.year, q.q)})</span>
                        {isFocus && <span style={{ marginRight: 6, background: '#f39c12', color: '#fff', fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>الحالي</span>}
                      </div>"""
new6 = """                    <div style={{ minWidth: 190 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1B4D7A', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          className="no-print"
                          checked={selectedQuarters.includes(q.key)}
                          onChange={() => {
                            setSelectedQuarters(prev =>
                              prev.includes(q.key) ? prev.filter(k => k !== q.key) : [...prev, q.key]
                            )
                          }}
                          style={{ cursor: 'pointer', width: 15, height: 15 }}
                        />
                        {q.key} <span style={{ fontWeight: 400, fontSize: 12, color: '#6b7280' }}>({getQuarterRangeLabel(q.year, q.q)})</span>
                        {isFocus && <span style={{ marginRight: 6, background: '#f39c12', color: '#fff', fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>الحالي</span>}
                      </div>"""
replacements.append((old6, new6))

missing = []
for i, (old, new) in enumerate(replacements, 1):
    if old not in content:
        missing.append(i)
    else:
        content = content.replace(old, new, 1)

if missing:
    print(f"⚠ فشل: الأجزاء التالية ما انطابقت بالملف: {missing}")
    print("تأكد إن الملف ما تغيّر عن النسخة اللي راجعناها قبل التطبيق.")
else:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق التعديل بنجاح على src/VatReturns.jsx")
