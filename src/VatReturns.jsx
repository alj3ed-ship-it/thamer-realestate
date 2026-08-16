import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ExportToolbar from './components/ExportToolbar'
import { useReadOnly } from './ReadOnlyContext'

const TAX_RATE = 0.15

function hijriSortKey(hijriText) {
  if (!hijriText) return -1
  const parts = hijriText.split('/')
  if (parts.length !== 3) return -1
  const y = parseInt(parts[0]) || 0
  const m = parseInt(parts[1]) || 0
  const d = parseInt(parts[2]) || 0
  return y * 10000 + m * 100 + d
}

const FREQUENCY_MAP = { 'شهري': 12, 'دفعتين': 2, '4 دفعات': 4, '3 دفعات': 3, 'دفعة واحدة': 1 }

function parseHijriDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('/').map(p => parseInt(p))
  if (parts.length !== 3 || parts.some(p => isNaN(p))) return null
  if (parts[0] >= 1300) return { year: parts[0], month: parts[1], day: parts[2] }
  if (parts[2] >= 1300) return { day: parts[0], month: parts[1], year: parts[2] }
  return null
}

function addHijriMonths(date, months) {
  const totalMonths = date.year * 12 + (date.month - 1) + months
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1, day: date.day }
}

function computeInstallmentHijri(startDateHijri, totalInstallments, installmentNumber) {
  const start = parseHijriDate(startDateHijri)
  if (!start || !totalInstallments) return null
  const intervalMonths = 12 / totalInstallments
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths
  return addHijriMonths(start, Math.round(monthsToAdd))
}

// تحويل ميلادي إلى هجري باستخدام تقويم "أم القرى" الرسمي المعتمد بالسعودية (عبر Intl المدمجة بالمتصفح/Node)
// يحل محل الحساب اليدوي القديم الذي كان يعتمد التقويم الهجري الحسابي/الجدولي التقليدي ويختلف عن أم القرى بيوم-يومين
function gregorianToHijriText(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' })
    const parts = fmt.formatToParts(d)
    const hy = parts.find(p => p.type === 'year').value
    const hm = parts.find(p => p.type === 'month').value
    const hd = parts.find(p => p.type === 'day').value
    return `${hy}/${String(hm).padStart(2, '0')}/${String(hd).padStart(2, '0')}`
  } catch {
    return null
  }
}

// تحويل هجري إلى ميلادي باستخدام تقويم "أم القرى" الرسمي (بحث تكراري عبر Intl، لأن جافاسكربت
// لا يوفر بناء تاريخ مباشر من هجري — نبدأ بتقدير تقريبي ثم نصحّح حتى نطابق التاريخ الهجري المطلوب بالضبط)
function hijriToGregorianDate(hy, hm, hd) {
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
    // تقدير أولي تقريبي (متوسط طول السنة الهجرية 354.36667 يوم، والشهر 29.53 يوم) انطلاقًا من 1 محرم 1 هـ
    const epoch = new Date(Date.UTC(622, 6, 19))
    const approxDays = Math.round((hy - 1) * 354.36667 + (hm - 1) * 29.53 + hd)
    let guess = new Date(epoch.getTime() + approxDays * 86400000)

    for (let i = 0; i < 30; i++) {
      const cur = getHijriParts(guess)
      if (cur.y === hy && cur.m === hm && cur.d === hd) {
        return new Date(guess.getFullYear(), guess.getMonth(), guess.getDate())
      }
      const diffMonths = (hy - cur.y) * 12 + (hm - cur.m)
      const diffDays = Math.round(diffMonths * 29.53 + (hd - cur.d))
      const step = diffDays !== 0 ? diffDays : (hd > cur.d ? 1 : -1)
      guess = new Date(guess.getTime() + step * 86400000)
    }
    return null
  } catch { return null }
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

// موعد فتح التقديم = أول يوم بالشهر اللي يلي نهاية الربع
function getFilingOpenDate(year, q) {
  const openMap = {
    1: { y: year, m: 4 },
    2: { y: year, m: 7 },
    3: { y: year, m: 10 },
    4: { y: year + 1, m: 1 },
  }
  const { y, m } = openMap[q]
  return new Date(y, m - 1, 1)
}

// موعد التقديم = آخر يوم بالشهر اللي يلي نهاية الربع
function getDeadline(year, q) {
  const deadlineMap = {
    1: { y: year, m: 4 },
    2: { y: year, m: 7 },
    3: { y: year, m: 10 },
    4: { y: year + 1, m: 1 },
  }
  const { y, m } = deadlineMap[q]
  return new Date(y, m - 1, lastDayOfMonth(y, m))
}

function getQuarterRangeLabel(year, q) {
  const ranges = {
    1: ['يناير', 'مارس'],
    2: ['أبريل', 'يونيو'],
    3: ['يوليو', 'سبتمبر'],
    4: ['أكتوبر', 'ديسمبر'],
  }
  const [start, end] = ranges[q]
  return `${start} - ${end} ${year}`
}

function getQuarterFromDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const q = Math.ceil(month / 3)
  return { year, q, key: `${year}-Q${q}` }
}

function formatDate(d) {
  return d.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateShort(d) {
  return d.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function VatReturns({ onBack }) {
  const isReadOnly = useReadOnly()
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [filings, setFilings] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [selectedQuarters, setSelectedQuarters] = useState([]) // فارغ = كل الأرباع
  const [showAllQuarters, setShowAllQuarters] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [pay, lea, pro, ten, fil] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, tax_enabled, tax_effective_hijri, amount_includes_vat, start_date_hijri, payment_type, payment_frequency'),
      supabase.from('properties').select('id, name'),
      supabase.from('tenants').select('id, name'),
      supabase.from('vat_filings').select('*'),
    ])
    setPayments(pay.data || [])
    setLeases(lea.data || [])
    setProperties(pro.data || [])
    setTenants(ten.data || [])
    setFilings(fil.data || [])
    setLoading(false)
  }

  function getLease(leaseId) {
    return leases.find(l => l.id === leaseId)
  }
  function getPropertyName(id) {
    return properties.find(p => p.id === id)?.name || '—'
  }
  function getTenantName(id) {
    return tenants.find(t => t.id === id)?.name || '—'
  }

  // تاريخ الاستحقاق المحسوب لأي دفعة (نفس منطق صفحة الدفعات) — الأساس الصحيح لتجميع الأرباع
  function getPaymentDueInfo(p) {
    // الأولوية دائمًا لتاريخ مخزّن فعليًا بالصف نفسه (سواء payment_date_hijri أو payment_date) —
    // لأنه غالبًا أدق من الحساب التلقائي (خصوصًا قرب حدود الأرباع)، ولأنه يعكس تواريخ أُدخلت يدويًا وتحققت سابقًا
    if (p.payment_date_hijri) {
      const gDate = new Date(p.payment_date || p.payment_date_hijri)
      if (p.payment_date && !isNaN(new Date(p.payment_date).getTime())) {
        return { hijriText: p.payment_date_hijri, gDate: new Date(p.payment_date) }
      }
    }
    if (p.payment_date) {
      const gDate = new Date(p.payment_date)
      if (!isNaN(gDate.getTime())) {
        const hijriText = gregorianToHijriText(p.payment_date)
        return { hijriText, gDate }
      }
    }

    // ما فيه تاريخ مخزّن (قسط مستقبلي لسا ما تحدد له تاريخ يدوي) — نحسبه تلقائيًا من بداية العقد
    const lease = getLease(p.lease_id)
    if (!lease || !lease.start_date_hijri) return null
    const total = p.total_installments || FREQUENCY_MAP[lease.payment_type] || FREQUENCY_MAP[lease.payment_frequency] || 1
    const instNum = p.installment_number || 1
    const hijri = computeInstallmentHijri(lease.start_date_hijri, total, instNum)
    if (!hijri) return null
    const gDate = hijriToGregorianDate(hijri.year, hijri.month, hijri.day)
    if (!gDate) return null
    const hijriText = `${hijri.year}/${String(hijri.month).padStart(2, '0')}/${String(hijri.day).padStart(2, '0')}`
    return { hijriText, gDate }
  }

  function isTaxApplicable(p, dueHijriText) {
    const lease = getLease(p.lease_id)
    if (!lease || !lease.tax_enabled) return false
    if (!dueHijriText) return false
    if (!lease.tax_effective_hijri) return true
    return hijriSortKey(dueHijriText) >= hijriSortKey(lease.tax_effective_hijri)
  }

  function getTaxAmount(p, applicable) {
    if (!applicable) return 0
    const lease = getLease(p.lease_id)
    const amt = Number(p.amount || 0)
    if (lease?.amount_includes_vat) {
      return Math.round(amt - (amt / 1.15))
    }
    return Math.round(amt * TAX_RATE)
  }

  function getBaseAmount(p, applicable) {
    const lease = getLease(p.lease_id)
    const amt = Number(p.amount || 0)
    if (applicable && lease?.amount_includes_vat) {
      return Math.round(amt / 1.15)
    }
    return amt
  }

  // تجميع حسب الربع الميلادي بناءً على تاريخ الاستحقاق (وليس تاريخ الدفع الفعلي)
  // + تفصيل كل عقد/مستأجر/عقار داخل كل ربع
  const quartersMap = {}
  payments.forEach(p => {
    const dueInfo = getPaymentDueInfo(p)
    if (!dueInfo) return
    const applicable = isTaxApplicable(p, dueInfo.hijriText)
    if (!applicable) return
    const q = getQuarterFromDate(dueInfo.gDate.toISOString().slice(0, 10))
    if (!q) return
    if (!quartersMap[q.key]) {
      quartersMap[q.key] = {
        key: q.key, year: q.year, q: q.q,
        baseTotal: 0, taxTotal: 0, count: 0, properties: new Set(), breakdown: {},
      }
    }
    const entry = quartersMap[q.key]
    const base = getBaseAmount(p, applicable)
    const tax = getTaxAmount(p, applicable)
    entry.baseTotal += base
    entry.taxTotal += tax
    entry.count += 1
    const lease = getLease(p.lease_id)
    if (lease) {
      entry.properties.add(lease.property_id)
      const bKey = lease.id
      if (!entry.breakdown[bKey]) {
        entry.breakdown[bKey] = {
          property: getPropertyName(lease.property_id),
          tenant: getTenantName(lease.tenant_id),
          base: 0, tax: 0,
        }
      }
      entry.breakdown[bKey].base += base
      entry.breakdown[bKey].tax += tax
    }
  })

  // تعديلات يدوية على الضريبة (مثل ضريبة مسبقة السداد قبل بداية تسجيل النظام) —
  // غير مرتبطة بأي دفعة، تُضاف فقط لمجموع الربع المعني بتقرير الإقرارات
  filings.forEach(f => {
    const adj = Number(f.manual_tax_adjustment || 0)
    if (adj <= 0) return
    if (!quartersMap[f.quarter_key]) {
      const [yStr, qStr] = f.quarter_key.split('-Q')
      quartersMap[f.quarter_key] = {
        key: f.quarter_key, year: Number(yStr), q: Number(qStr),
        baseTotal: 0, taxTotal: 0, count: 0, properties: new Set(), breakdown: {},
      }
    }
    const entry = quartersMap[f.quarter_key]
    entry.taxTotal += adj
    entry.breakdown['manual-adjustment'] = {
      property: 'تعديل يدوي',
      tenant: 'ضريبة مسبقة السداد',
      base: 0, tax: (entry.breakdown['manual-adjustment']?.tax || 0) + adj,
    }
  })

  const now = new Date()
  const currentQ = { year: now.getFullYear(), q: Math.ceil((now.getMonth() + 1) / 3) }
  const currentKey = `${currentQ.year}-Q${currentQ.q}`
  if (!quartersMap[currentKey]) {
    quartersMap[currentKey] = { key: currentKey, year: currentQ.year, q: currentQ.q, baseTotal: 0, taxTotal: 0, count: 0, properties: new Set(), breakdown: {} }
  }

  // ترتيب تصاعدي: من الأقدم للأحدث
  const quarters = Object.values(quartersMap).sort((a, b) => a.year - b.year || a.q - b.q)

  function getFiling(key) {
    return filings.find(f => f.quarter_key === key)
  }

  function getStatus(quarter) {
    const filing = getFiling(quarter.key)
    if (filing?.filed) return 'filed'
    const deadline = getDeadline(quarter.year, quarter.q)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const qEndDate = new Date(quarter.year, quarter.q * 3, 0)
    if (today < qEndDate) return 'upcoming'
    if (today > deadline) return 'overdue'
    return 'due'
  }

  function getDaysToDeadline(quarter) {
    const deadline = getDeadline(quarter.year, quarter.q)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  }

  function getDaysToOpen(quarter) {
    const openDate = getFilingOpenDate(quarter.year, quarter.q)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((openDate - today) / (1000 * 60 * 60 * 24))
  }

  // أول ربع (بالترتيب الزمني) لسا مستحق أو متأخر وما تم تقديمه — هذا هو المميّز بصرياً
  const focusKey = quarters.find(q => {
    const st = getStatus(q)
    return st === 'due' || st === 'overdue'
  })?.key

  // آخر 4 أرباع كعرض افتراضي: تاريخية أولاً، وإذا كانت أقل من 4 نكمّل بأقرب أرباع قادمة
  const historicalQuarters = quarters.filter(q => getStatus(q) !== 'upcoming')
  const defaultQuarters = (() => {
    if (historicalQuarters.length >= 4) return historicalQuarters.slice(-4)
    const historicalKeys = new Set(historicalQuarters.map(q => q.key))
    const upcomingQuarters = quarters.filter(q => !historicalKeys.has(q.key))
    const needed = 4 - historicalQuarters.length
    return [...historicalQuarters, ...upcomingQuarters.slice(0, needed)]
  })()
  const displayedQuarters = showAllQuarters ? quarters : defaultQuarters
  const hasMoreQuarters = !showAllQuarters && quarters.length > defaultQuarters.length

  async function toggleFiled(quarter) {
    setSavingKey(quarter.key)
    const existing = getFiling(quarter.key)
    const newFiled = !(existing?.filed)
    const payload = {
      quarter_key: quarter.key,
      filed: newFiled,
      filed_date: newFiled ? new Date().toISOString().slice(0, 10) : null,
      notes: noteDrafts[quarter.key] ?? existing?.notes ?? null,
    }
    if (existing) {
      await supabase.from('vat_filings').update(payload).eq('quarter_key', quarter.key)
    } else {
      await supabase.from('vat_filings').insert([payload])
    }
    setSavingKey(null)
    fetchAll()
  }

  async function saveNote(quarter) {
    setSavingKey(quarter.key)
    const existing = getFiling(quarter.key)
    const payload = {
      quarter_key: quarter.key,
      filed: existing?.filed || false,
      filed_date: existing?.filed_date || null,
      notes: noteDrafts[quarter.key] ?? '',
    }
    if (existing) {
      await supabase.from('vat_filings').update(payload).eq('quarter_key', quarter.key)
    } else {
      await supabase.from('vat_filings').insert([payload])
    }
    setSavingKey(null)
    fetchAll()
  }

  function getDeadlineColor(daysLeft) {
    if (daysLeft < 0) return '#e74c3c' // متأخر
    if (daysLeft <= 30) return '#ea580c' // قريب — برتقالي واضح وحقيقي
    return '#27ae60' // بعيد
  }

  function getOpenColor(daysToOpen) {
    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 30) return '#ea580c' // قريب من الفتح — برتقالي واضح وحقيقي
    return '#d4a017' // بعيد بعد — أصفر واضح بدل الرمادي الباهت
  }

  const statusInfo = {
    filed: { label: 'مقدَّم ✓', bg: '#EAFAF1', color: '#27ae60' },
    upcoming: { label: 'قادم', bg: '#F4F6F7', color: '#7f8c8d' },
    due: { label: 'مستحق الآن ⏰', bg: '#FEF9E7', color: '#f39c12' },
    overdue: { label: 'متأخر ⚠', bg: '#FDEDEC', color: '#e74c3c' },
  }

  const grandTotalTax = quarters.reduce((s, q) => s + q.taxTotal, 0)
  const unfiledTax = quarters.filter(q => getStatus(q) !== 'filed').reduce((s, q) => s + q.taxTotal, 0)

  function buildExportRows(selected) {
    const list = selected.length === 0 ? quarters : quarters.filter(q => selected.includes(q.key))
    const rows = []
    list.forEach(q => {
      const st = getStatus(q)
      const breakdownList = Object.values(q.breakdown)
      if (breakdownList.length === 0) {
        rows.push({
          quarter: `${q.key} (${getQuarterRangeLabel(q.year, q.q)})`,
          property: '—', tenant: '—', base: '0 ريال', tax: '0 ريال',
          deadline: formatDate(getDeadline(q.year, q.q)), status: statusInfo[st].label,
        })
        return
      }
      breakdownList.forEach(b => {
        rows.push({
          quarter: `${q.key} (${getQuarterRangeLabel(q.year, q.q)})`,
          property: b.property,
          tenant: b.tenant,
          base: b.base.toLocaleString() + ' ريال',
          tax: b.tax.toLocaleString() + ' ريال',
          deadline: formatDate(getDeadline(q.year, q.q)),
          status: statusInfo[st].label,
        })
      })
    })
    return rows
  }

  const exportData = buildExportRows(selectedQuarters)
  const isAllSelected = selectedQuarters.length === 0 || selectedQuarters.length === quarters.length
  const selectedList = isAllSelected ? quarters : quarters.filter(q => selectedQuarters.includes(q.key))
  const scopedBaseTotal = selectedList.reduce((s, q) => s + q.baseTotal, 0)
  const scopedTaxTotal = selectedList.reduce((s, q) => s + q.taxTotal, 0)
  const exportStatsScoped = isAllSelected
    ? [
        { label: 'إجمالي الضريبة', value: `${grandTotalTax.toLocaleString()} ريال`, color: '#dc2626' },
        { label: 'غير مقدَّم', value: `${unfiledTax.toLocaleString()} ريال`, color: '#e74c3c' },
      ]
    : [
        { label: 'الإيراد الأساسي', value: `${scopedBaseTotal.toLocaleString()} ريال`, color: '#1d4ed8' },
        { label: 'الضريبة المستحقة', value: `${scopedTaxTotal.toLocaleString()} ريال`, color: '#dc2626' },
      ]
  const scopeSuffix = isAllSelected ? 'all' : selectedQuarters.slice().sort().join('_')
  const scopeTitle = isAllSelected
    ? 'تقرير الإقرارات الضريبية'
    : selectedQuarters.length === 1
      ? `إقرار ${selectedQuarters[0]}`
      : `إقرارات ${selectedQuarters.slice().sort().join(' + ')}`

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '30px 34px', maxWidth: '1150px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '7px 16px', marginBottom: '14px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13 }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A', fontSize: 23 }}>الإقرارات الضريبية</h1>
      <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: 13 }}>ضريبة القيمة المضافة — تجميع ربعي ومتابعة التقديم</p>

      <div style={{ display: 'flex', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 200px', background: '#fff', border: '1px solid #1B4D7A33', borderTop: '4px solid #1B4D7A',
          borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🧾</div>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>إجمالي الضريبة (كل الأرباع)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1B4D7A' }}>{grandTotalTax.toLocaleString()} ريال</div>
        </div>
        <div style={{
          flex: '1 1 200px', background: '#fff', border: '1px solid #dc262633', borderTop: '4px solid #dc2626',
          borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
          <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>غير مقدَّم بعد</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{unfiledTax.toLocaleString()} ريال</div>
        </div>
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && (
        <div id="vat-returns-table">
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>تصدير/طباعة:</label>
            <button
              onClick={() => setSelectedQuarters(quarters.map(q => q.key))}
              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              تحديد الكل
            </button>
            <button
              onClick={() => setSelectedQuarters([])}
              style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>
              مسح التحديد (= الكل)
            </button>
            <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
              {isAllSelected ? 'سيتم تصدير/طباعة كل الأرباع' : `محدد: ${selectedQuarters.length} ربع`}
            </span>
          </div>

          <ExportToolbar
            data={exportData}
            columns={[
              { key: 'quarter', label: 'الربع' },
              { key: 'property', label: 'العقار' },
              { key: 'tenant', label: 'المستأجر' },
              { key: 'base', label: 'الإيراد الأساسي' },
              { key: 'tax', label: 'الضريبة المستحقة' },
              { key: 'deadline', label: 'آخر موعد للتقديم' },
              { key: 'status', label: 'الحالة' },
            ]}
            filename={`vat_returns_${scopeSuffix}`}
            title={scopeTitle}
            stats={exportStatsScoped}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayedQuarters.map(q => {
              const st = getStatus(q)
              const info = statusInfo[st]
              const deadline = getDeadline(q.year, q.q)
              const openDate = getFilingOpenDate(q.year, q.q)
              const daysLeft = getDaysToDeadline(q)
              const daysToOpen = getDaysToOpen(q)
              const filing = getFiling(q.key)
              const noteVal = noteDrafts[q.key] ?? (filing?.notes || '')
              const isFocus = q.key === focusKey
              const breakdownList = Object.values(q.breakdown)

              return (
                <div key={q.key} style={{
                  background: isFocus ? '#FFFBEA' : '#fff', borderRadius: 10, padding: '12px 18px',
                  boxShadow: isFocus ? '0 0 0 2px #f39c12, 0 2px 8px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.08)',
                  border: isFocus ? 'none' : `1px solid ${info.color}22`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ minWidth: 190 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1B4D7A', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          className="no-print"
                          checked={selectedQuarters.includes(q.key)}
                          onChange={() => {
                            setSelectedQuarters(prev =>
                              prev.includes(q.key) ? prev.filter(k => k !== q.key) : [...prev, q.key]
                            )
                          }}
                          style={{ cursor: 'pointer', width: 15, height: 15 }}
                        />
                        {q.key} <span style={{ fontWeight: 400, fontSize: 12, color: '#6b7280' }}>({getQuarterRangeLabel(q.year, q.q)})</span>
                        {isFocus && <span style={{ marginRight: 6, background: '#f39c12', color: '#fff', fontSize: 10, padding: '1px 8px', borderRadius: 10, fontWeight: 700 }}>الحالي</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>
                        عقارات: {q.properties.size} — دفعات: {q.count}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>الأساسي</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>{q.baseTotal.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>الضريبة</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>{q.taxTotal.toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{formatDateShort(openDate)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: getOpenColor(daysToOpen) }}>
                            {daysToOpen >= 0 ? `بعد ${daysToOpen} يوم` : `منذ ${Math.abs(daysToOpen)} يوم`}
                          </div>
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>←</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: st === 'filed' ? '#27ae60' : getDeadlineColor(daysLeft) }}>
                            {st === 'filed' ? 'تم التقديم ✓' : (daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`)}
                          </div>
                        </div>
                      </div>
                      <span style={{ background: info.bg, color: info.color, padding: '3px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {info.label}
                      </span>
                    </div>
                  </div>

                  {breakdownList.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e5e7eb', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {breakdownList.map((b, i) => (
                        <div key={i} style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <span><strong style={{ color: '#374151' }}>{b.property}</strong> — {b.tenant}</span>
                          <span>
                            أساسي <strong style={{ color: '#1d4ed8' }}>{b.base.toLocaleString()}</strong> + ضريبة <strong style={{ color: '#dc2626' }}>{b.tax.toLocaleString()}</strong> ريال
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isReadOnly && (
                  <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleFiled(q)}
                      disabled={savingKey === q.key}
                      style={{
                        padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: filing?.filed ? '#fee' : '#1B4D7A',
                        color: filing?.filed ? '#c00' : '#fff', fontWeight: 700, fontSize: 12
                      }}>
                      {savingKey === q.key ? '...' : filing?.filed ? '↺ إلغاء التأكيد' : '✓ تأكيد التقديم'}
                    </button>
                    {filing?.filed && filing?.filed_date && (
                      <span style={{ fontSize: 11, color: '#27ae60' }}>تم بتاريخ: {filing.filed_date}</span>
                    )}
                    <input
                      type="text"
                      placeholder="ملاحظة (اختياري)"
                      value={noteVal}
                      onChange={e => setNoteDrafts(prev => ({ ...prev, [q.key]: e.target.value }))}
                      onBlur={() => saveNote(q)}
                      style={{ flex: 1, minWidth: 140, padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}
                    />
                  </div>
                  )}
                  {isReadOnly && filing?.filed && filing?.filed_date && (
                    <div style={{ marginTop: 10, fontSize: 11, color: '#27ae60' }}>تم التقديم بتاريخ: {filing.filed_date}</div>
                  )}
                </div>
              )
            })}
          </div>

          {(hasMoreQuarters || showAllQuarters) && (
            <div className="no-print" style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => setShowAllQuarters(!showAllQuarters)}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {showAllQuarters ? '▲ عرض أقل (آخر 4 أرباع فقط)' : `▼ عرض المزيد (${quarters.length - defaultQuarters.length} ربع إضافي)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}