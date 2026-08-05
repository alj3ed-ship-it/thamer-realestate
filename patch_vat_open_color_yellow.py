path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  function getOpenColor(daysToOpen) {
    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 14) return '#f39c12' // قريب من الفتح
    return '#9ca3af' // بعيد بعد
  }"""

new = """  function getOpenColor(daysToOpen) {
    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 14) return '#f39c12' // قريب من الفتح
    return '#d4a017' // بعيد بعد — أصفر واضح بدل الرمادي الباهت
  }"""

if old not in content:
    print("⚠ فشل: المقطع المطلوب ما انطابق بالملف. تأكد إنك شغّلت الباتشات السابقة أولاً.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق التعديل بنجاح على src/VatReturns.jsx")
