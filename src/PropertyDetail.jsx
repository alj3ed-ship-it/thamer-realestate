import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ExportToolbar from './components/ExportToolbar'

const UNIT_STATUS = ['مؤجرة', 'شاغرة', 'صيانة']
const UNIT_TYPES = ['شقة', 'محل', 'مستودع', 'غرفة', 'فيلا', 'أرض']

const TYPE_ORDER = { 'محل': 1, 'شقة': 2, 'ورشة': 3 }

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
  const [property, setProperty] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ unit_number: '', unit_type: 'شقة', floor: '', area_sqm: '', status: 'شاغرة', notes: '' })
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
    setForm({ unit_number: '', unit_type: 'شقة', floor: '', area_sqm: '', status: 'شاغرة', notes: '' })
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

  const statusColor = {
    'مؤجرة': { background: '#dcfce7', color: '#166534' },
    'شاغرة': { background: '#fef9c3', color: '#854d0e' },
    'صيانة': { background: '#fee2e2', color: '#991b1b' }
  }

  if (loading) return <div style={{ padding: 40, fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>

  const exportData = units.map((u) => ({
    unitNumber: u.unit_number || '—',
    unitType: u.unit_type || '—',
    floor: u.floor ?? '—',
    area: u.area_sqm ? u.area_sqm + ' م²' : '—',
    status: u.status || '—',
    notes: u.notes || '—',
  }))

  const exportStats = [
    { label: 'إجمالي الوحدات', value: units.length, color: '#1B4D7A' },
    { label: 'مؤجرة', value: units.filter(u => u.status === 'مؤجرة').length, color: '#166534' },
    { label: 'شاغرة', value: units.filter(u => u.status === 'شاغرة').length, color: '#854d0e' },
    { label: 'صيانة', value: units.filter(u => u.status === 'صيانة').length, color: '#991b1b' },
  ]

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للعقارات
      </button>

      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>{property?.name}</h1>
      <p style={{ color: '#666', margin: '0 0 20px' }}>{property?.address || ''}</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي الوحدات', value: units.length, bg: '#eff6ff', color: '#1B4D7A' },
          { label: 'مؤجرة', value: units.filter(u => u.status === 'مؤجرة').length, bg: '#dcfce7', color: '#166534' },
          { label: 'شاغرة', value: units.filter(u => u.status === 'شاغرة').length, bg: '#fef9c3', color: '#854d0e' },
          { label: 'صيانة', value: units.filter(u => u.status === 'صيانة').length, bg: '#fee2e2', color: '#991b1b' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
            <div style={{ fontSize: 13, color: c.color, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة وحدة
        </button>
        <button onClick={fetchAll} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
      </div>

      {units.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا توجد وحدات مسجّلة لهذا العقار</div>
      )}

      {units.length > 0 && (
        <div id="property-detail-table">
          <ExportToolbar
            data={exportData}
            columns={[
              { key: 'unitNumber', label: 'رقم الوحدة' },
              { key: 'unitType', label: 'النوع' },
              { key: 'floor', label: 'الدور' },
              { key: 'area', label: 'المساحة' },
              { key: 'status', label: 'الحالة' },
              { key: 'notes', label: 'ملاحظات' },
            ]}
            filename="property_detail_report"
            title={`تقرير وحدات ${property?.name || ''}`}
            stats={exportStats}
          />

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                {['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات', ''].map(h => (
                  <th key={h} style={{ padding: '12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1B4D7A' }}>{u.unit_number}</td>
                  <td style={{ padding: '12px' }}>{u.unit_type || '—'}</td>
                  <td style={{ padding: '12px' }}>{u.floor ?? '—'}</td>
                  <td style={{ padding: '12px' }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ ...statusColor[u.status], padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{u.status || '—'}</span>
                  </td>
                  <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{u.notes || '—'}</td>
                  <td className="no-print" style={{ padding: '12px' }}>
                    <button onClick={() => openEditForm(u)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                    <button onClick={() => handleDelete(u)} disabled={deletingId === u.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                      {deletingId === u.id ? '...' : 'حذف'}
                    </button>
                  </td>
                </tr>
              ))}
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
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>الحالة</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  {UNIT_STATUS.map(s => <option key={s}>{s}</option>)}
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