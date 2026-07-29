import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import ExportToolbar from './components/ExportToolbar'

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
  const [payments, setPayments] = useState([])
  const [leases, setLeases] = useState([])
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [filings, setFilings] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})
  const [exportScope, setExportScope] = useState('all')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [pay, lea, pro, ten, fil] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, tax_enabled, tax_effective_hijri, amount_includes_vat'),
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

  function isTaxApplicable(p) {
    const lease = getLease(p.lease_id)
    if (!lease || !lease.tax_enabled) return false
    if (!p.payment_date_hijri && !p.payment_date) return false
    if (!lease.tax_effective_hijri) return true
    const hijriText = p.payment_date_hijri
    if (!hijriText) return true
    return hijriSortKey(hijriText) >= hijriSortKey(lease.tax_effective_hijri)
  }

  function getTaxAmount(p) {
    if (!isTaxApplicable(p)) return 0
    const lease = getLease(p.lease_id)
    const amt = Number(p.amount || 0)
    if (lease?.amount_includes_vat) {
      return Math.round(amt - (amt / 1.15))
    }
    return Math.round(amt * TAX_RATE)
  }

  function getBaseAmount(p) {
    const lease = getLease(p.lease_id)
    const amt = Number(p.amount || 0)
    if (isTaxApplicable(p) && lease?.amount_includes_vat) {
      return Math.round(amt / 1.15)
    }
    return amt
  }

  const taxablePayments = payments.filter(p => isTaxApplicable(p) && p.payment_date)

  // تجميع حسب الربع الميلادي + تفصيل كل عقد/مستأجر/عقار داخل كل ربع
  const quartersMap = {}
  taxablePayments.forEach(p => {
    const q = getQuarterFromDate(p.payment_date)
    if (!q) return
    if (!quartersMap[q.key]) {
      quartersMap[q.key] = {
        key: q.key, year: q.year, q: q.q,
        baseTotal: 0, taxTotal: 0, count: 0, properties: new Set(), breakdown: {},
      }
    }
    const entry = quartersMap[q.key]
    const base = getBaseAmount(p)
    const tax = getTaxAmount(p)
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

  const statusInfo = {
    filed: { label: 'مقدَّم ✓', bg: '#EAFAF1', color: '#27ae60' },
    upcoming: { label: 'قادم', bg: '#F4F6F7', color: '#7f8c8d' },
    due: { label: 'مستحق الآن ⏰', bg: '#FEF9E7', color: '#f39c12' },
    overdue: { label: 'متأخر ⚠', bg: '#FDEDEC', color: '#e74c3c' },
  }

  const grandTotalTax = quarters.reduce((s, q) => s + q.taxTotal, 0)
  const unfiledTax = quarters.filter(q => getStatus(q) !== 'filed').reduce((s, q) => s + q.taxTotal, 0)

  function buildExportRows(scope) {
    const list = scope === 'all' ? quarters : quarters.filter(q => q.key === scope)
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

  const exportData = buildExportRows(exportScope)
  const exportStatsScoped = exportScope === 'all'
    ? [
        { label: 'إجمالي الضريبة', value: `${grandTotalTax.toLocaleString()} ريال`, color: '#8e44ad' },
        { label: 'غير مقدَّم', value: `${unfiledTax.toLocaleString()} ريال`, color: '#e74c3c' },
      ]
    : (() => {
        const q = quarters.find(x => x.key === exportScope)
        return q ? [
          { label: 'الإيراد الأساسي', value: `${q.baseTotal.toLocaleString()} ريال`, color: '#1d4ed8' },
          { label: 'الضريبة المستحقة', value: `${q.taxTotal.toLocaleString()} ريال`, color: '#8e44ad' },
        ] : []
      })()

  return (
    <div dir="rtl" style={{ fontFamily: 'Cairo, sans-serif', padding: '30px 34px', maxWidth: '1150px', margin: '0 auto' }}>
      <button onClick={onBack} className="no-print" style={{ padding: '7px 16px', marginBottom: '14px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13 }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px', color: '#1B4D7A', fontSize: 23 }}>الإقرارات الضريبية</h1>
      <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: 13 }}>ضريبة القيمة المضافة — تجميع ربعي ومتابعة التقديم</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ background: '#F4ECF7', borderRadius: 10, padding: '10px 18px', minWidth: 180 }}>
          <div style={{ fontSize: 12, color: '#8e44ad', marginBottom: 3 }}>إجمالي الضريبة (كل الأرباع)</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#8e44ad' }}>{grandTotalTax.toLocaleString()} ريال</div>
        </div>
        <div style={{ background: '#FDEDEC', borderRadius: 10, padding: '10px 18px', minWidth: 180 }}>
          <div style={{ fontSize: 12, color: '#e74c3c', marginBottom: 3 }}>غير مقدَّم بعد</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#e74c3c' }}>{unfiledTax.toLocaleString()} ريال</div>
        </div>
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && (
        <div id="vat-returns-table">
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: '#374151' }}>تصدير:</label>
            <select value={exportScope} onChange={e => setExportScope(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>
              <option value="all">كل الإقرارات</option>
              {quarters.map(q => (
                <option key={q.key} value={q.key}>{q.key} ({getQuarterRangeLabel(q.year, q.q)})</option>
              ))}
            </select>
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
            filename={exportScope === 'all' ? 'vat_returns_report' : `vat_return_${exportScope}`}
            title={exportScope === 'all' ? 'تقرير الإقرارات الضريبية' : `إقرار ${exportScope}`}
            stats={exportStatsScoped}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quarters.map(q => {
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
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1B4D7A' }}>
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
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#8e44ad' }}>{q.taxTotal.toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{formatDateShort(openDate)}</div>
                          <div style={{ fontSize: 10, color: daysToOpen < 0 ? '#9ca3af' : '#6b7280' }}>
                            {daysToOpen >= 0 ? `بعد ${daysToOpen} يوم` : `منذ ${Math.abs(daysToOpen)} يوم`}
                          </div>
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>←</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: daysLeft < 0 ? '#e74c3c' : daysLeft <= 14 ? '#f39c12' : '#6b7280' }}>
                            {daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`}
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
                          <span>أساسي {b.base.toLocaleString()} + ضريبة {b.tax.toLocaleString()} ريال</span>
                        </div>
                      ))}
                    </div>
                  )}

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
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}