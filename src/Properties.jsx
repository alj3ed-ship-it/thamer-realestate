import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'

const PROPERTY_TYPES = ['فيلا', 'أرض', 'عمارة', 'مجمع تجاري', 'عمارة سكنية']
const OTHER_OPTION = 'أخرى'

// تصنيف ضريبة القيمة المضافة - على مستوى العقار
const VAT_STATUS_OPTIONS = [
  { value: 'exempt', label: 'سكني - معفى', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  { value: 'taxable', label: 'تجاري - خاضع 15%', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  { value: 'mixed', label: 'مزدوج الاستخدام', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
]

// تصنيف ضريبة القيمة المضافة - على مستوى الوحدة (لعرض القائمة الموحّدة)
const UNIT_VAT_OPTIONS = [
  { value: 'exempt', label: 'معفى', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  { value: 'taxable', label: 'خاضع', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  { value: 'mixed', label: 'مزدوج', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
]

function getVatInfo(options, value) {
  return options.find(o => o.value === value) || options[0]
}

const statusColor = {
  'مؤجرة': { background: '#dcfce7', color: '#166534' },
  'شاغرة': { background: '#fef9c3', color: '#854d0e' },
  'صيانة': { background: '#fee2e2', color: '#991b1b' }
}

// أولوية العقار (نفس ترتيب صفحة العرض /view)
function getPropertyPriority(property) {
  if (property.priority !== null && property.priority !== undefined) return property.priority
  const name = property.name || ''
  if (name.includes('سلمان')) return 1
  if (name.includes('إبراهيم') || name.includes('أبراهيم') || name.includes('ابراهيم')) return 2
  if (name.includes('عبدالله الكبيرة')) return 3
  if (name.includes('عبدالله الصغيرة')) return 4
  return 99
}

function getUnitTypePriority(type) {
  if (!type) return 99
  if (type === 'محل') return 1
  if (type === 'شقة') return 2
  if (type === 'ورشة') return 3
  return 99
}

function getUnitNumberValue(unitNumber) {
  if (unitNumber === null || unitNumber === undefined) return 999999
  const parsed = parseInt(String(unitNumber).replace(/[^\d]/g, ''), 10)
  return isNaN(parsed) ? 999999 : parsed
}

const TOP_FILTER_CARDS = [
  { key: 'all', label: 'إجمالي الوحدات', color: '#1B4D7A', icon: '🏢' },
  { key: 'مؤجرة', label: 'مؤجرة', color: '#166534', icon: '✅' },
  { key: 'شاغرة', label: 'شاغرة', color: '#854d0e', icon: '🕓' },
  { key: 'صيانة', label: 'صيانة', color: '#991b1b', icon: '🔧' },
  { key: 'taxable', label: 'خاضعة للضريبة', color: '#7c3aed', icon: '🧾' },
]

function Properties({ onBack, onSelectProperty }) {
  const isReadOnly = useReadOnly()
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formType, setFormType] = useState('')
  const [formCustomType, setFormCustomType] = useState('')
  const [formVatStatus, setFormVatStatus] = useState('exempt')
  const [formError, setFormError] = useState('')
  const [activeTopFilter, setActiveTopFilter] = useState(null) // 'all' | 'مؤجرة' | 'شاغرة' | 'صيانة' | 'taxable' | null

  async function fetchProperties() {
    setStatus('loading')
    setErrorMsg('')
    const [propsRes, unitsRes] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('units').select('*')
    ])
    if (propsRes.error) { setErrorMsg(propsRes.error.message); setStatus('error'); return }
    setProperties(propsRes.data)
    setUnits(unitsRes.data || [])
    setStatus('success')
  }

  const sortedProperties = [...properties].sort((a, b) => {
    const pa = getPropertyPriority(a)
    const pb = getPropertyPriority(b)
    if (pa !== pb) return pa - pb
    return (a.name || '').localeCompare(b.name || '', 'ar')
  })

  const propertyNameById = Object.fromEntries(properties.map(p => [p.id, p.name]))
  const propertyOrderIndex = Object.fromEntries(sortedProperties.map((p, idx) => [p.id, idx]))
  const unitCounts = Object.fromEntries(properties.map(p => [p.id, units.filter(u => u.property_id === p.id).length]))

  useEffect(() => { fetchProperties() }, [])

  // ===== إحصائيات إجمالية لكروت الفلتر العلوية =====
  const totalAll = units.length
  const rentedAll = units.filter(u => u.status === 'مؤجرة').length
  const vacantAll = units.filter(u => u.status === 'شاغرة').length
  const maintenanceAll = units.filter(u => u.status === 'صيانة').length
  const taxableAll = units.filter(u => u.vat_status === 'taxable').length
  const topFilterValues = { all: totalAll, 'مؤجرة': rentedAll, 'شاغرة': vacantAll, 'صيانة': maintenanceAll, taxable: taxableAll }
  const activeTopFilterInfo = TOP_FILTER_CARDS.find(c => c.key === activeTopFilter)

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
      const tA = getUnitTypePriority(a.unit_type)
      const tB = getUnitTypePriority(b.unit_type)
      if (tA !== tB) return tA - tB
      return getUnitNumberValue(a.unit_number) - getUnitNumberValue(b.unit_number)
    })
  })()

  function handleTopFilterClick(key) {
    setActiveTopFilter(prev => (prev === key ? null : key))
  }

  function goToUnit(unit) {
    if (onSelectProperty) onSelectProperty(unit.property_id)
  }

  function openAddForm() {
    setEditingId(null); setFormName(''); setFormAddress(''); setFormType(''); setFormCustomType('')
    setFormVatStatus('exempt'); setFormError(''); setShowForm(true)
  }

  function openEditForm(property) {
    setEditingId(property.id)
    setFormName(property.name || '')
    setFormAddress(property.address || '')
    const existingType = property.property_type || ''
    if (existingType && !PROPERTY_TYPES.includes(existingType)) {
      setFormType(OTHER_OPTION)
      setFormCustomType(existingType)
    } else {
      setFormType(existingType)
      setFormCustomType('')
    }
    setFormVatStatus(property.vat_status || 'exempt')
    setFormError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!formName.trim()) { setFormError('اسم العقار مطلوب'); return }
    const finalType = formType === OTHER_OPTION ? formCustomType.trim() : formType
    if (formType === OTHER_OPTION && !finalType) { setFormError('يرجى كتابة نوع العقار'); return }
    setSaving(true); setFormError('')
    const payload = {
      name: formName.trim(),
      address: formAddress.trim() || null,
      property_type: finalType || null,
      vat_status: formVatStatus,
    }
    let error
    if (editingId) { const res = await supabase.from('properties').update(payload).eq('id', editingId); error = res.error }
    else { const res = await supabase.from('properties').insert([payload]); error = res.error }
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false); fetchProperties()
  }

  async function handleDelete(property) {
    if (!window.confirm(`هل أنت متأكد من حذف "${property.name}"؟`)) return
    setDeletingId(property.id)
    const { error } = await supabase.from('properties').delete().eq('id', property.id)
    setDeletingId(null)
    if (error) { alert('فشل الحذف: ' + error.message); return }
    fetchProperties()
  }

  const exportData = sortedProperties.map((p) => ({
    name: p.name || '—',
    type: p.property_type || '—',
    vatStatus: getVatInfo(VAT_STATUS_OPTIONS, p.vat_status).label,
    address: p.address || '—',
    unitCount: unitCounts[p.id] || 0,
  }))

  const exportStats = [
    { label: 'عدد العقارات', value: sortedProperties.length, color: '#1B4D7A' },
    { label: 'إجمالي الوحدات', value: totalAll, color: '#166534' },
    { label: 'عقارات خاضعة للضريبة', value: sortedProperties.filter(p => p.vat_status === 'taxable').length, color: '#b91c1c' },
  ]

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1050px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A', fontSize: 26 }}>العقارات</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px', fontSize: 14 }}>إدارة قائمة العقارات، أو اضغط على أحد الكروت أدناه لعرض قائمة الوحدات مفلترة عبر كل العقارات</p>

      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {!isReadOnly && (
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          + إضافة عقار جديد
        </button>
        )}
        <button onClick={fetchProperties} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>تحديث</button>
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}
      {status === 'error' && <div style={{ background: '#fee', padding: 15, borderRadius: 8, color: '#c00' }}>فشل تحميل العقارات: {errorMsg}</div>}

      {status === 'success' && (
        <>
          {/* ===== كروت الفلتر العلوية (إجمالي الوحدات عبر كل العقارات) ===== */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            {TOP_FILTER_CARDS.map(c => {
              const isActive = activeTopFilter === c.key
              return (
                <div key={c.key} onClick={() => handleTopFilterClick(c.key)} className="no-print"
                  style={{
                    flex: '1 1 170px', background: isActive ? `${c.color}14` : '#fff',
                    border: `1px solid ${c.color}33`, borderTop: `4px solid ${c.color}`, borderRadius: 14,
                    padding: '18px 22px', boxShadow: isActive ? `0 0 0 2px ${c.color}` : '0 2px 10px rgba(0,0,0,0.05)',
                    textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s',
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

          {/* ===== قائمة الوحدات الموحّدة عند تفعيل فلتر ===== */}
          {activeTopFilter && (
            <div style={{ marginBottom: 28 }}>
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: activeTopFilterInfo?.color }}>
                  {activeTopFilterInfo?.icon} عرض: {activeTopFilterInfo?.label} ({topFilteredUnits.length})
                </div>
                <button onClick={() => setActiveTopFilter(null)} style={{ padding: '7px 14px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600 }}>
                  ✕ إلغاء الفلتر
                </button>
              </div>

              {topFilteredUnits.length === 0 ? (
                <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا توجد وحدات مطابقة</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topFilteredUnits.map(u => {
                    const vatInfo = getVatInfo(UNIT_VAT_OPTIONS, u.vat_status || 'exempt')
                    return (
                      <div key={u.id} onClick={() => goToUnit(u)}
                        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.09)' }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                          <div style={{ minWidth: 60, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{u.unit_type || 'وحدة'}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4D7A' }}>{u.unit_number ?? '—'}</div>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{propertyNameById[u.property_id] || '—'}</div>
                          <div style={{ fontSize: 12.5, color: '#6b7280' }}>{u.floor ? `الدور ${u.floor}` : '—'}{u.area_sqm ? ` · ${u.area_sqm} م²` : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ ...(statusColor[u.status] || {}), padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{u.status || '—'}</span>
                          <span style={{ background: vatInfo.bg, color: vatInfo.color, border: `1px solid ${vatInfo.border}`, padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{vatInfo.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== جدول العقارات ===== */}
          {sortedProperties.length === 0 && (
            <div style={{ background: '#f9fafb', padding: 24, borderRadius: 12, color: '#6b7280', textAlign: 'center' }}>لا توجد عقارات مسجّلة حالياً.</div>
          )}

          {sortedProperties.length > 0 && (
            <div id="properties-table">
              <ExportToolbar
                data={exportData}
                columns={[
                  { key: 'name', label: 'اسم العقار' },
                  { key: 'type', label: 'النوع' },
                  { key: 'vatStatus', label: 'تصنيف الضريبة' },
                  { key: 'address', label: 'العنوان' },
                  { key: 'unitCount', label: 'عدد الوحدات' },
                ]}
                filename="properties_report"
                title="تقرير العقارات"
                stats={exportStats}
              />

              <div style={{ overflowX: 'auto', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                      {(isReadOnly
                        ? ['اسم العقار', 'النوع', 'تصنيف الضريبة', 'العنوان', 'عدد الوحدات']
                        : ['اسم العقار', 'النوع', 'تصنيف الضريبة', 'العنوان', 'عدد الوحدات', '']
                      ).map(h => (
                        <th key={h} style={{ padding: '13px 14px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProperties.map((p, idx) => {
                      const vatInfo = getVatInfo(VAT_STATUS_OPTIONS, p.vat_status)
                      return (
                        <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #eef1f5' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#eef4fb'}
                          onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f8fafc'}>
                          <td style={{ padding: '12px 14px' }}>
                            <span onClick={() => onSelectProperty && onSelectProperty(p.id)}
                              style={{ cursor: 'pointer', color: '#1B4D7A', fontWeight: 700 }}>
                              {p.name}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6b7280' }}>{p.property_type || '—'}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              background: vatInfo.bg, color: vatInfo.color, border: `1px solid ${vatInfo.border}`,
                              padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
                            }}>{vatInfo.label}</span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#6b7280' }}>{p.address || '—'}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              background: '#eef4fb', color: '#1B4D7A', border: '1px solid #cfe0f2',
                              padding: '3px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700
                            }}>{unitCounts[p.id] || 0}</span>
                          </td>
                          {!isReadOnly && (
                          <td className="no-print" style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            <button onClick={() => openEditForm(p)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                            <button onClick={() => handleDelete(p)} disabled={deletingId === p.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                              {deletingId === p.id ? '...' : 'حذف'}
                            </button>
                          </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: 12, width: 400, maxWidth: '90%', direction: 'rtl' }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'تعديل العقار' : 'إضافة عقار جديد'}</h2>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>اسم العقار</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }} placeholder="مثال: عمارة سلمان" />

            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>نوع العقار</label>
            <select value={formType} onChange={e => setFormType(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: formType === OTHER_OPTION ? 10 : 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
              <option value="">— اختر النوع —</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              <option value={OTHER_OPTION}>{OTHER_OPTION} (اكتب النوع)</option>
            </select>

            {formType === OTHER_OPTION && (
              <input type="text" value={formCustomType} onChange={e => setFormCustomType(e.target.value)}
                style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }}
                placeholder="اكتب نوع العقار (مثال: استراحة)" />
            )}

            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>تصنيف ضريبة القيمة المضافة</label>
            <select value={formVatStatus} onChange={e => setFormVatStatus(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
              {VAT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>العنوان</label>
            <input type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }} placeholder="اختياري" />

            {formError && <div style={{ color: '#c00', marginBottom: 15, fontSize: 14 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: '#1B4D7A', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Properties
