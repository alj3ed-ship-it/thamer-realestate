import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function TenantDetail({ tenant, onBack }) {
  const [leases, setLeases] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [lea, pro] = await Promise.all([
        supabase.from('leases').select('*').eq('tenant_id', tenant.id),
        supabase.from('properties').select('id, name'),
      ])
      setLeases(lea.data || [])
      setProperties(pro.data || [])
      setLoading(false)
    }
    fetch()
  }, [tenant.id])

  function getPropName(pid) {
    return properties.find(p => p.id === pid)?.name || '—'
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للمستأجرين
      </button>
      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A' }}>{tenant.name}</h1>
      <div style={{ display: 'flex', gap: 24, color: '#6b7280', marginBottom: 28, flexWrap: 'wrap' }}>
        {tenant.phone && <span>📱 {tenant.phone}</span>}
        {tenant.national_id && <span>🪪 {tenant.national_id}</span>}
        {tenant.email && <span>✉️ {tenant.email}</span>}
        {tenant.note && <span>📝 {tenant.note}</span>}
      </div>
      <h3 style={{ color: '#1B4D7A', marginBottom: 12 }}>العقود ({leases.length})</h3>
      {loading && <p>جاري التحميل...</p>}
      {!loading && leases.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>
          لا توجد عقود لهذا المستأجر
        </div>
      )}
      {!loading && leases.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
              {['العقار', 'من', 'إلى', 'الإيجار', 'الحالة'].map(h => (
                <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leases.map((l, idx) => (
              <tr key={l.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#1B4D7A' }}>{getPropName(l.property_id)}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.start_date || '—'}</td>
                <td style={{ padding: '12px', color: '#6b7280' }}>{l.end_date || '—'}</td>
                <td style={{ padding: '12px', fontWeight: 600 }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + ' ريال' : '—'}</td>
                <td style={{ padding: '12px' }}>{l.status || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Tenants({ onBack }) {
  const [tenants, setTenants] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [selectedTenant, setSelectedTenant] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formError, setFormError] = useState('')

  async function fetchTenants() {
    setStatus('loading')
    setErrorMsg('')
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (error) { setErrorMsg(error.message); setStatus('error'); return }
    setTenants(data)
    setStatus('success')
  }

  useEffect(() => { fetchTenants() }, [])

  if (selectedTenant) return <TenantDetail tenant={selectedTenant} onBack={() => setSelectedTenant(null)} />

  function openAddForm() {
    setEditingId(null); setFormName(''); setFormPhone(''); setFormNote(''); setFormError(''); setShowForm(true)
  }

  function openEditForm(tenant) {
    setEditingId(tenant.id); setFormName(tenant.name || ''); setFormPhone(tenant.phone || '')
    setFormNote(tenant.note || ''); setFormError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!formName.trim()) { setFormError('اسم المستأجر مطلوب'); return }
    setSaving(true); setFormError('')
    const payload = { name: formName.trim(), phone: formPhone.trim() || null, note: formNote.trim() || null }
    let error
    if (editingId) { const res = await supabase.from('tenants').update(payload).eq('id', editingId); error = res.error }
    else { const res = await supabase.from('tenants').insert([payload]); error = res.error }
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false); fetchTenants()
  }

  async function handleDelete(tenant) {
    if (!window.confirm(`هل أنت متأكد من حذف "${tenant.name}"؟`)) return
    setDeletingId(tenant.id)
    const { error } = await supabase.from('tenants').delete().eq('id', tenant.id)
    setDeletingId(null)
    if (error) { alert('فشل الحذف: ' + error.message); return }
    fetchTenants()
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px' }}>المستأجرون</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>إدارة قائمة المستأجرين</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة مستأجر جديد
        </button>
        <button onClick={fetchTenants} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}
      {status === 'error' && <div style={{ background: '#fee', padding: 15, borderRadius: 8, color: '#c00' }}>فشل تحميل المستأجرين: {errorMsg}</div>}
      {status === 'success' && tenants.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا يوجد مستأجرون مسجّلون حالياً.</div>
      )}

      {status === 'success' && tenants.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                {['الاسم', 'الجوال', 'ملاحظات', ''].map(h => (
                  <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, idx) => (
                <tr key={t.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <span onClick={() => setSelectedTenant(t)}
                      style={{ cursor: 'pointer', color: '#1B4D7A', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                      {t.name}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{t.phone || '—'}</td>
                  <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{t.note || '—'}</td>
                  <td style={{ padding: '12px' }}>
                    <button onClick={() => openEditForm(t)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                    <button onClick={() => handleDelete(t)} disabled={deletingId === t.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                      {deletingId === t.id ? '...' : 'حذف'}
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
            <h2 style={{ marginTop: 0 }}>{editingId ? 'تعديل مستأجر' : 'إضافة مستأجر جديد'}</h2>
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>الاسم</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }} placeholder="اسم المستأجر" />
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>الجوال</label>
            <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', fontSize: 14 }} placeholder="05xxxxxxxx" />
            <label style={{ display: 'block', marginBottom: 6, color: '#444', fontSize: 13 }}>ملاحظات (اختياري)</label>
            <textarea value={formNote} onChange={e => setFormNote(e.target.value)} rows={3}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box', resize: 'vertical', fontSize: 14 }} placeholder="أي معلومة إضافية..." />
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

export default Tenants