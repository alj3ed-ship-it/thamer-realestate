import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ExportToolbar from './components/ExportToolbar'

const statusColor = {
  'مؤجرة': { background: '#dcfce7', color: '#166534' },
  'شاغرة': { background: '#fef9c3', color: '#854d0e' },
  'صيانة': { background: '#fee2e2', color: '#991b1b' }
}

// أولوية العقار (نفس ترتيب صفحة العرض /view)
function getPropertyPriority(name) {
  if (!name) return 99
  if (name.includes('سلمان')) return 1
  if (name.includes('إبراهيم')) return 2
  if (name.includes('عبدالله الكبيرة')) return 3
  if (name.includes('عبدالله الصغيرة')) return 4
  return 99
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

export default function Units({ onBack }) {
  const [units, setUnits] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('الكل')
  const [filterProperty, setFilterProperty] = useState('الكل')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [u, p] = await Promise.all([
      supabase.from('units').select('*').order('unit_number'),
      supabase.from('properties').select('id, name').order('name'),
    ])
    setUnits(u.data || [])
    setProperties(p.data || [])
    setLoading(false)
  }

  const filtered = units.filter(u => {
    const matchStatus = filterStatus === 'الكل' || u.status === filterStatus
    const matchProperty = filterProperty === 'الكل' || u.property_id === filterProperty
    return matchStatus && matchProperty
  })

  // الترتيب: العقار (بالأولوية) → النوع (محل > شقة > ورشة) → رقم الوحدة تصاعدي
  const sorted = [...filtered].sort((a, b) => {
    const propA = properties.find(p => p.id === a.property_id)
    const propB = properties.find(p => p.id === b.property_id)

    const propPriorityA = getPropertyPriority(propA?.name)
    const propPriorityB = getPropertyPriority(propB?.name)
    if (propPriorityA !== propPriorityB) return propPriorityA - propPriorityB

    // نفس أولوية العقار: رتب أبجدياً باسم العقار كضمان إضافي (لحالة عقارين بنفس الأولوية 99)
    const nameA = propA?.name || ''
    const nameB = propB?.name || ''
    if (nameA !== nameB) return nameA.localeCompare(nameB, 'ar')

    const typePriorityA = getUnitTypePriority(a.unit_type)
    const typePriorityB = getUnitTypePriority(b.unit_type)
    if (typePriorityA !== typePriorityB) return typePriorityA - typePriorityB

    return getUnitNumberValue(a.unit_number) - getUnitNumberValue(b.unit_number)
  })

  const total = units.length
  const rented = units.filter(u => u.status === 'مؤجرة').length
  const vacant = units.filter(u => u.status === 'شاغرة').length
  const maintenance = units.filter(u => u.status === 'صيانة').length

  const exportData = sorted.map((u) => {
    const prop = properties.find(p => p.id === u.property_id)
    return {
      property: prop?.name || '—',
      unitNumber: u.unit_number ?? '—',
      unitType: u.unit_type || '—',
      floor: u.floor ?? '—',
      area: u.area_sqm ? u.area_sqm + ' م²' : '—',
      status: u.status || '—',
      notes: u.notes || '—',
    }
  })

  const exportStats = [
    { label: 'إجمالي الوحدات', value: total, color: '#1B4D7A' },
    { label: 'مؤجرة', value: rented, color: '#166534' },
    { label: 'شاغرة', value: vacant, color: '#854d0e' },
    { label: 'صيانة', value: maintenance, color: '#991b1b' },
  ]

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>

      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>الوحدات</h1>
      <p style={{ color: '#666', margin: '0 0 20px' }}>جميع الوحدات في كل العقارات</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: total, bg: '#eff6ff', color: '#1B4D7A' },
          { label: 'مؤجرة', value: rented, bg: '#dcfce7', color: '#166534' },
          { label: 'شاغرة', value: vacant, bg: '#fef9c3', color: '#854d0e' },
          { label: 'صيانة', value: maintenance, bg: '#fee2e2', color: '#991b1b' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
            <div style={{ fontSize: 13, color: c.color, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
          <option value="الكل">كل العقارات</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
          <option value="الكل">كل الحالات</option>
          <option value="شاغرة">شاغرة</option>
          <option value="مؤجرة">مؤجرة</option>
          <option value="صيانة">صيانة</option>
        </select>
        <button onClick={fetchAll} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && sorted.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
          لا توجد وحدات
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div id="units-table">
          <ExportToolbar
            data={exportData}
            columns={[
              { key: 'property', label: 'العقار' },
              { key: 'unitNumber', label: 'رقم الوحدة' },
              { key: 'unitType', label: 'النوع' },
              { key: 'floor', label: 'الدور' },
              { key: 'area', label: 'المساحة' },
              { key: 'status', label: 'الحالة' },
              { key: 'notes', label: 'ملاحظات' },
            ]}
            filename="units_report"
            title="تقرير الوحدات"
            stats={exportStats}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                  {['العقار', 'رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات'].map(h => (
                    <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, idx) => {
                  const prop = properties.find(p => p.id === u.property_id)
                  return (
                    <tr key={u.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', color: '#1B4D7A', fontWeight: 600 }}>{prop?.name || '—'}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{u.unit_number}</td>
                      <td style={{ padding: '12px' }}>{u.unit_type || '—'}</td>
                      <td style={{ padding: '12px' }}>{u.floor ?? '—'}</td>
                      <td style={{ padding: '12px' }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ ...statusColor[u.status], padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          {u.status || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{u.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}