import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const UNIT_STATUS = ['مؤجرة', 'شاغرة', 'صيانة']
const UNIT_TYPES = ['شقة', 'محل', 'مستودع', 'غرفة', 'فيلا', 'أرض']

const TYPE_ORDER = { 'محل': 1, 'شقة': 2, 'ورشة': 3 }

const TYPE_BADGE_COLORS = {
  'محل': { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  'شقة': { bg: '#f3e8ff', color: '#7c3aed', border: '#d8b4fe' },
  'ورشة': { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  'مستودع': { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
  'غرفة': { bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  'فيلا': { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  'أرض': { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' },
}

const STATUS_BADGE = {
  'مؤجرة': { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  'شاغرة': { bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  'صيانة': { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
}

function unitTypeStyle(type) {
  return TYPE_BADGE_COLORS[type] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
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

  const rentedCount = units.filter(u => u.status === 'مؤجرة').length
  const vacantCount = units.filter(u => u.status === 'شاغرة').length
  const maintenanceCount = units.filter(u => u.status === 'صيانة').length
  const occupancyPct = units.length ? Math.round((rentedCount / units.length) * 100) : 0

  const summaryCards = [
    { label: 'إجمالي الوحدات', value: units.length, icon: '🏢', accent: '#1B4D7A', bg: '#eef4fb' },
    { label: 'مؤجرة', value: rentedCount, icon: '✅', accent: '#15803d', bg: '#eefdf3' },
    { label: 'شاغرة', value: vacantCount, icon: '🟡', accent: '#a16207', bg: '#fffbea' },
    { label: 'صيانة', value: maintenanceCount, icon: '🛠️', accent: '#b91c1c', bg: '#fef2f2' },
  ]

  if (loading) return <div style={{ padding: 40, fontFamily: 'Cairo, sans-serif' }}>جاري التحميل...</div>

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1050px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
        ← رجوع للعقارات
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', color: '#1B4D7A', fontSize: 26 }}>{property?.name}</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>{property?.address || ''}</p>
        </div>
        <div style={{
          background: '#1B4D7A', color: '#fff', borderRadius: 12, padding: '10px 22px',
          textAlign: 'center', minWidth: 120
        }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{occupancyPct}%</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>نسبة الإشغال</div>
        </div>
      </div>

      {/* بطاقات الملخص - تصميم جديد */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{
            background: c.bg, borderRadius: 14, padding: '16px 18px',
            border: `1px solid ${c.accent}22`, display: 'flex', alignItems: 'center', gap: 14
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.accent, lineHeight: 1.1 }}>{c.value}</div>
              <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
          + إضافة وحدة
        </button>
        <button onClick={fetchAll} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>تحديث</button>
      </div>

      {units.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 24, borderRadius: 12, color: '#6b7280', textAlign: 'center' }}>لا توجد وحدات مسجّلة لهذا العقار</div>
      )}

      {units.length > 0 && (
        <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' }}>
            <thead>
              <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                {['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات', ''].map(h => (
                  <th key={h} style={{ padding: '13px 14px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((u, idx) => {
                const tStyle = unitTypeStyle(u.unit_type)
                const sStyle = STATUS_BADGE[u.status] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
                return (
                  <tr key={u.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #eef1f5' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1B4D7A' }}>{u.unit_number}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        background: tStyle.bg, color: tStyle.color, border: `1px solid ${tStyle.border}`,
                        padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
                      }}>{u.unit_type || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280' }}>{u.floor ?? '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#6b7280' }}>{u.area_sqm ? u.area_sqm + ' م²' : '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        background: sStyle.bg, color: sStyle.color, border: `1px solid ${sStyle.border}`,
                        padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
                      }}>{u.status || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 13 }}>{u.notes || '—'}</td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEditForm(u)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                      <button onClick={() => handleDelete(u)} disabled={deletingId === u.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                        {deletingId === u.id ? '...' : 'حذف'}
                      </button>
                    </td>
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