import { useState, useEffect, useRef } from 'react'
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

// ترتيب سطور الربع: بحسب أولوية العقار، ثم رقم العقد، ثم رقم الدفعة
function sortLines(lines) {
  return [...(lines || [])].sort((a, b) =>
    (a.propOrder - b.propOrder) ||
    String(a.property).localeCompare(String(b.property), 'ar') ||
    String(a.leaseNumber).localeCompare(String(b.leaseNumber)) ||
    (Number(a.installmentNo || 0) - Number(b.installmentNo || 0)) ||
    String(a.dueGregorian || '').localeCompare(String(b.dueGregorian || ''))
  )
}

function lineInstallmentText(l) {
  if (l.installmentNo && l.totalInstallments) return `${l.installmentNo} / ${l.totalInstallments}`
  return l.installmentNo ? String(l.installmentNo) : '—'
}

function lineDueText(l) {
  if (!l.dueHijri && !l.dueGregorian) return '—'
  return `${l.dueHijri || '—'} هـ (${l.dueGregorian || '—'})`
}

export default function VatReturns({ onBack }) {
  const isReadOnly = useReadOnly()
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [filings, setFilings] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [selectedQuarters, setSelectedQuarters] = useState([]) // فارغ = كل الأرباع
  const [showAllQuarters, setShowAllQuarters] = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)
  const fileInputRefs = useRef({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [pay, lea, pro, ten, fil, inv] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, tax_enabled, tax_effective_hijri, amount_includes_vat, start_date_hijri, payment_type, payment_frequency, lease_number'),
      supabase.from('properties').select('id, name, priority'),
      supabase.from('tenants').select('id, name'),
      supabase.from('vat_filings').select('*'),
      supabase.from('invoices').select('id, invoice_number, customer_name, total_amount, issue_date, lease_id'),
    ])
    setPayments(pay.data || [])
    setLeases(lea.data || [])
    setProperties(pro.data || [])
    setTenants(ten.data || [])
    setFilings(fil.data || [])
    setInvoices(inv.data || [])
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

  // تاريخ الاستحقاق المحسوب لأي دفعة — الأساس الصحيح لتجميع الأرباع هو تاريخ الاستحقاق
  // التعاقدي (due_date)، وليس تاريخ الاستلام الفعلي (payment_date). دفعة قد تُستلم متأخرة
  // أو مبكرة عن موعدها، لكنها تبقى مستحقة ضريبيًا في ربعها الأصلي حسب العقد.
  function getPaymentDueInfo(p) {
    // الأولوية لتاريخ الاستحقاق المخزّن مباشرة على صف الدفعة نفسها
    if (p.due_date_gregorian) {
      const gDate = new Date(p.due_date_gregorian)
      if (!isNaN(gDate.getTime())) {
        const hijriText = p.due_date_hijri || gregorianToHijriText(p.due_date_gregorian)
        return { hijriText, gDate }
      }
    }
    if (p.due_date_hijri) {
      const parsed = parseHijriDate(p.due_date_hijri)
      if (parsed) {
        const gDate = hijriToGregorianDate(parsed.year, parsed.month, parsed.day)
        if (gDate) return { hijriText: p.due_date_hijri, gDate }
      }
    }

    // ما فيه تاريخ استحقاق مخزّن على الصف (حالة قديمة) — نحسبه تلقائيًا من بداية العقد
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
      const lineProp = properties.find(pr => pr.id === lease.property_id)
      entry.lines = entry.lines || []
      entry.lines.push({
        key: p.id,
        leaseId: lease.id,
        property: getPropertyName(lease.property_id),
        propOrder: Number(lineProp?.priority ?? 999),
        tenant: getTenantName(lease.tenant_id),
        leaseNumber: lease.lease_number || '—',
        installmentNo: p.installment_number || null,
        totalInstallments: p.total_installments || FREQUENCY_MAP[lease.payment_type] || FREQUENCY_MAP[lease.payment_frequency] || null,
        dueHijri: dueInfo.hijriText,
        dueGregorian: p.due_date_gregorian || `${dueInfo.gDate.getFullYear()}-${String(dueInfo.gDate.getMonth() + 1).padStart(2, '0')}-${String(dueInfo.gDate.getDate()).padStart(2, '0')}`,
        contractAmount: Number(p.amount || 0),
        inclusive: !!lease.amount_includes_vat,
        base,
        tax,
      })
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
    entry.lines = entry.lines || []
    entry.lines.push({
      manual: true, key: 'manual-' + f.quarter_key, property: 'تعديل يدوي', propOrder: 9999,
      tenant: 'ضريبة مسبقة السداد', leaseNumber: '—', installmentNo: null, totalInstallments: null,
      dueHijri: null, dueGregorian: null, contractAmount: null, inclusive: null, base: 0, tax: adj,
    })
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

  // فواتير العملاء (من صفحة الفواتير الإلكترونية) المرتبطة بنفس العقود اللي أنتجت
  // أرقام هذا الربع فعلياً — الربط بالعقد (lease_id) مو بتاريخ الإصدار الحر اليدوي،
  // لأن تاريخ الإصدار حقل يدوي ما له علاقة ضرورية بموعد استحقاق الدفعة الفعلي
  function getQuarterInvoices(quarter) {
    const leaseIds = new Set(Object.keys(quarter.breakdown))
    return invoices
      .filter(inv => inv.lease_id && leaseIds.has(inv.lease_id))
      .sort((a, b) => new Date(a.issue_date || 0) - new Date(b.issue_date || 0))
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

  // رفع ملف الإقرار أو إيصال السداد لكل ربع — يُخزَّن برابط عام مباشر بـ Supabase Storage
  // (bucket: vat-documents) بنفس نمط رفع عقود الإيجار المعتمد بالنظام
  async function handleFilingFileUpload(quarter, file, field) {
    if (!file) return
    const uploadKey = `${quarter.key}:${field}`
    setUploadingKey(uploadKey)
    try {
      const ext = file.name.split('.').pop()
      const prefix = field === 'declaration_file_url' ? 'declaration' : 'payment'
      const path = `vat/${quarter.key}/${prefix}_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('vat-documents').upload(path, file, { upsert: true })
      if (upErr) {
        alert('فشل رفع الملف: ' + upErr.message)
        return
      }
      const { data: pub } = supabase.storage.from('vat-documents').getPublicUrl(path)
      const existing = getFiling(quarter.key)
      const payload = {
        quarter_key: quarter.key,
        filed: existing?.filed || false,
        filed_date: existing?.filed_date || null,
        notes: existing?.notes ?? null,
        declaration_file_url: existing?.declaration_file_url || null,
        payment_receipt_url: existing?.payment_receipt_url || null,
        [field]: pub.publicUrl,
      }
      if (existing) {
        await supabase.from('vat_filings').update(payload).eq('quarter_key', quarter.key)
      } else {
        await supabase.from('vat_filings').insert([payload])
      }
      fetchAll()
    } finally {
      setUploadingKey(null)
    }
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
      const quarterLabel = `${q.key} (${getQuarterRangeLabel(q.year, q.q)})`
      const deadlineText = formatDate(getDeadline(q.year, q.q))
      const lines = sortLines(q.lines)
      if (lines.length === 0) {
        rows.push({
          quarter: quarterLabel,
          property: '—', leaseNumber: '—', tenant: '—', installment: '—', due: '—',
          amount: '—', vatType: '—', tax: '0 ريال',
          deadline: deadlineText, status: statusInfo[st].label,
        })
        return
      }
      lines.forEach(l => {
        rows.push({
          quarter: quarterLabel,
          property: l.property,
          leaseNumber: l.leaseNumber,
          tenant: l.tenant,
          installment: l.manual ? '—' : lineInstallmentText(l),
          due: l.manual ? '—' : lineDueText(l),
          amount: l.manual ? '—' : { value: l.contractAmount.toLocaleString(), color: '#1B4D7A' },
          vatType: l.manual ? '—' : (l.inclusive ? 'شامل' : 'غير شامل'),
          tax: { value: l.tax.toLocaleString() + ' ريال', color: '#B42318' },
          deadline: deadlineText,
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
              { key: 'leaseNumber', label: 'رقم العقد' },
              { key: 'tenant', label: 'المستأجر' },
              { key: 'installment', label: 'الدفعة' },
              { key: 'due', label: 'تاريخ الاستحقاق' },
              { key: 'amount', label: 'مبلغ الدفعة (ريال)' },
              { key: 'vatType', label: 'نوع المبلغ' },
              { key: 'tax', label: 'الضريبة' },
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
                      {sortLines(q.lines).map((b, i) => (
                        <div key={i} style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <span><strong style={{ color: '#374151' }}>{b.property}</strong> — {b.tenant}{b.manual ? '' : ` — عقد ${b.leaseNumber} — دفعة ${lineInstallmentText(b)} — استحقاق ${lineDueText(b)}`}</span>
                          <span>
                            {b.manual ? <>ضريبة <strong style={{ color: '#dc2626' }}>{b.tax.toLocaleString()}</strong> ريال</> : <>مبلغ الدفعة <strong style={{ color: '#1d4ed8' }}>{b.contractAmount.toLocaleString()}</strong> ({b.inclusive ? 'شامل' : 'غير شامل'}) — ضريبة <strong style={{ color: '#dc2626' }}>{b.tax.toLocaleString()}</strong> ريال</>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const quarterInvoices = getQuarterInvoices(q)
                    if (quarterInvoices.length === 0) return null
                    return (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e5e7eb' }}>
                        <div style={{ fontSize: 11.5, color: '#374151', fontWeight: 700, marginBottom: 4 }}>فواتير العملاء بهذا الربع ({quarterInvoices.length}):</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {quarterInvoices.map(inv => (
                            <div key={inv.id} style={{ fontSize: 11.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                              <span><strong style={{ color: '#374151' }}>{inv.invoice_number}</strong> — {inv.customer_name || '—'}</span>
                              <span>{Number(inv.total_amount || 0).toLocaleString()} ريال</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {!isReadOnly && (
                  <>
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
                  <div className="no-print" style={{ marginTop: 8, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    {[
                      { field: 'payment_receipt_url', label: 'إيصال السداد', icon: '🧾' },
                    ].map(({ field, label, icon }) => {
                      const uploadKey = `${q.key}:${field}`
                      const isUploading = uploadingKey === uploadKey
                      const fileUrl = filing?.[field]
                      return (
                        <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>{label}:</span>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            style={{ display: 'none' }}
                            ref={el => (fileInputRefs.current[uploadKey] = el)}
                            onChange={e => handleFilingFileUpload(q, e.target.files[0], field)}
                          />
                          {fileUrl ? (
                            <>
                              <a href={fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1B4D7A', fontWeight: 700 }}>{icon} عرض</a>
                              <button onClick={() => fileInputRefs.current[uploadKey]?.click()} disabled={isUploading} style={{ fontSize: 11, border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>
                                {isUploading ? '...' : 'تغيير'}
                              </button>
                            </>
                          ) : (
                            <button onClick={() => fileInputRefs.current[uploadKey]?.click()} disabled={isUploading} style={{ fontSize: 11, padding: '2px 10px', borderRadius: 5, border: '1px dashed #8e44ad', background: '#fff', color: '#8e44ad', cursor: 'pointer' }}>
                              {isUploading ? 'جارِ الرفع...' : `${icon} رفع`}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  </>
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