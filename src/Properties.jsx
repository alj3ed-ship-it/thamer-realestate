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
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1>العقارات</h1>
      <p style={{ color: '#666' }}>إدارة قائمة العقارات</p>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: '6px' }}>
          + إضافة عقار جديد
        </button>
        <button onClick={fetchProperties} style={{ padding: '10px 20px', cursor: 'pointer' }}>تحديث</button>
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}
      {status === 'error' && <div style={{ background: '#fee', padding: '15px', borderRadius: '8px', color: '#c00' }}>فشل تحميل العقارات: {errorMsg}</div>}
      {status === 'success' && properties.length === 0 && <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', color: '#666' }}>لا توجد عقارات مسجّلة حالياً.</div>}

      {status === 'success' && properties.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'right' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>اسم العقار</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>العنوان</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>عدد الوحدات</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}></th>
            </tr>
          </thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>
                  <span onClick={() => onSelectProperty && onSelectProperty(p.id)}
                    style={{ cursor: 'pointer', color: '#1B4D7A', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                    {p.name}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{p.address || '—'}</td>
                <td style={{ padding: '12px', fontWeight: 600, color: '#1B4D7A' }}>{unitCounts[p.id] || 0}</td>
                <td style={{ padding: '12px', textAlign: 'left' }}>
                  <button onClick={() => openEditForm(p)} style={{ padding: '6px 12px', cursor: 'pointer', background: '#eef3ff', color: '#1B4D7A', border: '1px solid #c0d0e8', borderRadius: '6px', fontSize: '13px', marginLeft: '8px' }}>تعديل</button>
                  <button onClick={() => handleDelete(p)} disabled={deletingId === p.id} style={{ padding: '6px 12px', cursor: 'pointer', background: '#fee', color: '#c00', border: '1px solid #fcc', borderRadius: '6px', fontSize: '13px' }}>
                    {deletingId === p.id ? 'جاري الحذف...' : 'حذف'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '10px', width: '400px', maxWidth: '90%' }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'تعديل العقار' : 'إضافة عقار جديد'}</h2>
            <label style={{ display: 'block', marginBottom: '6px', color: '#444' }}>اسم العقار</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} placeholder="مثال: عمارة سلمان" />
            <label style={{ display: 'block', marginBottom: '6px', color: '#444' }}>العنوان</label>
            <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} placeholder="اختياري" />
            {formError && <div style={{ color: '#c00', marginBottom: '15px', fontSize: '14px' }}>{formError}</div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: '10px 20px', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: '6px' }}>
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