import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'

const UNIT_STATUS = ['مؤجرة', 'شاغرة', 'صيانة']
const UNIT_TYPES = ['شقة', 'محل', 'مستودع', 'غرفة', 'فيلا', 'أرض', 'عمارة', 'مجمع', 'برج']

const TYPE_ORDER = { 'محل': 1, 'شقة': 2, 'ورشة': 3 }

const VAT_STATUS_OPTIONS = [
  { value: 'exempt', label: 'معفى', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
  { value: 'taxable', label: 'خاضع', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  { value: 'mixed', label: 'مزدوج', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
]

function getVatInfo(value) {
  return VAT_STATUS_OPTIONS.find(o => o.value === value) || VAT_STATUS_OPTIONS[0]
}

function sortUnits(list) {
  return [...list].sort((a, b) => {
    const typeA = TYPE_ORDER[a.unit_type] ?? 99
    const typeB = TYPE_ORDER[b.unit_type] ?? 99
    if (typeA !== typeB) return typeA - typeB
    const numA = parseInt(String(a.unit_number).match(/\d+/)?.[0] ?? '0', 10)
    const numB = parseInt(String(b.unit_number).match(/\d+/)?.[0] ?? '0', 10)
    if (numA !== numB) return numA - numB
    return String(a.unit_number).localeCompare(String(b.unit_number))
  })
}

export default function PropertyDetail({ propertyId, onBack }) {
  const isReadOnly = useReadOnly()
  const [property, setProperty] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [updatingVatId, setUpdatingVatId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('الكل')
  const [filterVat, setFilterVat] = useState('الكل')
  const [form, setForm] = useState({ unit_number: '', unit_type: 'شقة', floor: '', area_sqm: '', status: 'شاغرة', vat_status: 'exempt', notes: '' })
  const [formError, setFormError] = useState('')

  useEffect(() => { fetchAll() }, [propertyId])

  async function fetchAll() {
    setLoading(true)
    const [prop, unts] = await Promise.all([
      supabase.from('properties').select('*').eq('id', propertyId).single(),
      supabase.from('units').select('*').eq('property_id', propertyId).order('created_at')
    ])
    setProperty(prop.data)
    setUnits(sortUnits(unts.data || []))
    setLoading(false)
  }

  function openAddForm() {
    setEditingId(null)
    setForm({ unit_number: '', unit_type: 'شقة', floor: '', area_sqm: '', status: 'شاغرة', vat_status: 'exempt', notes: '' })
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(unit) {
    setEditingId(unit.id)
    setForm({
      unit_number: unit.unit_number || '',
      unit_type: unit.unit_type || 'شقة',
      floor: unit.floor ?? '',
      area_sqm: unit.area_sqm ?? '',
      status: unit.status || 'شاغرة',
      vat_status: unit.vat_status || 'exempt',
      notes: unit.notes || ''
    })
    setFormError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.unit_number.trim()) { setFormError('رقم الوحدة مطلوب'); return }
    setSaving(true); setFormError('')
    const payload = {
      property_id: propertyId,
      unit_number: form.unit_number.trim(),
      unit_type: form.unit_type,
      status: form.status,
      vat_status: form.vat_status,
      notes: form.notes.trim() || null
    }
    if (form.floor !== '' && form.floor !== null) payload.floor = parseInt(form.floor)
    if (form.area_sqm !== '' && form.area_sqm !== null) payload.area_sqm = parseFloat(form.area_sqm)

    let error
    if (editingId) {
      const res = await supabase.from('units').update(payload).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('units').insert([payload])
      error = res.error
    }
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false); fetchAll()
  }

  async function handleDelete(unit) {
    if (!window.confirm(`حذف الوحدة "${unit.unit_number}"؟`)) return
    setDeletingId(unit.id)
    await supabase.from('units').delete().eq('id', unit.id)
    setDeletingId(null); fetchAll()
  }

  async function handleVatChange(unitId, newValue) {
    setUpdatingVatId(unitId)
    const { error } = await supabase.from('units').update({ vat_status: newValue }).eq('id', unitId)
    setUpdatingVatId(null)
    if (error) { alert('فشل التحديث: ' + error.message); return }
    setUnits(prev => prev.map(u => u.id === unitId ? { ...u, vat_status: newValue } : u))
  }

  const statusColor = {
    'مؤجرة': { background: '#dcfce7', color: '#166534' },
    'شاغرة': { background: '#fef9c3', color: '#854d0e' },
    'صيانة': { background: '#fee2e2', color: '#991b1b' }
  }

  if (loading) return <div style={{ padding: 40, fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>

  const filteredUnits = units.filter(u => {
    const matchStatus = filterStatus === 'الكل' || u.status === filterStatus
    const matchVat = filterVat === 'الكل' || (u.vat_status || 'exempt') === filterVat
    return matchStatus && matchVat
  })

  const exportData = filteredUnits.map((u) => ({
    unitNumber: u.unit_number || '—',
    unitType: u.unit_type || '—',
    floor: u.floor ?? '—',
    area: u.area_sqm ? u.area_sqm + ' م²' : '—',
    status: u.status || '—',
    vatStatus: getVatInfo(u.vat_status).label,
    notes: u.notes || '—',
  }))

  const exportStats = [
    { label: 'إجمالي الوحدات', value: units.length, color: '#1B4D7A' },
    { label: 'مؤجرة', value: units.filter(u => u.status === 'مؤجرة').length, color: '#166534' },
    { label: 'شاغرة', value: units.filter(u => u.status === 'شاغرة').length, color: '#854d0e' },
    { label: 'صيانة', value: units.filter(u => u.status === 'صيانة').length, color: '#991b1b' },
  ]

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1050px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للعقارات
      </button>

      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>{property?.name}</h1>
      <p style={{ color: '#666', margin: '0 0 20px' }}>{property?.address || ''}</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: units.length, color: '#1B4D7A', icon: '🏢' },
          { label: 'مؤجرة', value: units.filter(u => u.status === 'مؤجرة').length, color: '#166534', icon: '✅' },
          { label: 'شاغرة', value: units.filter(u => u.status === 'شاغرة').length, color: '#854d0e', icon: '🕓' },
          { label: 'صيانة', value: units.filter(u => u.status === 'صيانة').length, color: '#991b1b', icon: '🔧' },
        ].map(c => (
          <div key={c.label} style={{
            flex: '1 1 180px',
            background: '#fff',
            border: `1px solid ${c.color}33`,
            borderTop: `4px solid ${c.color}`,
            borderRadius: 14,
            padding: '18px 22px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {!isReadOnly && (
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة وحدة
        </button>
        )}
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
        <button onClick={fetchAll} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
      </div>

      {filteredUnits.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
          {units.length === 0 ? 'لا توجد وحدات مسجّلة لهذا العقار' : 'لا توجد وحدات مطابقة للفلتر'}
        </div>
      )}

      {filteredUnits.length > 0 && (
        <div id="property-detail-table">
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
            filename="property_detail_report"
            title={`تقرير وحدات ${property?.name || ''}`}
            stats={exportStats}
          />

          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <thead>
              <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                {(isReadOnly
                  ? ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'الضريبة', 'ملاحظات']
                  : ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'الضريبة', 'ملاحظات', '']
                ).map(h => (
                  <th key={h} style={{ padding: '14px 16px', color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUnits.map((u, i) => {
                const vatValue = u.vat_status || 'exempt'
                const vatInfo = getVatInfo(vatValue)
                return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1B4D7A' }}>{u.unit_number}</td>
                  <td style={{ padding: '14px 16px' }}>{u.unit_type || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{u.floor ?? '—'}</td>
                  <td style={{ padding: '14px 16px' }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ ...statusColor[u.status], padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{u.status || '—'}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <select
                      value={vatValue}
                      disabled={isReadOnly || updatingVatId === u.id}
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
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 13 }}>{u.notes || '—'}</td>
                  {!isReadOnly && (
                  <td className="no-print" style={{ padding: '12px' }}>
                    <button onClick={() => openEditForm(u)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                    <button onClick={() => handleDelete(u)} disabled={deletingId === u.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                      {deletingId === u.id ? '...' : 'حذف'}
                    </button>
                  </td>
                  )}
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#0006', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: 480, maxWidth: '95%', direction: 'rtl', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem' }}>{editingId ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>رقم الوحدة</label>
                <input value={form.unit_number} onChange={e => setForm({ ...form, unit_number: e.target.value })} placeholder="مثال: 1+2+3" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>النوع</label>
                <select value={form.unit_type} onChange={e => setForm({ ...form, unit_type: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  {UNIT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>الدور</label>
                <input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="اختياري" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>المساحة (م²)</label>
                <input value={form.area_sqm} onChange={e => setForm({ ...form, area_sqm: e.target.value })} placeholder="اختياري" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>الحالة</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  {UNIT_STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>تصنيف الضريبة</label>
                <select value={form.vat_status} onChange={e => setForm({ ...form, vat_status: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  {VAT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' }} />
              </div>
            </div>
            {formError && <div style={{ color: '#c00', fontSize: 13, marginTop: 8 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: '#1B4D7A', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
