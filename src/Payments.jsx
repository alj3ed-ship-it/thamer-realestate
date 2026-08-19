import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'
import { LeaseStatusBadge } from './leaseStatus'
import LeaseDetailsModal from './LeaseDetailsModal'

const FREQUENCY_MAP = {
  'دفعة واحدة': 1,
  'دفعتين': 2,
  '4 دفعات': 4,
  '3 دفعات': 3,
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
const TAX_RATE = 0.15

function hijriToGregorian(hy, hm, hd) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' })
    function getHijriParts(d) {
      const parts = fmt.formatToParts(d)
      return {
        y: parseInt(parts.find(p => p.type === 'year').value),
        m: parseInt(parts.find(p => p.type === 'month').value),
        d: parseInt(parts.find(p => p.type === 'day').value),
      }
    }
    const epoch = new Date(Date.UTC(622, 6, 19))
    const approxDays = Math.round((hy - 1) * 354.36667 + (hm - 1) * 29.53 + hd)
    let guess = new Date(epoch.getTime() + approxDays * 86400000)

    for (let i = 0; i < 30; i++) {
      const cur = getHijriParts(guess)
      if (cur.y === hy && cur.m === hm && cur.d === hd) {
        return { year: guess.getFullYear(), month: guess.getMonth() + 1, day: guess.getDate() }
      }
      const diffMonths = (hy - cur.y) * 12 + (hm - cur.m)
      const diffDays = Math.round(diffMonths * 29.53 + (hd - cur.d))
      const step = diffDays !== 0 ? diffDays : (hd > cur.d ? 1 : -1)
      guess = new Date(guess.getTime() + step * 86400000)
    }
    return null
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
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' })
    const parts = fmt.formatToParts(d)
    const year = parseInt(parts.find(p => p.type === 'year').value)
    const month = parseInt(parts.find(p => p.type === 'month').value)
    const day = parseInt(parts.find(p => p.type === 'day').value)
    return { year, month, day }
  } catch { return null }
}

function parseHijriText(text) {
  if (!text) return { year: '', month: '', day: '' }
  const parts = text.split('/')
  if (parts.length !== 3) return { year: '', month: '', day: '' }
  return { year: Number(parts[0]), month: Number(parts[1]), day: Number(parts[2]) }
}

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

function computeInstallmentHijri(startDateHijri, totalInstallments, installmentNumber) {
  const start = parseHijriParts(startDateHijri)
  if (!start || !totalInstallments) return null
  const intervalMonths = 12 / totalInstallments
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths
  return addHijriMonths(start, Math.round(monthsToAdd))
}

// مفتاح ترتيب رقمي لمقارنة تاريخين هجريين نصيين (يُستخدم لتحديد سريان الضريبة)
function hijriSortKey(hijriText) {
  if (!hijriText) return -1
  const parts = hijriText.split('/')
  if (parts.length !== 3) return -1
  const y = parseInt(parts[0]) || 0
  const m = parseInt(parts[1]) || 0
  const d = parseInt(parts[2]) || 0
  return y * 10000 + m * 100 + d
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
  const isReadOnly = useReadOnly()
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
  const [viewingLeaseId, setViewingLeaseId] = useState(null)
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
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, payment_frequency, payment_type, unit_id, start_date_hijri, end_date, lease_number, tax_enabled, tax_effective_hijri, amount_includes_vat'),
      supabase.from('tenants').select('id, name, note'),
      supabase.from('properties').select('id, name').order('name'),
      supabase.from('units').select('id, unit_number, unit_type'),
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

  function getLease(leaseId) {
    return leases.find(l => l.id === leaseId)
  }

  function getTenantName(leaseId) {
    const lease = getLease(leaseId)
    return tenants.find(t => t.id === lease?.tenant_id)?.name || '—'
  }

  function getTenantActivity(leaseId) {
    const lease = getLease(leaseId)
    return tenants.find(t => t.id === lease?.tenant_id)?.note || '—'
  }

  function getPropertyName(leaseId) {
    const lease = getLease(leaseId)
    return properties.find(p => p.id === lease?.property_id)?.name || '—'
  }

  function getPropertyId(leaseId) {
    return getLease(leaseId)?.property_id || null
  }

  function getUnitNumbers(leaseId) {
    const lease = getLease(leaseId)
    if (!lease) return '—'
    const unitIds = leaseUnits.filter(lu => lu.lease_id === leaseId).map(lu => lu.unit_id)
    if (lease.unit_id && !unitIds.includes(lease.unit_id)) unitIds.push(lease.unit_id)
    const nums = unitIds.map(uid => units.find(u => u.id === uid)?.unit_number).filter(Boolean)
    return nums.sort((a, b) => Number(a) - Number(b)).join('، ') || '—'
  }

  const UNIT_TYPE_ORDER = { 'محل': 1, 'شقة': 2, 'ورشة': 3 }

  // أولوية ترتيب العقد حسب أصغر وحدة فيه: النوع أولاً (محل قبل شقة)، ثم الرقم
  function getPrimaryUnitSort(leaseId) {
    const lease = getLease(leaseId)
    if (!lease) return { typeRank: 99, number: 9999 }
    const unitIds = leaseUnits.filter(lu => lu.lease_id === leaseId).map(lu => lu.unit_id)
    if (lease.unit_id && !unitIds.includes(lease.unit_id)) unitIds.push(lease.unit_id)
    const unitObjs = unitIds.map(uid => units.find(u => u.id === uid)).filter(Boolean)
    if (unitObjs.length === 0) return { typeRank: 99, number: 9999 }
    let best = { typeRank: 99, number: 9999 }
    unitObjs.forEach(u => {
      const typeRank = UNIT_TYPE_ORDER[(u.unit_type || '').trim()] || 4
      const number = parseInt(u.unit_number) || 9999
      if (typeRank < best.typeRank || (typeRank === best.typeRank && number < best.number)) {
        best = { typeRank, number }
      }
    })
    return best
  }

  // شارات منفصلة لكل نوع وحدة بالعقد — مثلاً "محل 1، 2، 3" و"شقة 4" كشارتين مستقلتين
  function getUnitBadgesList(leaseId) {
    const lease = getLease(leaseId)
    if (!lease) return []
    const unitIds = leaseUnits.filter(lu => lu.lease_id === leaseId).map(lu => lu.unit_id)
    if (lease.unit_id && !unitIds.includes(lease.unit_id)) unitIds.push(lease.unit_id)
    const unitObjs = unitIds.map(uid => units.find(u => u.id === uid)).filter(Boolean)
    if (unitObjs.length === 0) return []
    const groups = {}
    unitObjs.forEach(u => {
      const type = (u.unit_type || 'وحدة').trim()
      if (!groups[type]) groups[type] = []
      groups[type].push(parseInt(u.unit_number) || 0)
    })
    return Object.entries(groups)
      .sort((a, b) => (UNIT_TYPE_ORDER[a[0]] || 4) - (UNIT_TYPE_ORDER[b[0]] || 4))
      .map(([type, nums]) => ({
        type,
        numbers: nums.sort((a, b) => a - b).join('، ')
      }))
  }

  function getInstallmentAmount(leaseId) {
    const lease = getLease(leaseId)
    if (!lease || !lease.rent_amount) return ''
    const freq = FREQUENCY_MAP[lease.payment_type] || FREQUENCY_MAP[lease.payment_frequency] || 1
    return Math.round(lease.rent_amount / freq)
  }

  function getTotalInstallments(leaseId) {
    const lease = getLease(leaseId)
    if (!lease) return null
    return FREQUENCY_MAP[lease.payment_type] || FREQUENCY_MAP[lease.payment_frequency] || null
  }

  function getPaymentIndex(payment) {
    const leasePayments = payments
      .filter(p => p.lease_id === payment.lease_id)
      .sort((a, b) => hijriSortKey(a.payment_date_hijri) - hijriSortKey(b.payment_date_hijri))
    const idx = leasePayments.findIndex(p => p.id === payment.id)
    return idx + 1
  }

  function getUnpaidDueInfo(p) {
    const lease = getLease(p.lease_id)
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
    const isUnpaid = form.status === 'unpaid'
    const h = form.payment_hijri
    const hijriPartial = !isUnpaid && (h.year || h.month || h.day) && !(h.year && h.month && h.day)
    if (hijriPartial) { setFormError('التاريخ الهجري غير مكتمل — يرجى تحديد السنة والشهر واليوم'); return }

    let paymentDate = form.payment_date
    if (!paymentDate && form.payment_hijri.year && form.payment_hijri.month && form.payment_hijri.day) {
      paymentDate = hijriPartsToGregorian(form.payment_hijri.year, form.payment_hijri.month, form.payment_hijri.day)
    }
    if (!isUnpaid && !paymentDate) { setFormError('يرجى تحديد تاريخ الدفع'); return }

    setSaving(true); setFormError('')
    const payload = {
      lease_id: form.lease_id,
      amount: Number(form.amount),
      amount_paid: isUnpaid ? 0 : (form.amount_paid ? Number(form.amount_paid) : Number(form.amount)),
      status: form.status || 'مدفوع',
      payment_date: isUnpaid ? null : paymentDate,
      payment_date_hijri: isUnpaid ? null : (form.payment_date_hijri || null),
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
    return getLease(leaseId)?.tenant_id || null
  }

  function getPaymentHijriDisplay(p) {
    const computed = computePaymentStatus(p)
    const isUnpaid = computed === 'overdue' || computed === 'not_due'
    let hijriText = p.payment_date_hijri
    let isEstimated = false
    if (!hijriText && p.payment_date) {
      const h = gregorianToHijri(p.payment_date)
      if (h) hijriText = hijriPartsToText(h.year, h.month, h.day)
    } else if (!hijriText && !p.payment_date && isUnpaid) {
      const { hijriText: estText } = getUnpaidDueInfo(p)
      if (estText) { hijriText = estText; isEstimated = true }
    }
    return { hijriText, isEstimated }
  }

  // هل الضريبة تسري على هذه الدفعة بالذات، حسب إعداد العقد وتاريخ الدفعة
  function isTaxApplicable(p) {
    const lease = getLease(p.lease_id)
    if (!lease || !lease.tax_enabled) return false
    const { hijriText } = getPaymentHijriDisplay(p)
    if (!hijriText) return false
    if (!lease.tax_effective_hijri) return true
    return hijriSortKey(hijriText) >= hijriSortKey(lease.tax_effective_hijri)
  }

  // هل مبلغ هذا العقد مُدخل شاملاً الضريبة أصلاً (مثل عقد المجاهدين/فايف سنتر)
  function isAmountVatInclusive(p) {
    const lease = getLease(p.lease_id)
    return !!lease?.amount_includes_vat
  }

  // المبلغ الأساسي (بدون ضريبة) — يُستخرج من الداخل لو العقد شامل، أو هو نفسه المبلغ لو غير شامل
  function getBaseAmount(p) {
    const amt = Number(p.amount || 0)
    if (isTaxApplicable(p) && isAmountVatInclusive(p)) {
      return amt / 1.15
    }
    return amt
  }

  // قيمة الضريبة: تُستقطع من الداخل لو العقد شامل، أو تُضاف فوق المبلغ لو غير شامل (يتحملها المالك)
  function getTaxAmount(p) {
    if (!isTaxApplicable(p)) return 0
    const amt = Number(p.amount || 0)
    if (isAmountVatInclusive(p)) {
      return Math.round(amt - (amt / 1.15))
    }
    return Math.round(amt * TAX_RATE)
  }

  // الصافي الفعلي الذي يستلمه المالك بعد أثر الضريبة (بغض النظر عن نوع العقد)
  function getTotalWithTax(p) {
    const amt = Number(p.amount || 0)
    if (!isTaxApplicable(p)) return amt
    if (isAmountVatInclusive(p)) {
      return Math.round(getBaseAmount(p))
    }
    return amt - getTaxAmount(p)
  }

  function getEffectiveSortKey(p) {
    const { hijriText } = getPaymentHijriDisplay(p)
    return hijriSortKey(hijriText)
  }

  function computePaymentStatus(p) {
    const due = Number(p.amount || 0)
    const paid = Number(p.amount_paid || 0)
    if (paid > 0 && paid >= due && due > 0) return 'paid'
    if (paid > 0) return 'partial'
    const { subStatus } = getUnpaidDueInfo(p)
    return subStatus
  }

  // ملخص إحصائي لكل عقار — يُستخدم في شاشة العقارات الرئيسية
  const propertySummaries = properties.map(prop => {
    const propPayments = payments.filter(p => getPropertyId(p.lease_id) === prop.id && p.status !== "ملغى")
    const total = propPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const paid = propPayments.reduce((s, p) => s + Number(p.amount_paid || 0), 0)
    const remaining = Math.max(total - paid, 0)
    const tax = propPayments.reduce((s, p) => s + getTaxAmount(p), 0)
    const overdueCount = propPayments.filter(p => computePaymentStatus(p) === 'overdue').length
    return { id: prop.id, name: prop.name, total, paid, remaining, tax, count: propPayments.length, overdueCount }
  }).sort((a, b) => {
    const priority = ['عمارة سلمان', 'عمارة إبراهيم', 'عمارة عبدالله الكبيرة', 'عمارة عبدالله الصغيرة']
    const aIdx = priority.indexOf(a.name)
    const bIdx = priority.indexOf(b.name)
    const aRank = aIdx === -1 ? 999 : aIdx
    const bRank = bIdx === -1 ? 999 : bIdx
    if (aRank !== bRank) return aRank - bRank
    return (a.name || '').localeCompare(b.name || '', 'ar')
  })

  const grandTotal = propertySummaries.reduce((s, p) => s + p.total, 0)
  const grandPaid = propertySummaries.reduce((s, p) => s + p.paid, 0)
  const grandRemaining = propertySummaries.reduce((s, p) => s + p.remaining, 0)
  const grandTax = propertySummaries.reduce((s, p) => s + p.tax, 0)

  const isOverview = filterProperty === 'الكل'
  const currentPropertyName = !isOverview ? (properties.find(p => p.id === filterProperty)?.name || '') : ''

  const filteredPayments = (isOverview
    ? []
    : payments.filter(p => getPropertyId(p.lease_id) === filterProperty && p.status !== "ملغى")
  )
    .filter(p => filterTenants.length === 0 || filterTenants.includes(getTenantId(p.lease_id)))
    .sort((a, b) => {
      // الأولوية أولاً لنوع الوحدة (محل قبل شقة)، ثم لرقم الوحدة الأصغر داخل نفس النوع،
      // وعند تساوي كليهما نرجع لنفس العقد لرقم الدفعة، وإلا للتاريخ.
      const aSort = getPrimaryUnitSort(a.lease_id)
      const bSort = getPrimaryUnitSort(b.lease_id)
      if (aSort.typeRank !== bSort.typeRank) return aSort.typeRank - bSort.typeRank
      if (aSort.number !== bSort.number) return aSort.number - bSort.number
      if (a.lease_id !== b.lease_id) {
        return String(a.lease_id).localeCompare(String(b.lease_id))
      }
      const aIdx = a.installment_number || getPaymentIndex(a)
      const bIdx = b.installment_number || getPaymentIndex(b)
      return aIdx - bIdx
    })

  const availableTenants = tenants
    .filter(t => isOverview || leases.some(l => l.tenant_id === t.id && l.property_id === filterProperty))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))

  const filteredTenantOptions = availableTenants.filter(t =>
    (t.name || '').toLowerCase().includes(tenantSearchText.toLowerCase())
  )

  const totalFiltered = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalTax = filteredPayments.reduce((s, p) => s + getTaxAmount(p), 0)
  const totalWithTax = filteredPayments.reduce((s, p) => s + getTotalWithTax(p), 0)

  function statusToArabic(computed) {
    if (computed === 'paid') return '✓ مدفوع'
    if (computed === 'partial') return '⚠ جزئي'
    if (computed === 'not_due') return '⏳ غير مستحق بعد'
    return '⏰ متأخر'
  }

  function statusBadge(p) {
    const computed = computePaymentStatus(p)
    if (computed === 'paid') return <span style={{ background: '#EAFAF1', color: '#27ae60', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>مدفوع ✓</span>
    if (computed === 'partial') return <span style={{ background: '#FEF9E7', color: '#f39c12', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>جزئي ⚠</span>
    if (computed === 'not_due') return <span style={{ background: '#FDF6E3', color: '#b7950b', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>غير مستحق بعد ⏳</span>
    return <span style={{ background: '#FDEDEC', color: '#e74c3c', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>متأخر ⏰</span>
  }

  function amountCell(p) {
    const computed = computePaymentStatus(p)
    const due = Number(p.amount || 0)
    const paid = Number(p.amount_paid || 0)
    const taxApplies = isTaxApplicable(p)
    const tax = getTaxAmount(p)
    const inclusive = isAmountVatInclusive(p)
    // ألوان واضحة ومنفصلة: أخضر=مدفوع، أحمر=متأخر (إجمالي غير محصّل)، رمادي=غير مستحق بعد، ذهبي=جزئي
    const amountColor = computed === 'paid' ? '#27ae60'
      : computed === 'overdue' ? '#e74c3c'
      : computed === 'not_due' ? '#7f8c8d'
      : '#d4ac0d'
    let base
    if (computed === 'partial') {
      const remaining = due - paid
      base = (
        <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>مدفوع </span>
          <span style={{ color: '#27ae60' }}>{paid.toLocaleString()}</span>
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>متبقي </span>
          <span style={{ color: '#d4ac0d' }}>{remaining.toLocaleString()}</span>
          <span style={{ color: '#9ca3af', margin: '0 4px' }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>الإجمالي </span>
          <span style={{ color: '#e74c3c' }}>{due.toLocaleString()}</span>
        </span>
      )
    } else {
      base = <span style={{ fontWeight: 700, color: amountColor }}>{due.toLocaleString()} ريال</span>
    }
    return (
      <div>
        {base}
        {taxApplies && inclusive && (
          <div style={{ fontSize: 11, color: '#8e44ad', marginTop: 2, fontWeight: 700 }}>
            شامل الضريبة: أساسي {Math.round(getBaseAmount(p)).toLocaleString()} + ضريبة {tax.toLocaleString()}
          </div>
        )}
        {taxApplies && !inclusive && (
          <div style={{ fontSize: 11, color: '#8e44ad', marginTop: 2, fontWeight: 700 }}>
            − ضريبة 15% (يتحملها المالك): {tax.toLocaleString()} ← الصافي: {getTotalWithTax(p).toLocaleString()} ريال
          </div>
        )}
      </div>
    )
  }

  // بيانات مسطّحة للتصدير والطباعة
  const exportRows = filteredPayments.map(p => {
    const total = p.total_installments || getTotalInstallments(p.lease_id)
    const index = p.installment_number || getPaymentIndex(p)
    const computed = computePaymentStatus(p)
    const due = Number(p.amount || 0)
    const paid = Number(p.amount_paid || 0)
    const { hijriText } = getPaymentHijriDisplay(p)
    const taxApplies = isTaxApplicable(p)
    return {
      tenant: getTenantName(p.lease_id),
      property: getPropertyName(p.lease_id),
      activity: getTenantActivity(p.lease_id),
      unit: getUnitNumbers(p.lease_id),
      installment: total ? `${index} / ${total}` : `${index}`,
      amount: computed === 'partial'
        ? {
            value: `${due.toLocaleString()} ريال`,
            color: '#d4ac0d',
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: '#B42318'
          }
        : {
            value: `${due.toLocaleString()} ريال`,
            color: computed === 'paid' ? '#27ae60' : computed === 'overdue' ? '#e74c3c' : '#7f8c8d'
          },
      tax: taxApplies ? `${getTaxAmount(p).toLocaleString()} ريال` : '—',
      totalWithTax: taxApplies ? `${getTotalWithTax(p).toLocaleString()} ريال` : `${due.toLocaleString()} ريال`,
      vatType: taxApplies ? (isAmountVatInclusive(p) ? 'شامل الضريبة' : 'الضريبة على المالك') : '—',
      statusLabel: statusToArabic(computed),
      date: hijriText ? hijriText + ' هـ' : '—',
      method: p.payment_method || '—',
      notes: p.notes || '—'
    }
  })

  function propertyCard(ps) {
    return (
      <button
        key={ps.id}
        type="button"
        onClick={() => { setFilterProperty(ps.id); setFilterTenants([]) }}
        style={{
          textAlign: 'right', cursor: 'pointer', background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          fontFamily: 'Cairo, sans-serif', transition: 'box-shadow 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,77,122,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1B4D7A' }}>{ps.name}</div>
          {ps.overdueCount > 0 && (
            <span style={{ background: '#FDEDEC', color: '#e74c3c', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
              {ps.overdueCount} متأخر
            </span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
          <span>المستحق</span>
          <span style={{ fontWeight: 700, color: '#1B4D7A' }}>{ps.total.toLocaleString()} ريال</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
          <span>المحصّل</span>
          <span style={{ fontWeight: 700, color: '#27ae60' }}>{ps.paid.toLocaleString()} ريال</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
          <span>المتبقي</span>
          <span style={{ fontWeight: 700, color: '#e74c3c' }}>{ps.remaining.toLocaleString()} ريال</span>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#9ca3af' }}>
          {ps.count} دفعة مسجّلة
        </div>
      </button>
    )
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px 24px', maxWidth: '1500px', margin: '0 auto' }}>
      <button
        onClick={() => { if (isOverview) { onBack() } else { setFilterProperty('الكل'); setFilterTenants([]) } }}
        style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        {isOverview ? '← رجوع للوحة التحكم' : '← رجوع لصفحة الدفعات'}
      </button>
      <h1 style={{ margin: '0 0 4px' }}>الدفعات</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
        {isOverview ? 'اختر عقاراً لعرض دفعاته بالتفصيل' : `دفعات: ${currentPropertyName}`}
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {!isReadOnly && (
        <button onClick={openAdd} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + تسجيل دفعة
        </button>
        )}
        <button onClick={fetchAll} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>تحديث</button>

        {!isOverview && (
          <button onClick={() => { setFilterProperty('الكل'); setFilterTenants([]) }}
            style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontWeight: 700 }}>
            ← كل العقارات
          </button>
        )}

        {!isOverview && (
          <select value={filterProperty} onChange={e => { setFilterProperty(e.target.value); setFilterTenants([]) }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
            <option value="الكل">كل العقارات</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        {!isOverview && (
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
        )}

        {!isOverview && (
          <div style={{ background: '#e8f5e9', padding: '8px 16px', borderRadius: 8, fontWeight: 700, color: '#27ae60', fontSize: 15 }}>
            المجموع: {totalFiltered.toLocaleString()} ريال
          </div>
        )}
        {!isOverview && totalTax > 0 && (
          <div style={{ background: '#F4ECF7', padding: '8px 16px', borderRadius: 8, fontWeight: 700, color: '#8e44ad', fontSize: 15 }}>
            الضريبة: {totalTax.toLocaleString()} ريال — الإجمالي الفعلي المستلم: {totalWithTax.toLocaleString()} ريال
          </div>
        )}
      </div>

      {status === 'loading' && <p>جاري التحميل...</p>}

      {status === 'success' && isOverview && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160, background: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#555' }}>إجمالي المستحق (كل العقارات)</div>
              <div style={{ fontWeight: 700, color: '#1B4D7A', fontSize: 18 }}>{grandTotal.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, minWidth: 160, background: '#EAFAF1', border: '1px solid #A9DFBF', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#555' }}>إجمالي المحصّل</div>
              <div style={{ fontWeight: 700, color: '#27ae60', fontSize: 18 }}>{grandPaid.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, minWidth: 160, background: '#FDEDEC', border: '1px solid #F1948A', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#555' }}>إجمالي المتبقي</div>
              <div style={{ fontWeight: 700, color: '#e74c3c', fontSize: 18 }}>{grandRemaining.toLocaleString()} ريال</div>
            </div>
            {grandTax > 0 && (
              <div style={{ flex: 1, minWidth: 160, background: '#F4ECF7', border: '1px solid #E1C6ED', borderRadius: 10, padding: '14px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#555' }}>إجمالي الضريبة</div>
                <div style={{ fontWeight: 700, color: '#8e44ad', fontSize: 18 }}>{grandTax.toLocaleString()} ريال</div>
              </div>
            )}
          </div>

          {propertySummaries.length === 0 ? (
            <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا توجد عقارات.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {propertySummaries.map(propertyCard)}
            </div>
          )}
        </div>
      )}

      {status === 'success' && !isOverview && filteredPayments.length === 0 && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 10, color: '#6b7280', textAlign: 'center' }}>لا توجد دفعات لهذا العقار.</div>
      )}

      {status === 'success' && !isOverview && filteredPayments.length > 0 && (
        <div id="payments-table">
          <ExportToolbar
            data={exportRows}
            columns={[
              { key: 'property', label: 'العقار' },
              { key: 'tenant', label: 'المستأجر' },
              { key: 'activity', label: 'النشاط' },
              { key: 'unit', label: 'الوحدة' },
              { key: 'installment', label: 'الدفعة' },
              { key: 'amount', label: 'المبلغ' },
              { key: 'tax', label: 'الضريبة' },
              { key: 'totalWithTax', label: 'الإجمالي الفعلي' },
              { key: 'statusLabel', label: 'الحالة' },
              { key: 'date', label: 'التاريخ' },
              { key: 'method', label: 'طريقة الدفع' },
              { key: 'notes', label: 'ملاحظات' },
            ]}
            filename={`payments_${filterProperty === 'الكل' ? 'all' : filterProperty}`}
            stats={[
              { label: 'المجموع', value: `${totalFiltered.toLocaleString()} ريال`, color: '#27ae60' },
              { label: 'الضريبة', value: `${totalTax.toLocaleString()} ريال`, color: '#8e44ad' },
              { label: 'الإجمالي الفعلي', value: `${totalWithTax.toLocaleString()} ريال`, color: '#1B4D7A' },
            ]}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {(() => {
              const groups = []
              const groupIndex = {}
              filteredPayments.forEach(p => {
                if (groupIndex[p.lease_id] === undefined) {
                  groupIndex[p.lease_id] = groups.length
                  groups.push({ leaseId: p.lease_id, pays: [] })
                }
                groups[groupIndex[p.lease_id]].pays.push(p)
              })

              return groups.map(group => {
                const leaseId = group.leaseId
                const pays = group.pays
                const total = pays.reduce((s, p) => s + Number(p.amount || 0), 0)
                const paid = pays.reduce((s, p) => s + Number(p.amount_paid || 0), 0)
                const remaining = Math.max(total - paid, 0)

                return (
                  <div key={leaseId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                        <button type="button" onClick={() => setViewingLeaseId(leaseId)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, textAlign: 'right' }} title="عرض تفاصيل العقد">
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#1B4D7A' }}>{getTenantName(leaseId)}</div>
                        </button>
                        <LeaseStatusBadge endDate={getLease(leaseId)?.end_date} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {getUnitBadgesList(leaseId).map((g, i) => (
                          <span key={i} style={{ background: g.type === 'محل' ? '#EAF2F8' : g.type === 'شقة' ? '#EAF7F1' : '#eff6ff', color: g.type === 'محل' ? '#1B4D7A' : g.type === 'شقة' ? '#16a085' : '#1B4D7A', padding: '2px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {g.type} {g.numbers}
                          </span>
                        ))}
                        <span style={{ background: '#F4ECF7', color: '#8E44AD', padding: '2px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {getTenantActivity(leaseId)}
                        </span>
                        <span style={{ background: '#f0f0f0', color: '#666', padding: '2px 10px', borderRadius: 12, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {pays.length} دفعة
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 12, flexWrap: 'wrap' }}>
                        <span style={{ color: '#27ae60', fontWeight: 700 }}>محصّل {paid.toLocaleString()}</span>
                        <span style={{ color: '#e74c3c', fontWeight: 700 }}>متبقي {remaining.toLocaleString()}</span>
                        <span style={{ color: '#1B4D7A', fontWeight: 700 }}>الإجمالي {total.toLocaleString()}</span>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'right', color: '#888', fontWeight: 600, fontSize: 11.5 }}>الدفعة</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', color: '#888', fontWeight: 600, fontSize: 11.5 }}>المبلغ</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', color: '#888', fontWeight: 600, fontSize: 11.5 }}>الحالة</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', color: '#888', fontWeight: 600, fontSize: 11.5 }}>التاريخ</th>
                          {!isReadOnly && <th style={{ padding: '8px 10px' }}></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {pays.map((p, idx) => {
                          const totalInst = p.total_installments || getTotalInstallments(p.lease_id)
                          const index = p.installment_number || getPaymentIndex(p)
                          const { hijriText, isEstimated } = getPaymentHijriDisplay(p)
                          return (
                            <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fbfbfb', borderTop: '1px solid #f0f0f0' }}>
                              <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                <span style={{ background: '#eff6ff', color: '#1B4D7A', padding: '3px 10px', borderRadius: 16, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
                                  {totalInst ? `${index} / ${totalInst}` : `${index}`}
                                </span>
                              </td>
                              <td style={{ padding: '10px', minWidth: 130 }}>{amountCell(p)}</td>
                              <td style={{ padding: '10px' }}>{statusBadge(p)}</td>
                              <td style={{ padding: '10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, fontSize: 12 }}>{hijriText ? hijriText + ' هـ' : '—'}</div>
                                <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.payment_date || (isEstimated ? 'متوقع' : '—')}</div>
                              </td>
                              {!isReadOnly && (
                                <td style={{ padding: '8px' }} className="no-print">
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => openEdit(p)} style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer' }}>تعديل</button>
                                    <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: '3px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                                      {deletingId === p.id ? '...' : 'حذف'}
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })
            })()}
          </div>
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
                return <option key={l.id} value={l.id}>{tname} — {pname}{l.tax_enabled ? ' (عليه ضريبة)' : ''}</option>
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
            <select value={form.status} onChange={e => {
              const val = e.target.value
              setForm(f => ({ ...f, status: val, amount_paid: val === 'unpaid' ? '0' : f.amount_paid }))
            }}
              style={{ width: '100%', padding: '8px 10px', marginBottom: 15, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }}>
              <option value="مدفوع">مدفوع ✓</option>
              <option value="جزئي">جزئي ⚠</option>
              <option value="unpaid">غير مدفوع ✗</option>
            </select>

            <div style={{ marginBottom: 15 }}>
              <HijriPicker label="تاريخ الدفع (هجري)" value={form.payment_hijri} onChange={handleHijriChange} />
              {(form.payment_hijri.year || form.payment_hijri.month || form.payment_hijri.day || form.payment_date) && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, payment_hijri: { year: '', month: '', day: '' }, payment_date: '', payment_date_hijri: '' }))}
                  style={{ marginTop: 6, fontSize: 12, color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                >
                  ✕ مسح تاريخ الدفع
                </button>
              )}
            </div>

            {form.lease_id && (() => {
              const lease = getLease(form.lease_id)
              if (!lease?.tax_enabled) return null
              return (
                <div style={{ background: '#F4ECF7', border: '1px solid #E1C6ED', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 12, color: '#8e44ad' }}>
                  ℹ هذا العقد عليه ضريبة 15% {lease.tax_effective_hijri ? `تسري من ${lease.tax_effective_hijri} هـ` : '(من بداية العقد)'} — {lease.amount_includes_vat ? 'المبلغ المدخل شامل الضريبة (تُستقطع من الداخل).' : 'الضريبة تُضاف فوق المبلغ ويتحملها المالك حالياً.'}
                </div>
              )
            })()}

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

      <LeaseDetailsModal leaseId={viewingLeaseId} onClose={() => setViewingLeaseId(null)} />
    </div>
  )
}

export default Payments
