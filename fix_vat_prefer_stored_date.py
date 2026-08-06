path = "src/VatReturns.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة دالة تحويل ميلادي -> هجري (تُستخدم فقط لو احتجنا نص هجري من تاريخ دفع فعلي مخزّن)
old_anchor = """// تحويل هجري إلى ميلادي (نفس خوارزمية بقية الصفحات)
function hijriToGregorianDate(hy, hm, hd) {"""
assert content.count(old_anchor) == 1
new_anchor = """// تحويل ميلادي إلى هجري (عكس التحويل أدناه) — يُستخدم لو عندنا تاريخ دفع فعلي مخزّن ونحتاج نصه الهجري لمقارنة تاريخ سريان الضريبة
function gregorianToHijriText(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
  let jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
    day - 32075
  const l = jd - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const ll = l - 10631 * n + 354
  const j = Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) + Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238)
  const ll2 = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const hm = Math.floor((24 * ll2) / 709)
  const hd = ll2 - Math.floor((709 * hm) / 24)
  const hy = 30 * n + j - 30
  return `${hy}/${String(hm).padStart(2, '0')}/${String(hd).padStart(2, '0')}`
}

// تحويل هجري إلى ميلادي (نفس خوارزمية بقية الصفحات)
function hijriToGregorianDate(hy, hm, hd) {"""
content = content.replace(old_anchor, new_anchor)

# 2) تعديل getPaymentDueInfo ليفضّل payment_date المخزّن فعليًا لو موجود
old_func = """  function getPaymentDueInfo(p) {
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
  }"""
assert content.count(old_func) == 1
new_func = """  function getPaymentDueInfo(p) {
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
  }"""
content = content.replace(old_func, new_func)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تصحيح VatReturns.jsx ليفضّل التاريخ المخزّن الفعلي ✅")
