import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const FREQUENCY_MAP = {
  'سنوي': 1,
  'نصف سنوي': 2,
  'ربع سنوي': 4,
  'كل 4 أشهر': 3,
  'شهري': 12,
}

const PAYMENT_METHODS = ['تحويل بنكي', 'نقداً', 'شيك']

const HIJRI_MONTHS = [
  "محرم","صفر","ربيع الأول","ربيع الثاني",
  "جمادى الأولى","جمادى الثانية","رجب","شعبان",
  "رمضان","شوال","ذو القعدة","ذو الحجة"
]
const HIJRI_YEARS = Array.from({ length: 21 }, (_, i) => 1445 + i)
const HIJRI_DAYS = Array.from({ length: 30 }, (_, i) => i + 1)

function hijriToGregorian(hy, hm, hd) {
  try {
    const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
      Math.floor((hm - 1) / 2) + hd + 1948440 - 385
    let l = jd + 68569
    const n = Math.floor((4 * l) / 146097)
    l = l - Math.floor((146097 * n + 3) / 4)
    const i = Math.floor((4000 * (l + 1)) / 1461001)
    l = l - Math.floor((1461 * i) / 4) + 31
    const j = Math.floor((80 * l) / 2447)
    const day = l - Math.floor((2447 * j) / 80)
    l = Math.floor(j / 11)
    const month = j + 2 - 12 * l
    const year = 100 * (n - 49) + i + l
    return { year, month, day }
  } catch { return null }
}

function hijriPartsToGregorian(hy, hm, hd) {
  if (!hy || !hm || !hd) return null
  const g = hijriToGregorian(hy, hm, hd)
  if (!g) return null
  const mm = String(g.month).padStart(2, '0')
  const dd = String(g.day).padStart(2, '0')
  return `${g.year}-${mm}-${dd}`
}

function gregorianToHijri(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('ar-SA-u-ca-islamic', { year: 'numeric', month: 'numeric', day: 'numeric' })
  } catch { return dateStr }
}

function HijriPicker({ label, value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={value.year || ''} onChange={e => onChange({ ...value, year: Number(e.target.value) })}
          style={{ flex: 2, padding: '8px 6px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
          <option value="">السنة</option>
          {HIJRI_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={value.month || ''} onChange={e => onChange({ ...value, month: Number(e.target.value) })}
          style={{ flex: 3, padding: '8px 6px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
          <option value="">الشهر</option>
          {HIJRI_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={value.day || ''} onChange={e => onChange({ ...value, day: Number(e.target.value) })}
          style={{ flex: 2, padding: '8px 6px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
          <option value="">اليوم</option>
          {HIJRI_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {value.year && value.month && value.day && (
        <div style={{ fontSize: 11, color: '#059669', marginTop: 3 }}>
          ← {hijriPartsToGregorian(value.year, value.month, value.day)}
        </div>
      )}
    </div>
  )
}

function Payments({ onBack }) {
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [tenants, setTenants] = useState([])
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [leaseUnits, setLeaseUnits] = useState([])
  const [status, setStatus] = useState('loading')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [filterProperty, setFilterProperty] = useState('الكل')
  const [form, setForm] = useState({
    lease_id: '', amount: '', payment_date: '',
    payment_hijri: { year: '', month: '', day: '' },
    payment_method: '', notes: ''
  })
  const [formError, setFormError] = useState('')

  async function fetchAll() {
    setStatus('loading')
    const [pay, lea, ten, pro, uni, lu] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: true }),
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, payment_frequency, payment_type, unit_id'),
      supabase.from('tenants').select('id, name'),
      supabase.from('properties').select('id, name').order('name'),
      supabase.from('units').select('id, unit_number'),
      supabase.from('lease_units').select('lease_id, unit_id'),
    ])
    setPayments(pay.data || [])
    setLeases(lea.data || [])
    setTenants(ten.data || [])
    setProperties(pro.data || [])
    setUnits(uni.data || [])
    setLeaseUnits(lu.data || [])
    setStatus('success')
  }

  useEffect(() => { fetchAll() }, [])

  function getTenantName(leaseId) {
    const lease = leases.find(l => l.id === leaseId)
    return tenants.find(t => t.id === lease?.tenant_id)?.name || '—'
  }

  function getPropertyName(leaseId) {
    const lease = leases.find(l => l.id === leaseId)
    return properties.find(p => p.id === lease?.property_id)?.name || '—'
  }

  function getPropertyId(leaseId) {
    return leases.find(l => l.id === leaseId)?.property_id || null
  }

  function getUnitNumbers(leaseId) {
    const lease = leases.find(l => l.id === leaseId)
    if (!lease) return '—'
    const unitIds = leaseUnits.filter(lu => lu.lease_id === leaseId).map(lu => lu.unit_id)
    if (lease.unit_id && !unitIds.includes(lease.unit_id)) unitIds.push(lease.unit_id)
    const nums = unitIds.map(uid => units.find(u => u.id === uid)?.unit_number).filter(Boolean)
    return nums.sort((a, b) => Number(a) - Number(b)).join('، ') || '—'
  }

  function getInstallmentAmount(leaseId) {
    const lease = leases.find(l => l.id === leaseId)
    if (!lease || !lease.rent_amount) return ''
    const freq = FREQUENCY_MAP[lease.payment_type] || FREQUENCY_MAP[lease.payment_frequency] || 1
    return Math.round(lease.rent_amount / freq)
  }

  function getTotalInstallments(leaseId) {
    const lease = leases.find(l => l.id === leaseId)
    if (!lease) return null
    return FREQUENCY_MAP[lease.payment_type] || FREQUENCY_MAP[lease.payment_frequency] || null
  }

  function getPaymentIndex(payment) {
    const leasePayments = payments
      .filter(p => p.lease_id === payment.lease_id)
      .sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date))
    const idx = leasePayments.findIndex(p => p.id === payment.id)
    return idx + 1
  }

  function openAdd() {
    setEditingId(null)
    setForm({ lease_id: '', amount: '', payment_date: '', payment_hijri: { year: '', month: '', day: '' }, payment_method: '', notes: '' })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(p) {
    setEditingId(p.id)
    setForm({
      lease_id: p.lease_id || '', amount: p.amount || '',
      payment_date: p.payment_date || '',
      payment_hijri: { year: '', month: '', day: '' },
      payment_method: p.payment_method || '', notes: p.notes || ''
    })
    setFormError('')
    setShowForm(true)
  }

  function handleLeaseChange(leaseId) {
    const amt = getInstallmentAmount(leaseId)
    setForm(f => ({ ...f, lease_id: leaseId, amount: amt ? String(amt) : f.amount }))
  }

  function handleHijriChange(val) {
    const g = hijriPartsToGregorian(val.year, val.month, val.day)
    setForm(f => ({ ...f, payment_hijri: val, payment_date: g || f.payment_date }))
  }

  async function handleSave() {
    if (!form.lease_id || !form.amount || !form.payment_date) { setFormError('يرجى ملء الحقول المطلوبة'); return }
    setSaving(true); setFormError('')
    const payload = { lease_id: form.lease_id, amount: Number(form.amount), payment_date: form.payment_date, payment_method: form.payment_method || null, notes: form.notes || null }
    let error
    if (editingId) { const res = await supabase.from('payments').update(payload).eq('id', editingId); error = res.error }
    else { const res = await supabase.from('payments').insert([payload]); error = res.error }
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false); fetchAll()
  }

  async function handleDelete(id) {
    if (!window.confirm('حذف هذه الدفعة؟')) return
    setDeletingId(id)
    await supabase.from('payments').delete().eq('id', id)
    setDeletingId(null); fetchAll()
  }

  const filteredPayments = (filterProperty === 'الكل'
    ? payments
    : payments.filter(p => getPropertyId(p.lease_id) === filterProperty)
  ).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))

  const totalFiltered = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px' }}>الدفعات</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>سجل الدفعات وتتبعها</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={openAdd} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + تسجيل دفعة
        </button>
        <button onClick={fetchAll} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif', marginRight: 'auto' }}>
          <option value="الكل">كل العقارات</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ background: '#e8f5e9', padding: '8px 16px', borderRadius: 8, fontWeight: 700, color: '#27ae60', fontSize: 15 }}>
          المجموع: {totalFiltered.toLocaleString()} ريال
        </div>
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}

      {status === 'success' && filteredPayments.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا توجد دفعات.</div>
      )}

      {status === 'success' && filteredPayments.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#1B4D7A', textAlign: 'right' }}>
                {['المستأجر', 'العقار', 'الوحدة', 'الدفعة', 'المبلغ', 'التاريخ', 'طريقة الدفع', 'ملاحظات', ''].map(h => (
                  <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p, idx) => {
                const total = getTotalInstallments(p.lease_id)
                const index = getPaymentIndex(p)
                return (
                  <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#1B4D7A' }}>{getTenantName(p.lease_id)}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{getPropertyName(p.lease_id)}</td>
                    <td style={{ padding: '12px', color: '#6b7280', fontSize: 13 }}>{getUnitNumbers(p.lease_id)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: '#eff6ff', color: '#1B4D7A', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        {total ? `${index} / ${total}` : `${index}`}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#27ae60' }}>{Number(p.amount).toLocaleString()} ريال</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>
                      <div>{gregorianToHijri(p.payment_date)}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.payment_date}</div>
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{p.payment_method || '—'}</td>
                    <td style={{ padding: '12px', color: '#9ca3af', fontSize: 13 }}>{p.notes || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                        {deletingId === p.id ? '...' : 'حذف'}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: 12, width: 480, maxWidth: '90%', direction: 'rtl', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>{editingId ? 'تعديل دفعة' : 'تسجيل دفعة جديدة'}</h2>
            <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>العقد</label>
            <select value={form.lease_id} onChange={e => handleLeaseChange(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
              <option value="">اختر عقداً</option>
              {leases.map(l => {
                const tname = tenants.find(t => t.id === l.tenant_id)?.name || ''
                const pname = properties.find(p => p.id === l.property_id)?.name || ''
                return <option key={l.id} value={l.id}>{tname} — {pname}</option>
              })}
            </select>
            <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>المبلغ (ريال)</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="مثال: 5000"
              style={{ width: '100%', padding: '8px 10px', marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
            <div style={{ marginBottom: 15 }}>
              <HijriPicker label="تاريخ الدفع (هجري)" value={form.payment_hijri} onChange={handleHijriChange} />
            </div>
            {form.payment_date && (
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                التاريخ الميلادي: {form.payment_date}
              </div>
            )}
            <div style={{ marginTop: 15 }}>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>طريقة الدفع</label>
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}>
                <option value="">اختياري</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 15 }}>
              <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>ملاحظات</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            {formError && <div style={{ color: '#c00', marginTop: 10, fontSize: 14 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, background: '#1B4D7A', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'تسجيل الدفعة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Payments