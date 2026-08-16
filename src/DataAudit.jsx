import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const FREQUENCY_MAP = { 'دفعة واحدة': 1, 'دفعتين': 2, '4 دفعات': 4, '3 دفعات': 3, 'شهري': 12 }

function parseHijriDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('/').map(p => parseInt(p))
  if (parts.length !== 3 || parts.some(p => isNaN(p))) return null
  if (parts[0] >= 1300) return { year: parts[0], month: parts[1], day: parts[2] }
  if (parts[2] >= 1300) return { day: parts[0], month: parts[1], year: parts[2] }
  return null
}

// تحويل هجري إلى ميلادي باستخدام تقويم "أم القرى" الرسمي (نفس الأسلوب المستخدم ببقية الصفحات)
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

function hijriTextToGregorianLabel(hijriText) {
  const h = parseHijriDate(hijriText)
  if (!h) return '—'
  const g = hijriToGregorianDate(h.year, h.month, h.day)
  if (!g) return '—'
  return g.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' })
}

function dualDate(hijriText) {
  if (!hijriText) return '—'
  return `${hijriText} هـ  =  ${hijriTextToGregorianLabel(hijriText)} م`
}

const SEVERITY = {
  error: { label: 'خطأ', bg: '#FDEDEC', color: '#e74c3c', border: '#F1948A' },
  warning: { label: 'تنبيه', bg: '#FEF9E7', color: '#f39c12', border: '#F7DC6F' },
  info: { label: 'ملاحظة', bg: '#EBF5FB', color: '#2E6394', border: '#AED6F1' },
}

function Badge({ text, colorObj }) {
  return (
    <span style={{
      background: colorObj.bg, color: colorObj.color, border: `1px solid ${colorObj.border}`,
      padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 'bold', whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  )
}

export default function DataAudit({ onBack }) {
  const [loading, setLoading] = useState(true)
  const [issues, setIssues] = useState([])
  const [lastRun, setLastRun] = useState(null)

  useEffect(() => { runAudit() }, [])

  async function runAudit() {
    setLoading(true)
    const [leaRes, payRes, propRes, tenRes, luRes] = await Promise.all([
      supabase.from('leases').select('id, property_id, tenant_id, rent_amount, tax_enabled, tax_effective_hijri, start_date_hijri, payment_type, payment_frequency'),
      supabase.from('payments').select('id, lease_id, amount, amount_due, amount_paid, installment_number, total_installments'),
      supabase.from('properties').select('id, name'),
      supabase.from('tenants').select('id, name'),
      supabase.from('lease_units').select('id, lease_id, unit_id'),
    ])

    const leases = leaRes.data || []
    const payments = payRes.data || []
    const properties = propRes.data || []
    const tenants = tenRes.data || []
    const leaseUnits = luRes.data || []

    const propName = (id) => properties.find(p => p.id === id)?.name || '—'
    const tenName = (id) => tenants.find(t => t.id === id)?.name || '—'
    const leaseById = Object.fromEntries(leases.map(l => [l.id, l]))

    const found = []
    function addIssue(item) { found.push(item) }

    // تجميع الدفعات حسب العقد — أساس الفحص 1 و6
    const paymentsByLease = {}
    payments.forEach(p => {
      if (!paymentsByLease[p.lease_id]) paymentsByLease[p.lease_id] = []
      paymentsByLease[p.lease_id].push(p)
    })

    // نتذكر أي عقد اجتاز فحص المجموع الكلي بدون مشاكل — نستخدمها لاحقاً بفحص 6
    // (لو المجموع صحيح، فتعارض نوع الدفع مع العدد غالباً مدة عقد غير قياسية، مو خطأ فعلي)
    const totalCheckPassed = {}

    // فحص 1: إجمالي أقساط العقد لا يطابق قيمة العقد السنوية
    // (نقارن المجموع الكلي وليس كل قسط لحاله — يسمح بتوزيع غير متساوٍ متعمد مثل متأخرات على أشهر معينة)
    Object.entries(paymentsByLease).forEach(([leaseId, rows]) => {
      const lease = leaseById[leaseId]
      if (!lease || !lease.rent_amount) return
      const totalInstallments = rows[0]?.total_installments
      if (!totalInstallments) return
      const sumDue = rows.reduce((s, p) => s + Number(p.amount_due || 0), 0)
      const cycles = rows.length / totalInstallments
      const expectedTotal = Math.round(Number(lease.rent_amount) * cycles)

      if (Math.abs(sumDue - expectedTotal) <= 1) {
        totalCheckPassed[leaseId] = true
      }

      if (Math.abs(sumDue - expectedTotal) > 1) {
        addIssue({
          type: 'إجمالي الأقساط لا يطابق قيمة العقد',
          severity: 'error',
          property: propName(lease.property_id),
          tenant: tenName(lease.tenant_id),
          detail: `مجموع amount_due لكل الأقساط (${rows.length} قسط) = ${sumDue.toLocaleString()} — المفترض ${expectedTotal.toLocaleString()} (بناءً على rent_amount = ${Number(lease.rent_amount).toLocaleString()})`,
        })
      } else {
        // الإجمالي مطابق — لو الأقساط متفاوتة القيمة، هذي ملاحظة فقط (توزيع متعمد) وليست خطأ
        const distinctValues = new Set(rows.map(p => Number(p.amount_due || 0)))
        if (distinctValues.size > 1) {
          addIssue({
            type: 'أقساط غير متساوية القيمة',
            severity: 'info',
            property: propName(lease.property_id),
            tenant: tenName(lease.tenant_id),
            detail: `الإجمالي مطابق لقيمة العقد، لكن الأقساط متفاوتة (${Array.from(distinctValues).sort((a, b) => a - b).map(v => v.toLocaleString()).join(' / ')}) — تأكد إن هذا توزيع متعمد (متأخرات، خصم مؤقت...) وليس خطأ إدخال`,
          })
        }
      }
    })

    // فحص 7: اختلاف amount عن amount_due بنفس الصف
    payments.forEach(p => {
      const lease = leaseById[p.lease_id]
      const amt = Number(p.amount || 0)
      const due = Number(p.amount_due || 0)
      if (p.amount !== null && p.amount !== undefined && Math.abs(amt - due) > 1) {
        addIssue({
          type: 'اختلاف amount عن amount_due',
          severity: 'error',
          property: lease ? propName(lease.property_id) : '—',
          tenant: lease ? tenName(lease.tenant_id) : '—',
          detail: `القسط رقم ${p.installment_number}: amount = ${amt.toLocaleString()} بينما amount_due = ${due.toLocaleString()} — الإقرارات الضريبية تحسب من amount، والاستحقاقات من amount_due`,
        })
      }
    })

    // فحص 2 و3: إعدادات الضريبة بالعقد
    leases.forEach(lease => {
      if (lease.tax_enabled === null || lease.tax_enabled === undefined) {
        addIssue({
          type: 'tax_enabled غير محدد',
          severity: 'warning',
          property: propName(lease.property_id),
          tenant: tenName(lease.tenant_id),
          detail: 'الحقل tax_enabled فاضي — تأكد هل هذا العقد خاضع للضريبة أو لا',
        })
      }
      if (lease.tax_enabled === true && !lease.tax_effective_hijri) {
        addIssue({
          type: 'بدون تاريخ سريان الضريبة',
          severity: 'warning',
          property: propName(lease.property_id),
          tenant: tenName(lease.tenant_id),
          detail: 'tax_effective_hijri فاضي — البرنامج يفترض سريان الضريبة من أول يوم بالعقد. تأكد هذا مقصود',
        })
      }
    })

    // فحص 4: عقد بدون وحدة مربوطة
    leases.forEach(lease => {
      const linked = leaseUnits.filter(lu => lu.lease_id === lease.id)
      if (linked.length === 0) {
        addIssue({
          type: 'عقد بدون وحدة مربوطة',
          severity: 'error',
          property: propName(lease.property_id),
          tenant: tenName(lease.tenant_id),
          detail: 'لا يوجد صف بجدول lease_units لهذا العقد — عمود الوحدة بيطلع فاضي بكل الصفحات',
        })
      }
    })

    // فحص 5: ربط وحدة مكرر
    const luKey = {}
    leaseUnits.forEach(lu => {
      const key = `${lu.lease_id}__${lu.unit_id}`
      luKey[key] = (luKey[key] || 0) + 1
    })
    Object.entries(luKey).forEach(([key, count]) => {
      if (count > 1) {
        const [leaseId] = key.split('__')
        const lease = leaseById[leaseId]
        addIssue({
          type: 'ربط وحدة مكرر',
          severity: 'warning',
          property: lease ? propName(lease.property_id) : '—',
          tenant: lease ? tenName(lease.tenant_id) : '—',
          detail: `نفس الوحدة مربوطة ${count} مرات بنفس العقد بجدول lease_units`,
        })
      }
    })

    // فحص 6: تعارض نوع الدفع مع عدد الأقساط الفعلي
    Object.entries(paymentsByLease).forEach(([leaseId, rows]) => {
      const lease = leaseById[leaseId]
      if (!lease) return
      const label = lease.payment_type || lease.payment_frequency
      if (!label || !FREQUENCY_MAP[label]) return
      const expectedCount = FREQUENCY_MAP[label]
      const actualCount = Math.max(...rows.map(p => Number(p.total_installments || 0)))
      if (actualCount && actualCount !== expectedCount) {
        const passedTotal = !!totalCheckPassed[leaseId]
        addIssue({
          type: 'تعارض نوع الدفع مع عدد الأقساط',
          severity: passedTotal ? 'info' : 'error',
          property: propName(lease.property_id),
          tenant: tenName(lease.tenant_id),
          detail: passedTotal
            ? `العقد مسجل "${label}" (${expectedCount} قسط بالسنة عادةً) لكن الدفعات الفعلية ${actualCount} قسط — المبلغ الإجمالي مطابق تماماً لقيمة العقد، الأرجح مدة عقد غير قياسية (مثل 11 شهر). تحقق فقط إن هذا مقصود`
            : `العقد مسجل "${label}" (المفترض ${expectedCount} قسط بالسنة) لكن الدفعات الفعلية مقسّمة على ${actualCount} قسط والمجموع لا يطابق قيمة العقد — تحقق من payment_type/payment_frequency أو total_installments`,
          dateNote: dualDate(lease.start_date_hijri),
        })
      }
    })

    setIssues(found)
    setLastRun(new Date())
    setLoading(false)
  }

  const errorCount = issues.filter(i => i.severity === 'error').length
  const warningCount = issues.filter(i => i.severity === 'warning').length
  const infoCount = issues.filter(i => i.severity === 'info').length

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '30px 34px', maxWidth: 1150, margin: '0 auto' }}>
      {onBack && (
        <button onClick={onBack} style={{ padding: '7px 16px', marginBottom: 14, cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13 }}>
          ← رجوع للوحة التحكم
        </button>
      )}
      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A', fontSize: 23 }}>تدقيق البيانات</h1>
      <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: 13 }}>
        فحص تلقائي لسلامة العقود والدفعات وإعدادات الضريبة
      </p>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ background: '#FDEDEC', border: '1px solid #F1948A', borderRadius: 12, padding: '14px 22px', textAlign: 'center', minWidth: 130 }}>
          <div style={{ fontSize: 12, color: '#555' }}>أخطاء</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#e74c3c' }}>{errorCount}</div>
        </div>
        <div style={{ background: '#FEF9E7', border: '1px solid #F7DC6F', borderRadius: 12, padding: '14px 22px', textAlign: 'center', minWidth: 130 }}>
          <div style={{ fontSize: 12, color: '#555' }}>تنبيهات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f39c12' }}>{warningCount}</div>
        </div>
        <div style={{ background: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: 12, padding: '14px 22px', textAlign: 'center', minWidth: 130 }}>
          <div style={{ fontSize: 12, color: '#555' }}>ملاحظات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2E6394' }}>{infoCount}</div>
        </div>
        <button onClick={runAudit} disabled={loading}
          style={{ background: '#1B4D7A', color: '#fff', padding: '10px 22px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'جاري الفحص...' : '↻ إعادة الفحص'}
        </button>
        {lastRun && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            آخر فحص: {lastRun.toLocaleTimeString('ar-SA')}
          </span>
        )}
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && issues.length === 0 && (
        <div style={{ background: '#EAFAF1', border: '1px solid #A9DFBF', borderRadius: 12, padding: 40, textAlign: 'center', color: '#27ae60', fontWeight: 'bold', fontSize: 16 }}>
          ✓ لا توجد مشاكل — كل البيانات سليمة
        </div>
      )}

      {!loading && issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {issues
            .slice()
            .sort((a, b) => {
              const order = { error: 0, warning: 1, info: 2 }
              return order[a.severity] - order[b.severity]
            })
            .map((issue, i) => {
              const sev = SEVERITY[issue.severity]
              return (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10, padding: '14px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${sev.border}55`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge text={sev.label} colorObj={sev} />
                      <strong style={{ color: '#1B4D7A', fontSize: 14 }}>{issue.type}</strong>
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {issue.property} — {issue.tenant}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{issue.detail}</div>
                  {issue.dateNote && (
                    <div style={{ fontSize: 12, color: '#8e44ad', marginTop: 4 }}>{issue.dateNote}</div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
