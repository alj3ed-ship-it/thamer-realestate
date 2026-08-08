path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  const now = new Date()
  const currentQ = { year: now.getFullYear(), q: Math.ceil((now.getMonth() + 1) / 3) }"""

new = """  // تعديلات يدوية على الضريبة (مثل ضريبة مسبقة السداد قبل بداية تسجيل النظام) —
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
  const currentQ = { year: now.getFullYear(), q: Math.ceil((now.getMonth() + 1) / 3) }"""

if old not in content:
    print("⚠ فشل: المقطع المطلوب ما انطابق بالملف. أرسل محتوى src/VatReturns.jsx الحالي كامل.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق التعديل بنجاح على src/VatReturns.jsx")
