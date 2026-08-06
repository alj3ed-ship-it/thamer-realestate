path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# ============================================================
# الباتش 1: تحديد متعدد للأرباع (checkboxes بدل القائمة المنسدلة)
# ============================================================

replacements.append((
    "  const [exportScope, setExportScope] = useState('all')",
    "  const [selectedQuarters, setSelectedQuarters] = useState([]) // فارغ = كل الأرباع\n  const [showAllQuarters, setShowAllQuarters] = useState(false)"
))

replacements.append((
    """  function buildExportRows(scope) {
    const list = scope === 'all' ? quarters : quarters.filter(q => q.key === scope)""",
    """  function buildExportRows(selected) {
    const list = selected.length === 0 ? quarters : quarters.filter(q => selected.includes(q.key))"""
))

replacements.append((
    """  const exportData = buildExportRows(exportScope)
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
      })()""",
    """  const exportData = buildExportRows(selectedQuarters)
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
))

replacements.append((
    """          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: '#374151' }}>تصدير:</label>
            <select value={exportScope} onChange={e => setExportScope(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
              <option value="all">كل الإقرارات</option>
              {quarters.map(q => (
                <option key={q.key} value={q.key}>{q.key} ({getQuarterRangeLabel(q.year, q.q)})</option>
              ))}
            </select>
          </div>""",
    """          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
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
))

replacements.append((
    """            filename={exportScope === 'all' ? 'vat_returns_report' : `vat_return_${exportScope}`}
            title={exportScope === 'all' ? 'تقرير الإقرارات الضريبية' : `إقرار ${exportScope}`}""",
    """            filename={`vat_returns_${scopeSuffix}`}
            title={scopeTitle}"""
))

replacements.append((
    """                    <div style={{ minWidth: 190 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1B4D7A' }}>
                        {q.key} <span style={{ fontWeight: 400, fontSize: 12, color: '#6b7280' }}>({getQuarterRangeLabel(q.year, q.q)})</span>
                        {isFocus && <span style={{ marginRight: 6, background: '#f39c12', color: '#fff', fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>الحالي</span>}
                      </div>""",
    """                    <div style={{ minWidth: 190 }}>
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
))

# ============================================================
# الباتش 2+3: عرض افتراضي 4 أرباع (تاريخية + تكميل بالقادمة) + ألوان إشارة المرور
# ============================================================

replacements.append((
    "  const statusInfo = {",
    """  function getDeadlineColor(daysLeft) {
    if (daysLeft < 0) return '#e74c3c' // متأخر
    if (daysLeft <= 14) return '#f39c12' // قريب
    return '#27ae60' // بعيد
  }

  function getOpenColor(daysToOpen) {
    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 14) return '#f39c12' // قريب من الفتح
    return '#d4a017' // بعيد بعد — أصفر واضح بدل الرمادي الباهت
  }

  const statusInfo = {"""
))

replacements.append((
    """                          <div style={{ fontSize: 10, color: daysToOpen < 0 ? '#9ca3af' : '#6b7280' }}>
                            {daysToOpen >= 0 ? `بعد ${daysToOpen} يوم` : `منذ ${Math.abs(daysToOpen)} يوم`}
                          </div>
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>←</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: daysLeft < 0 ? '#e74c3c' : daysLeft <= 14 ? '#f39c12' : '#6b7280' }}>
                            {daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`}
                          </div>""",
    """                          <div style={{ fontSize: 10, fontWeight: 600, color: getOpenColor(daysToOpen) }}>
                            {daysToOpen >= 0 ? `بعد ${daysToOpen} يوم` : `منذ ${Math.abs(daysToOpen)} يوم`}
                          </div>
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>←</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: getDeadlineColor(daysLeft) }}>
                            {daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`}
                          </div>"""
))

replacements.append((
    """  const focusKey = quarters.find(q => {
    const st = getStatus(q)
    return st === 'due' || st === 'overdue'
  })?.key""",
    """  const focusKey = quarters.find(q => {
    const st = getStatus(q)
    return st === 'due' || st === 'overdue'
  })?.key

  // آخر 4 أرباع كعرض افتراضي: تاريخية أولاً، وإذا كانت أقل من 4 نكمّل بأقرب أرباع قادمة
  const historicalQuarters = quarters.filter(q => getStatus(q) !== 'upcoming')
  const defaultQuarters = (() => {
    if (historicalQuarters.length >= 4) return historicalQuarters.slice(-4)
    const historicalKeys = new Set(historicalQuarters.map(q => q.key))
    const upcomingQuarters = quarters.filter(q => !historicalKeys.has(q.key))
    const needed = 4 - historicalQuarters.length
    return [...historicalQuarters, ...upcomingQuarters.slice(0, needed)]
  })()
  const displayedQuarters = showAllQuarters ? quarters : defaultQuarters
  const hasMoreQuarters = !showAllQuarters && quarters.length > defaultQuarters.length"""
))

replacements.append((
    "            {quarters.map(q => {",
    "            {displayedQuarters.map(q => {"
))

replacements.append((
    """            })}
          </div>
        </div>
      )}
    </div>
  )
}""",
    """            })}
          </div>

          {(hasMoreQuarters || showAllQuarters) && (
            <div className="no-print" style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => setShowAllQuarters(!showAllQuarters)}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {showAllQuarters ? '▲ عرض أقل (آخر 4 أرباع فقط)' : `▼ عرض المزيد (${quarters.length - defaultQuarters.length} ربع إضافي)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}"""
))

# ============================================================
# التطبيق
# ============================================================

missing = []
for i, (old, new) in enumerate(replacements, 1):
    if old not in content:
        missing.append(i)
    else:
        content = content.replace(old, new, 1)

if missing:
    print(f"⚠ فشل: الأجزاء التالية ما انطابقت بالملف: {missing}")
    print("هذا يعني الملف مو بالنسخة الأصلية (فيه تعديلات سابقة أو مختلفة).")
    print("أرسل محتوى src/VatReturns.jsx الحالي كامل حتى أبني باتش يطابقه بالضبط.")
else:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق كل التحديثات الأربعة بنجاح على src/VatReturns.jsx")
