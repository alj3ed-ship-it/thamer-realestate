import re

path = "src/VatReturns.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة دوال حساب تاريخ الاستحقاق الهجري بعد hijriSortKey
old_helpers = """function hijriSortKey(hijriText) {
  if (!hijriText) return -1
  const parts = hijriText.split('/')
  if (parts.length !== 3) return -1
  const y = parseInt(parts[0]) || 0
  const m = parseInt(parts[1]) || 0
  const d = parseInt(parts[2]) || 0
  return y * 10000 + m * 100 + d
}"""
assert content.count(old_helpers) == 1
new_helpers = old_helpers + """

const FREQUENCY_MAP = { 'سنوي': 1, 'نصف سنوي': 2, 'ربع سنوي': 4, 'كل 4 أشهر': 3, 'شهري': 12 }

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

// تحويل هجري إلى ميلادي (نفس خوارزمية بقية الصفحات)
function hijriToGregorianDate(hy, hm, hd) {
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
    return new Date(year, month - 1, day)
  } catch { return null }
}"""
content = content.replace(old_helpers, new_helpers)

# 2) توسيع استعلام leases ليشمل بيانات بداية العقد ونوع الدفع
old_query = "supabase.from('leases').select('id, tenant_id, property_id, rent_amount, tax_enabled, tax_effective_hijri, amount_includes_vat'),"
assert content.count(old_query) == 1
new_query = "supabase.from('leases').select('id, tenant_id, property_id, rent_amount, tax_enabled, tax_effective_hijri, amount_includes_vat, start_date_hijri, payment_type, payment_frequency'),"
content = content.replace(old_query, new_query)

# 3) استبدال منطق isTaxApplicable / getTaxAmount / getBaseAmount وتجميع الأرباع بالكامل
old_block = """  function isTaxApplicable(p) {
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
  })"""
assert content.count(old_block) == 1
new_block = """  // تاريخ الاستحقاق المحسوب لأي دفعة (نفس منطق صفحة الدفعات) — الأساس الصحيح لتجميع الأرباع
  function getPaymentDueInfo(p) {
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
  })"""
content = content.replace(old_block, new_block)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تصحيح VatReturns.jsx بنجاح ✅")
