import { useState, useEffect, useRef } from 'react'
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

const STATUS_OPTIONS = ['مدفوع', 'جزئي', 'unpaid']

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

function hijriPartsToText(hy, hm, hd) {
  if (!hy || !hm || !hd) return null
  return `${hy}/${String(hm).padStart(2,'0')}/${String(hd).padStart(2,'0')}`
}

function gregorianToHijri(gregorianDateStr) {
  if (!gregorianDateStr) return null
  try {
    const d = new Date(gregorianDateStr)
    if (isNaN(d.getTime())) return null
    const gy = d.getFullYear(), gm = d.getMonth() + 1, gd = d.getDate()
    const jd = Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
      Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
      Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) +
      gd - 32075
    let l = jd - 1948440 + 10632
    const n = Math.floor((l - 1) / 10631)
    l = l - 10631 * n + 354
    const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
      Math.floor(l / 5670) * Math.floor((43 * l) / 15238)
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
    const month = Math.floor((24 * l) / 709)
    const day = l - Math.floor((709 * month) / 24)
    const year = 30 * n + j - 30
    return { year, month, day }
  } catch { return null }
}

function parseHijriText(text) {
  if (!text) return { year: '', month: '', day: '' }
  const parts = text.split('/')
  if (parts.length !== 3) return { year: '', month: '', day: '' }
  return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) }
}

// تحليل تاريخ بداية العقد الهجري — يتعرف تلقائياً على موقع السنة
// (قد يكون محفوظاً بصيغة سنة/شهر/يوم أو يوم/شهر/سنة)
function parseHijriParts(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('/').map(p => parseInt(p))
  if (parts.length !== 3 || parts.some(p => isNaN(p))) return null
  if (parts[0] >= 1300) {
    return { year: parts[0], month: parts[1], day: parts[2] }
  }
  if (parts[2] >= 1300) {
    return { day: parts[0], month: parts[1], year: parts[2] }
  }
  return null
}

function addHijriMonths(date, months) {
  const totalMonths = date.year * 12 + (date.month - 1) + months
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1, day: date.day }
}

// حساب تاريخ استحقاق قسط معيّن بناءً على تاريخ بداية العقد وعدد الأقساط ورقم القسط
function computeInstallmentHijri(startDateHijri, totalInstallments, installmentNumber) {
  const start = parseHijriParts(startDateHijri)
  if (!start || !totalInstallments) return null
  const intervalMonths = 12 / totalInstallments
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths
  return addHijriMonths(start, Math.round(monthsToAdd))
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
          {HIJRI_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m} ({i+1})</option>)}
        </select>
        <select value={value.day || ''} onChange={e => onChange({ ...value, day: Number(e.target.value) })}
          style={{ flex: 2, padding: '8px 6px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
          <option value="">اليوم</option>
          {HIJRI_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {value.year && value.month && value.day && (
        <div style={{ fontSize: 11, color: '#059669', marginTop: 3 }}>
          هجري: {hijriPartsToText(value.year, value.month, value.day)} ← ميلادي: {hijriPartsToGregorian(value.year, value.month, value.day)}
        </div>
      )}
      {(value.year || value.month || value.day) && !(value.year && value.month && value.day) && (
        <div style={{ fontSize: 11, color: '#c0392b', marginTop: 3, fontWeight: 700 }}>
          ⚠ يرجى تحديد السنة والشهر واليوم معاً قبل الحفظ
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
  const [filterTenants, setFilterTenants] = useState([])
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const [tenantSearchText, setTenantSearchText] = useState('')
  const tenantBoxRef = useRef(null)
  const [form, setForm] = useState({
    lease_id: '', amount: '', amount_paid: '', status: 'مدفوع',
    payment_date: '', payment_date_hijri: '',
    payment_hijri: { year: '', month: '', day: '' },
    payment_method: '', notes: ''
  })
  const [formError, setFormError] = useState('')

  async function fetchAll() {
    setStatus('loading')
    const [pay, lea, ten, pro, uni, lu] = await Promise.all([
      supabase.from('payments').select('*').order('payment_date', { ascending: true }),
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, payment_frequency, payment_type, unit_id, start_date_hijri'),
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (tenantBoxRef.current && !tenantBoxRef.current.contains(e.target)) {
        setShowTenantDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  function hijriSortKey(hijriText) {
    if (!hijriText) return 99999999
    const parts = hijriText.split('/')
    if (parts.length !== 3) return 99999999
    const y = parseInt(parts[0]) || 0
    const m = parseInt(parts[1]) || 0
    const d = parseInt(parts[2]) || 0
    return y * 10000 + m * 100 + d
  }

  function getPaymentIndex(payment) {
    const leasePayments = payments
      .filter(p => p.lease_id === payment.lease_id)
      .sort((a, b) => hijriSortKey(a.payment_date_hijri) - hijriSortKey(b.payment_date_hijri))
    const idx = leasePayments.findIndex(p => p.id === payment.id)
    return idx + 1
  }

  // يحسب تاريخ الاستحقاق المتوقع لدفعة غير مسددة، ويحدد هل هي متأخرة أو لسا ما جا وقتها
  function getUnpaidDueInfo(p) {
    const lease = leases.find(l => l.id === p.lease_id)
    if (!lease || !lease.start_date_hijri) return { hijriText: null, subStatus: 'overdue' }
    const total = p.total_installments || getTotalInstallments(p.lease_id)
    const instNum = p.installment_number || getPaymentIndex(p)
    const hijri = computeInstallmentHijri(lease.start_date_hijri, total, instNum)
    if (!hijri) return { hijriText: null, subStatus: 'overdue' }
    const g = hijriToGregorian(hijri.year, hijri.month, hijri.day)
    if (!g) return { hijriText: hijriPartsToText(hijri.year, hijri.month, hijri.day), subStatus: 'overdue' }
    const dueDate = new Date(g.year, g.month - 1, g.day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return {
      hijriText: hijriPartsToText(hijri.year, hijri.month, hijri.day),
      // يوم الاستحقاق نفسه يُعتبر مستحقاً (متأخر) وليس "غير مستحق بعد"
      subStatus: dueDate <= today ? 'overdue' : 'not_due'
    }
  }

  function openAdd() {
    setEditingId(null)
    setForm({
      lease_id: '', amount: '', amount_paid: '', status: 'مدفوع',
      payment_date: '', payment_date_hijri: '',
      payment_hijri: { year: '', month: '', day: '' },
      payment_method: '', notes: ''
    })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(p) {
    setEditingId(p.id)
    const hijriParts = parseHijriText(p.payment_date_hijri)
    setForm({
      lease_id: p.lease_id || '',
      amount: p.amount || '',
      amount_paid: p.amount_paid || '',
      status: p.status || 'مدفوع',
      payment_date: p.payment_date || '',
      payment_date_hijri: p.payment_date_hijri || '',
      payment_hijri: hijriParts,
      payment_method: p.payment_method || '',
      notes: p.notes || ''
    })
    setFormError('')
    setShowForm(true)
  }

  function handleLeaseChange(leaseId) {
    const amt = getInstallmentAmount(leaseId)
    setForm(f => ({ ...f, lease_id: leaseId, amount: amt ? String(amt) : f.amount }))
  }

  function handleHijriChange(val) {
    if (val.year && val.month && val.day) {
      const g = hijriPartsToGregorian(val.year, val.month, val.day)
      const h = hijriPartsToText(val.year, val.month, val.day)
      setForm(f => ({ ...f, payment_hijri: val, payment_date: g || f.payment_date, payment_date_hijri: h || f.payment_date_hijri }))
    } else {
      setForm(f => ({ ...f, payment_hijri: val }))
    }
  }

  async function handleSave() {
    if (!form.lease_id || !form.amount) { setFormError('يرجى ملء الحقول المطلوبة'); return }
    const h = form.payment_hijri
    const hijriPartial = (h.year || h.month || h.day) && !(h.year && h.month && h.day)
    if (hijriPartial) { setFormError('التاريخ الهجري غير مكتمل — يرجى تحديد السنة والشهر واليوم'); return }

    let paymentDate = form.payment_date
    if (!paymentDate && form.payment_hijri.year && form.payment_hijri.month && form.payment_hijri.day) {
      paymentDate = hijriPartsToGregorian(form.payment_hijri.year, form.payment_hijri.month, form.payment_hijri.day)
    }
    if (!paymentDate) { setFormError('يرجى تحديد تاريخ الدفع'); return }

    setSaving(true); setFormError('')
    const payload = {
      lease_id: form.lease_id,
      amount: Number(form.amount),
      amount_paid: form.amount_paid ? Number(form.amount_paid) : Number(form.amount),
      status: form.status || 'مدفوع',
      payment_date: paymentDate,
      payment_date_hijri: form.payment_date_hijri || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null
    }
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

  function getTenantId(leaseId) {
    return leases.find(l => l.id === leaseId)?.tenant_id || null
  }

  const filteredPayments = (filterProperty === 'الكل'
    ? payments
    : payments.filter(p => getPropertyId(p.lease_id) === filterProperty)
  )
    .filter(p => filterTenants.length === 0 || filterTenants.includes(getTenantId(p.lease_id)))
    .sort((a, b) => hijriSortKey(a.payment_date_hijri) - hijriSortKey(b.payment_date_hijri))

  // قائمة المستأجرين المرتبطين فعلياً بالعقار المختار (أو الكل لو ما فيه فلتر عقار)، مرتبة أبجدياً
  const availableTenants = tenants
    .filter(t => filterProperty === 'الكل' || leases.some(l => l.tenant_id === t.id && l.property_id === filterProperty))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))

  const filteredTenantOptions = availableTenants.filter(t =>
    (t.name || '').toLowerCase().includes(tenantSearchText.toLowerCase())
  )

  const totalFiltered = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)

  // الشارة الآن تفرّق بين: مدفوع / جزئي / متأخر / غير مستحق بعد
  function statusBadge(p) {
    const st = p.status
    if (st === 'مدفوع' || st === 'paid') return <span style={{ background: '#EAFAF1', color: '#27ae60', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>مدفوع ✓</span>
    if (st === 'جزئي' || st === 'partial') return <span style={{ background: '#FEF9E7', color: '#f39c12', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>جزئي ⚠</span>
    const { subStatus } = getUnpaidDueInfo(p)
    if (subStatus === 'not_due') return <span style={{ background: '#F4F6F7', color: '#7f8c8d', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>غير مستحق بعد ⏳</span>
    return <span style={{ background: '#FDEDEC', color: '#e74c3c', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>متأخر ⏰</span>
  }

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
        <select value={filterProperty} onChange={e => { setFilterProperty(e.target.value); setFilterTenants([]) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
          <option value="الكل">كل العقارات</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div ref={tenantBoxRef} style={{ position: 'relative', marginRight: 'auto' }}>
          <button
            type="button"
            onClick={() => setShowTenantDropdown(!showTenantDropdown)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'Cairo, sans-serif', minWidth: 180, background: '#fff', cursor: 'pointer', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>
              {filterTenants.length === 0
                ? 'كل المستأجرين'
                : filterTenants.length === 1
                  ? (availableTenants.find(t => t.id === filterTenants[0])?.name || 'مستأجر واحد')
                  : `${filterTenants.length} مستأجرين محددين`}
            </span>
            <span style={{ fontSize: 10, color: '#999' }}>▾</span>
          </button>

          {showTenantDropdown && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 10, zIndex: 20, minWidth: 240, maxHeight: 320, overflowY: 'auto' }}>
              <input
                type="text"
                placeholder="اكتب اسم المستأجر..."
                value={tenantSearchText}
                onChange={(e) => setTenantSearchText(e.target.value)}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'Cairo, sans-serif', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                <button type="button" onClick={() => setFilterTenants(filteredTenantOptions.map(t => t.id))}
                  style={{ fontSize: 12, color: '#1B4D7A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  تحديد الكل
                </button>
                <button type="button" onClick={() => setFilterTenants([])}
                  style={{ fontSize: 12, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  إلغاء الكل
                </button>
              </div>
              {filteredTenantOptions.length === 0 && (
                <div style={{ fontSize: 13, color: '#999', padding: '6px 4px' }}>لا يوجد مستأجر بهذا الاسم</div>
              )}
              {filteredTenantOptions.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 14, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterTenants.includes(t.id)}
                    onChange={() => {
                      setFilterTenants(prev =>
                        prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                      )
                    }}
                  />
                  {t.name}
                </label>
              ))}
            </div>
          )}
        </div>
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
                {['المستأجر', 'العقار', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات', ''].map(h => (
                  <th key={h} style={{ padding: '12px', color: '#fff', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p, idx) => {
                // نفضّل الرقم الحقيقي المحفوظ بقاعدة البيانات (نفس المستخدم في صفحة الاستحقاقات)
                // ونرجع للتخمين بالفرز فقط لو الرقم الحقيقي غير موجود
                const total = p.total_installments || getTotalInstallments(p.lease_id)
                const index = p.installment_number || getPaymentIndex(p)
                const isUnpaid = !(p.status === 'مدفوع' || p.status === 'paid' || p.status === 'جزئي' || p.status === 'partial')

                let hijriText = p.payment_date_hijri
                let isEstimated = false
                if (!hijriText && p.payment_date) {
                  const h = gregorianToHijri(p.payment_date)
                  if (h) hijriText = hijriPartsToText(h.year, h.month, h.day)
                } else if (!hijriText && !p.payment_date && isUnpaid) {
                  const { hijriText: estText } = getUnpaidDueInfo(p)
                  if (estText) { hijriText = estText; isEstimated = true }
                }

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
                    <td style={{ padding: '12px' }}>{statusBadge(p)}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>
                      <div style={{ fontWeight: 600 }}>{hijriText ? hijriText + ' هـ' : '—'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.payment_date || (isEstimated ? 'متوقع' : '—')}</div>
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

            <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>المبلغ الكلي (ريال)</label>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="مثال: 5000"
              style={{ width: '100%', padding: '8px 10px', marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />

            <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>المبلغ المدفوع (اتركه فارغاً إذا كامل)</label>
            <input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
              placeholder="اتركه فارغاً إذا مدفوع كامل"
              style={{ width: '100%', padding: '8px 10px', marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />

            <label style={{ fontSize: 13, color: '#444', display: 'block', marginBottom: 4 }}>حالة الدفعة</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
              <option value="مدفوع">مدفوع ✓</option>
              <option value="جزئي">جزئي ⚠</option>
              <option value="unpaid">غير مدفوع ✗</option>
            </select>

            <div style={{ marginBottom: 15 }}>
              <HijriPicker label="تاريخ الدفع (هجري)" value={form.payment_hijri} onChange={handleHijriChange} />
            </div>

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