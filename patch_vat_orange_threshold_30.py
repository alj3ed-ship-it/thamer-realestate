path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  function getDeadlineColor(daysLeft) {
    if (daysLeft < 0) return '#e74c3c' // متأخر
    if (daysLeft <= 14) return '#ea580c' // قريب — برتقالي واضح وحقيقي
    return '#27ae60' // بعيد
  }

  function getOpenColor(daysToOpen) {
    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 14) return '#ea580c' // قريب من الفتح — برتقالي واضح وحقيقي
    return '#d4a017' // بعيد بعد — أصفر واضح بدل الرمادي الباهت
  }"""

new = """  function getDeadlineColor(daysLeft) {
    if (daysLeft < 0) return '#e74c3c' // متأخر
    if (daysLeft <= 30) return '#ea580c' // قريب — برتقالي واضح وحقيقي
    return '#27ae60' // بعيد
  }

  function getOpenColor(daysToOpen) {
    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 30) return '#ea580c' // قريب من الفتح — برتقالي واضح وحقيقي
    return '#d4a017' // بعيد بعد — أصفر واضح بدل الرمادي الباهت
  }"""

if old not in content:
    print("⚠ فشل: المقطع المطلوب ما انطابق بالملف. أرسل محتوى src/VatReturns.jsx الحالي كامل.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق التعديل بنجاح على src/VatReturns.jsx")
