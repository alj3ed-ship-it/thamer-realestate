import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function Properties({ onBack, onSelectProperty }) {
  const [properties, setProperties] = useState([])
  const [unitCounts, setUnitCounts] = useState({})
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formError, setFormError] = useState('')

  async function fetchProperties() {
    setStatus('loading')
    setErrorMsg('')
    const [propsRes, unitsRes] = await Promise.all([
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('units').select('property_id')
    ])
    if (propsRes.error) { setErrorMsg(propsRes.error.message); setStatus('error'); return }
    setProperties(propsRes.data)
    const counts = {}
    for (const u of (unitsRes.data || [])) {
      counts[u.property_id] = (counts[u.property_id] || 0) + 1
    }
    setUnitCounts(counts)
    setStatus('success')
  }

  useEffect(() => { fetchProperties() }, [])

  function openAddForm() {
    setEditingId(null); setFormName(''); setFormAddress(''); setFormError(''); setShowForm(true)
  }

  function openEditForm(property) {
    setEditingId(property.id); setFormName(property.name || ''); setFormAddress(property.address || ''); setFormError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!formName.trim()) { setFormError('اسم العقار مطلوب'); return }
    setSaving(true); setFormError('')
    const payload = { name: formName.trim(), address: formAddress.trim() || null }
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

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px' }}>العقارات</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>إدارة قائمة العقارات</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة عقار جديد
        </button>
        <button onClick={fetchProperties} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}
      {status === 'error' && <div style={{ background: '#fee', padding: 15, borderRadius: 8, color: '#c00' }}>فشل تحميل العقارات: {errorMsg}</div>}
      {status === 'success' && properties.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا توجد عقارات مسجّلة حالياً.</div>
      )}

      {status === 'success' && properties.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                {['اسم العقار', 'العنوان', 'عدد الوحدات', ''].map(h => (
                  <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map((p, idx) => (
                <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <span onClick={() => onSelectProperty && onSelectProperty(p.id)}
                      style={{ cursor: 'pointer', color: '#1B4D7A', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                      {p.name}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{p.address || '—'}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1B4D7A' }}>{unitCounts[p.id] || 0}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => openEditForm(p)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                    <button onClick={() => handleDelete(p)} disabled={deletingId === p.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                      {deletingId === p.id ? '...' : 'حذف'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: 12, width: 400, maxWidth: '90%', direction: 'rtl' }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'تعديل العقار' : 'إضافة عقار جديد'}</h2>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>اسم العقار</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }} placeholder="مثال: عمارة سلمان" />
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