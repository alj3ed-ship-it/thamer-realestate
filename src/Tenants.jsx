import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function Tenants({ onBack }) {
  const [tenants, setTenants] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formError, setFormError] = useState('')

  async function fetchTenants() {
    setStatus('loading')
    setErrorMsg('')
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
      return
    }
    setTenants(data)
    setStatus('success')
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  function openAddForm() {
    setEditingId(null)
    setFormName('')
    setFormPhone('')
    setFormNote('')
    setFormError('')
    setShowForm(true)
  }

  function openEditForm(tenant) {
    setEditingId(tenant.id)
    setFormName(tenant.name || '')
    setFormPhone(tenant.phone || '')
    setFormNote(tenant.note || '')
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
  }

  async function handleSave() {
    if (!formName.trim()) {
      setFormError('اسم المستأجر مطلوب')
      return
    }

    setSaving(true)
    setFormError('')

    const payload = {
      name: formName.trim(),
      phone: formPhone.trim() || null,
      note: formNote.trim() || null,
    }

    let error
    if (editingId) {
      const res = await supabase.from('tenants').update(payload).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('tenants').insert([payload])
      error = res.error
    }

    setSaving(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setShowForm(false)
    fetchTenants()
  }

  async function handleDelete(tenant) {
    const confirmed = window.confirm(`هل أنت متأكد من حذف "${tenant.name}"؟`)
    if (!confirmed) return

    setDeletingId(tenant.id)
    const { error } = await supabase.from('tenants').delete().eq('id', tenant.id)
    setDeletingId(null)

    if (error) {
      alert('فشل الحذف: ' + error.message)
      return
    }

    fetchTenants()
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'sans-serif', padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer' }}
      >
        ← رجوع للوحة التحكم
      </button>

      <h1>المستأجرون</h1>
      <p style={{ color: '#666' }}>إدارة قائمة المستأجرين</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={openAddForm}
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            background: '#1B4D7A',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
          }}
        >
          + إضافة مستأجر جديد
        </button>
        <button onClick={fetchTenants} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          تحديث
        </button>
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}

      {status === 'error' && (
        <div style={{ background: '#fee', padding: '15px', borderRadius: '8px', color: '#c00' }}>
          فشل تحميل المستأجرين: {errorMsg}
        </div>
      )}

      {status === 'success' && tenants.length === 0 && (
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', color: '#666' }}>
          لا يوجد مستأجرون مسجّلون حالياً.
        </div>
      )}

      {status === 'success' && tenants.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'right' }}>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>الاسم</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>الجوال</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}>ملاحظات</th>
              <th style={{ padding: '12px', borderBottom: '2px solid #ddd' }}></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: '#1B4D7A' }}>{t.name}</td>
                <td style={{ padding: '12px' }}>{t.phone || '—'}</td>
                <td style={{ padding: '12px', color: '#888', fontSize: '13px' }}>{t.note || '—'}</td>
                <td style={{ padding: '12px', textAlign: 'left' }}>
                  <button
                    onClick={() => openEditForm(t)}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      background: '#eef3ff',
                      color: '#1B4D7A',
                      border: '1px solid #c0d0e8',
                      borderRadius: '6px',
                      fontSize: '13px',
                      marginLeft: '8px',
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    disabled={deletingId === t.id}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      background: '#fee',
                      color: '#c00',
                      border: '1px solid #fcc',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    {deletingId === t.id ? 'جاري الحذف...' : 'حذف'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '10px',
              width: '400px',
              maxWidth: '90%',
            }}
          >
            <h2 style={{ marginTop: 0 }}>{editingId ? 'تعديل مستأجر' : 'إضافة مستأجر جديد'}</h2>

            <label style={{ display: 'block', marginBottom: '6px', color: '#444' }}>الاسم</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              placeholder="اسم المستأجر"
            />

            <label style={{ display: 'block', marginBottom: '6px', color: '#444' }}>الجوال</label>
            <input
              type="text"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
              placeholder="05xxxxxxxx"
            />

            <label style={{ display: 'block', marginBottom: '6px', color: '#444' }}>ملاحظات (اختياري)</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', resize: 'vertical' }}
              placeholder="أي معلومة إضافية..."
            />

            {formError && (
              <div style={{ color: '#c00', marginBottom: '15px', fontSize: '14px' }}>{formError}</div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={closeForm} disabled={saving} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: '6px' }}
              >
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
