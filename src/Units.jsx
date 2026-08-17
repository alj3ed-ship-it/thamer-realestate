import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'

const statusColor = {
  'مؤجرة': { background: '#dcfce7', color: '#166534' },
  'شاغرة': { background: '#fef9c3', color: '#854d0e' },
  'صيانة': { background: '#fee2e2', color: '#991b1b' }
}

// تصنيف ضريبة القيمة المضافة
const VAT_STATUS_OPTIONS = [
  { value: 'exempt', label: 'معفى', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  { value: 'taxable', label: 'خاضع', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  { value: 'mixed', label: 'مزدوج', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
]

function getVatStatusInfo(value) {
  return VAT_STATUS_OPTIONS.find(o => o.value === value) || VAT_STATUS_OPTIONS[0]
}

// أولوية نوع الوحدة: محل > شقة > ورشة > غيرها
function getUnitTypePriority(type) {
  if (!type) return 99
  if (type === 'محل') return 1
  if (type === 'شقة') return 2
  if (type === 'ورشة') return 3
  return 99
}

// استخراج الرقم من رقم الوحدة للترتيب التصاعدي الصحيح (1,2,3.. وليس 1,10,2)
function getUnitNumberValue(unitNumber) {
  if (unitNumber === null || unitNumber === undefined) return 999999
  const parsed = parseInt(String(unitNumber).replace(/[^\d]/g, ''), 10)
  return isNaN(parsed) ? 999999 : parsed
}

// إعدادات كروت الفلتر العلوية
const TOP_FILTER_CARDS = [
  { key: 'all', label: 'إجمالي الوحدات', color: '#1B4D7A', icon: '🏢' },
  { key: 'مؤجرة', label: 'مؤجرة', color: '#166534', icon: '✅' },
  { key: 'شاغرة', label: 'شاغرة', color: '#854d0e', icon: '🕓' },
  { key: 'صيانة', label: 'صيانة', color: '#991b1b', icon: '🔧' },
  { key: 'taxable', label: 'خاضعة للضريبة', color: '#7c3aed', icon: '🧾' },
]

export default function Units({ onBack }) {
  const isReadOnly = useReadOnly()
  const [units, setUnits] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPropertyId, setSelectedPropertyId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('الكل')
  const [filterVat, setFilterVat] = useState('الكل')
  const [updatingId, setUpdatingId] = useState(null)
  const [activeTopFilter, setActiveTopFilter] = useState(null) // 'all' | 'مؤجرة' | 'شاغرة' | 'صيانة' | 'taxable' | null

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [u, p] = await Promise.all([
      supabase.from('units').select('*').order('unit_number'),
      supabase.from('properties').select('id, name, priority').order('priority', { ascending: true, nullsFirst: false }),
    ])
    setUnits(u.data || [])
    setProperties(p.data || [])
    setLoading(false)
  }

  async function handleVatChange(unitId, newValue) {
    setUpdatingId(unitId)
    const { error } = await supabase.from('units').update({ vat_status: newValue }).eq('id', unitId)
    setUpdatingId(null)
    if (error) { alert('فشل التحديث: ' + error.message); return }
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, vat_status: newValue } : u))
  }

  // زر رجوع ذكي: من داخل عقار → لشاشة العقارات، ومن شاشة العقارات → للوحة التحكم
  function handleBack() {
    if (selectedPropertyId) {
      setSelectedPropertyId(null)
      setFilterStatus('الكل')
      setFilterVat('الكل')
    } else {
      onBack()
    }
  }

  function handleTopFilterClick(key) {
    setActiveTopFilter(prev => (prev === key ? null : key))
  }

  // ترتيب العقارات حسب عمود priority بقاعدة البيانات (نفس مصدر الترتيب في باقي الصفحات)
  const sortedProperties = [...properties].sort((a, b) => {
    const pa = a.priority ?? 99
    const pb = b.priority ?? 99
    if (pa !== pb) return pa - pb
    return (a.name || '').localeCompare(b.name || '', 'ar')
  })

  const propertyNameById = Object.fromEntries(properties.map(p => [p.id, p.name]))
  const propertyOrderIndex = Object.fromEntries(sortedProperties.map((p, idx) => [p.id, idx]))

  // إحصائيات إجمالية عامة (كل العقارات)
  const totalAll = units.length
  const rentedAll = units.filter(u => u.status === 'مؤجرة').length
  const vacantAll = units.filter(u => u.status === 'شاغرة').length
  const maintenanceAll = units.filter(u => u.status === 'صيانة').length
  const taxableAll = units.filter(u => u.vat_status === 'taxable').length

  const topFilterValues = { all: totalAll, 'مؤجرة': rentedAll, 'شاغرة': vacantAll, 'صيانة': maintenanceAll, taxable: taxableAll }

  // الوحدات المطابقة للفلتر العلوي المفعّل (كل العقارات)
  const topFilteredUnits = (() => {
    if (!activeTopFilter) return []
    let list
    if (activeTopFilter === 'all') list = units
    else if (activeTopFilter === 'taxable') list = units.filter(u => u.vat_status === 'taxable')
    else list = units.filter(u => u.status === activeTopFilter)

    return [...list].sort((a, b) => {
      const prA = propertyOrderIndex[a.property_id] ?? 999
      const prB = propertyOrderIndex[b.property_id] ?? 999
      if (prA !== prB) return prA - prB
      const typePriorityA = getUnitTypePriority(a.unit_type)
      const typePriorityB = getUnitTypePriority(b.unit_type)
      if (typePriorityA !== typePriorityB) return typePriorityA - typePriorityB
      return getUnitNumberValue(a.unit_number) - getUnitNumberValue(b.unit_number)
    })
  })()

  const activeTopFilterInfo = TOP_FILTER_CARDS.find(c => c.key === activeTopFilter)

  // إحصائيات لكل عقار (لبطاقات شاشة العقارات)
  function statsForProperty(propertyId) {
    const propUnits = units.filter(u => u.property_id === propertyId)
    return {
      total: propUnits.length,
      rented: propUnits.filter(u => u.status === 'مؤجرة').length,
      vacant: propUnits.filter(u => u.status === 'شاغرة').length,
      maintenance: propUnits.filter(u => u.status === 'صيانة').length,
    }
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  // وحدات العقار المختار، مفلترة ومرتبة (النوع أولاً: محل > شقة > ورشة، ثم الرقم تصاعدياً)
  const propertyUnits = selectedPropertyId
    ? units.filter(u => u.property_id === selectedPropertyId)
    : []

  const filteredPropertyUnits = propertyUnits.filter(u => {
    const matchStatus = filterStatus === 'الكل' || u.status === filterStatus
    const matchVat = filterVat === 'الكل' || (u.vat_status || 'exempt') === filterVat
    return matchStatus && matchVat
  })

  const sortedPropertyUnits = [...filteredPropertyUnits].sort((a, b) => {
    const typePriorityA = getUnitTypePriority(a.unit_type)
    const typePriorityB = getUnitTypePriority(b.unit_type)
    if (typePriorityA !== typePriorityB) return typePriorityA - typePriorityB
    return getUnitNumberValue(a.unit_number) - getUnitNumberValue(b.unit_number)
  })

  const exportData = sortedPropertyUnits.map((u) => ({
    unitNumber: u.unit_number ?? '—',
    unitType: u.unit_type || '—',
    floor: u.floor ?? '—',
    area: u.area_sqm ? u.area_sqm + ' م²' : '—',
    status: u.status || '—',
    vatStatus: getVatStatusInfo(u.vat_status).label,
    notes: u.notes || '—',
  }))

  const propertyStats = selectedPropertyId ? statsForProperty(selectedPropertyId) : null
  const exportStats = propertyStats ? [
    { label: 'إجمالي الوحدات', value: propertyStats.total, color: '#1B4D7A' },
    { label: 'مؤجرة', value: propertyStats.rented, color: '#166534' },
    { label: 'شاغرة', value: propertyStats.vacant, color: '#854d0e' },
    { label: 'صيانة', value: propertyStats.maintenance, color: '#991b1b' },
  ] : []

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <button onClick={handleBack} className="no-print" style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← {selectedPropertyId ? 'رجوع للعقارات' : 'رجوع للوحة التحكم'}
      </button>

      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>
        {selectedPropertyId ? `وحدات: ${selectedProperty?.name || ''}` : 'الوحدات'}
      </h1>
      <p style={{ color: '#666', margin: '0 0 20px' }}>
        {selectedPropertyId ? 'اضغط على أي بطاقة لتعديل تصنيف الضريبة أو الاطلاع على التفاصيل' : 'اختر عقاراً لعرض وحداته، أو اضغط على أحد الكروت أعلاه لعرض قائمة مفلترة'}
      </p>

      {loading && <p>جاري التحميل...</p>}

      {/* ===== شاشة العقارات ===== */}
      {!loading && !selectedPropertyId && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            {TOP_FILTER_CARDS.map(c => {
              const isActive = activeTopFilter === c.key
              return (
                <div
                  key={c.key}
                  onClick={() => handleTopFilterClick(c.key)}
                  className="no-print"
                  style={{
                    flex: '1 1 170px',
                    background: isActive ? `${c.color}14` : '#fff',
                    border: `1px solid ${c.color}33`,
                    borderTop: `4px solid ${c.color}`,
                    borderRadius: 14,
                    padding: '18px 22px',
                    boxShadow: isActive ? `0 0 0 2px ${c.color}` : '0 2px 10px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)' }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: c.color, lineHeight: 1 }}>{topFilterValues[c.key]}</div>
                </div>
              )
            })}
          </div>

          {/* ===== قائمة الوحدات المفلترة (تظهر عند تفعيل فلتر علوي) ===== */}
          {activeTopFilter ? (
            <div>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: activeTopFilterInfo?.color }}>
                  {activeTopFilterInfo?.icon} عرض: {activeTopFilterInfo?.label} ({topFilteredUnits.length})
                </div>
                <button
                  onClick={() => setActiveTopFilter(null)}
                  style={{ padding: '7px 14px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600 }}
                >
                  ✕ إلغاء الفلتر
                </button>
              </div>

              {topFilteredUnits.length === 0 ? (
                <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
                  لا توجد وحدات مطابقة
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topFilteredUnits.map(u => {
                    const vatInfo = getVatStatusInfo(u.vat_status || 'exempt')
                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedPropertyId(u.property_id)}
                        style={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 12,
                          padding: '12px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          cursor: 'pointer',
                          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.09)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 60, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{u.unit_type || 'وحدة'}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4D7A' }}>{u.unit_number ?? '—'}</div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                            {propertyNameById[u.property_id] || '—'}
                          </div>
                          <div style={{ fontSize: 12.5, color: '#6b7280' }}>
                            {u.floor ? `الدور ${u.floor}` : '—'}{u.area_sqm ? ` · ${u.area_sqm} م²` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ ...(statusColor[u.status] || {}), padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                            {u.status || '—'}
                          </span>
                          <span style={{ background: vatInfo.bg, color: vatInfo.color, border: `1px solid ${vatInfo.border}`, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                            {vatInfo.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {sortedProperties.length === 0 && (
                <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
                  لا توجد عقارات
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {sortedProperties.map(p => {
                  const s = statsForProperty(p.id)
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPropertyId(p.id)}
                      style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 14,
                        padding: '20px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)' }}
                    >
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#1B4D7A', marginBottom: 14 }}>{p.name}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ background: '#eef4fa', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#1B4D7A', fontWeight: 600 }}>إجمالي</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4D7A' }}>{s.total}</div>
                        </div>
                        <div style={{ background: '#dcfce7', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>مؤجرة</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{s.rented}</div>
                        </div>
                        <div style={{ background: '#fef9c3', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>شاغرة</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#854d0e' }}>{s.vacant}</div>
                        </div>
                        <div style={{ background: '#fee2e2', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>صيانة</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b' }}>{s.maintenance}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ===== شاشة تفاصيل العقار: بطاقات الوحدات ===== */}
      {!loading && selectedPropertyId && (
        <>
          <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
              <option value="الكل">كل الحالات</option>
              <option value="شاغرة">شاغرة</option>
              <option value="مؤجرة">مؤجرة</option>
              <option value="صيانة">صيانة</option>
            </select>
            <select value={filterVat} onChange={e => setFilterVat(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
              <option value="الكل">كل تصنيفات الضريبة</option>
              {VAT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={fetchAll} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
          </div>

          {sortedPropertyUnits.length === 0 && (
            <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
              لا توجد وحدات مطابقة
            </div>
          )}

          {sortedPropertyUnits.length > 0 && (
            <div id="units-table">
              <ExportToolbar
                data={exportData}
                columns={[
                  { key: 'unitNumber', label: 'رقم الوحدة' },
                  { key: 'unitType', label: 'النوع' },
                  { key: 'floor', label: 'الدور' },
                  { key: 'area', label: 'المساحة' },
                  { key: 'status', label: 'الحالة' },
                  { key: 'vatStatus', label: 'تصنيف الضريبة' },
                  { key: 'notes', label: 'ملاحظات' },
                ]}
                filename={`units_${selectedProperty?.name || 'property'}`}
                title={`تقرير وحدات: ${selectedProperty?.name || ''}`}
                stats={exportStats}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
                {sortedPropertyUnits.map(u => {
                  const vatValue = u.vat_status || 'exempt'
                  const vatInfo = getVatStatusInfo(vatValue)
                  return (
                    <div key={u.id} style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 14,
                      overflow: 'hidden',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    }}>
                      {/* رأس البطاقة: النوع والرقم */}
                      <div style={{ background: '#1B4D7A', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#cfe0f0', fontSize: 12, fontWeight: 600 }}>{u.unit_type || 'وحدة'}</div>
                          <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>{u.unit_number ?? '—'}</div>
                        </div>
                        <span style={{ ...statusColor[u.status], padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                          {u.status || '—'}
                        </span>
                      </div>

                      {/* جدول صغير بتفاصيل الوحدة */}
                      <div style={{ padding: '4px 0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '9px 16px', color: '#6b7280', fontWeight: 600 }}>الدور</td>
                              <td style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>{u.floor ?? '—'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '9px 16px', color: '#6b7280', fontWeight: 600 }}>المساحة</td>
                              <td style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600 }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '9px 16px', color: '#6b7280', fontWeight: 600 }}>الضريبة</td>
                              <td style={{ padding: '7px 12px', textAlign: 'left' }}>
                                <select
                                  value={vatValue}
                                  disabled={isReadOnly || updatingId === u.id}
                                  onChange={e => handleVatChange(u.id, e.target.value)}
                                  style={{
                                    background: vatInfo.bg, color: vatInfo.color, border: `1.5px solid ${vatInfo.border}`,
                                    padding: '5px 26px 5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                    fontFamily: 'Cairo, sans-serif', cursor: isReadOnly ? 'default' : 'pointer',
                                    appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='${encodeURIComponent(vatInfo.color)}' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
                                    backgroundRepeat: 'no-repeat', backgroundPosition: 'left 8px center',
                                    minWidth: 82, textAlign: 'center', textAlignLast: 'center',
                                  }}>
                                  {VAT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ padding: '9px 16px', color: '#6b7280', fontWeight: 600, verticalAlign: 'top' }}>ملاحظات</td>
                              <td style={{ padding: '9px 16px', textAlign: 'left', color: '#9ca3af', fontSize: 12.5 }}>{u.notes || '—'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}