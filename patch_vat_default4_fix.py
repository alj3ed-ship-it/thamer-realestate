path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  // آخر 4 أرباع تاريخية (بدون الأرباع القادمة المستقبلية) كعرض افتراضي
  const historicalQuarters = quarters.filter(q => getStatus(q) !== 'upcoming')
  const defaultQuarters = historicalQuarters.slice(-4)
  const displayedQuarters = showAllQuarters ? quarters : defaultQuarters
  const hasMoreQuarters = !showAllQuarters && quarters.length > defaultQuarters.length"""

new = """  // آخر 4 أرباع كعرض افتراضي: تاريخية أولاً، وإذا كانت أقل من 4 نكمّل بأقرب أرباع قادمة
  const historicalQuarters = quarters.filter(q => getStatus(q) !== 'upcoming')
  const defaultQuarters = (() => {
    if (historicalQuarters.length >= 4) return historicalQuarters.slice(-4)
    const historicalKeys = new Set(historicalQuarters.map(q => q.key))
    const upcomingQuarters = quarters.filter(q => !historicalKeys.has(q.key))
    const needed = 4 - historicalQuarters.length
    return [...historicalQuarters, ...upcomingQuarters.slice(0, needed)]
  })()
  const displayedQuarters = showAllQuarters ? quarters : defaultQuarters
  const hasMoreQuarters = !showAllQuarters && quarters.length > defaultQuarters.length"""

if old not in content:
    print("⚠ فشل: المقطع المطلوب ما انطابق بالملف. تأكد إنك شغّلت patch_vat_default4_colors.py قبل هذا الباتش.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق التعديل بنجاح على src/VatReturns.jsx")
