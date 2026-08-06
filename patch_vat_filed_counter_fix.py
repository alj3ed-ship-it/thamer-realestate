path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """                          <div style={{ fontSize: 10, fontWeight: 600, color: getDeadlineColor(daysLeft) }}>
                            {daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`}
                          </div>"""

new = """                          <div style={{ fontSize: 10, fontWeight: 600, color: st === 'filed' ? '#27ae60' : getDeadlineColor(daysLeft) }}>
                            {st === 'filed' ? 'تم التقديم ✓' : (daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`)}
                          </div>"""

if old not in content:
    print("⚠ فشل: المقطع المطلوب ما انطابق بالملف. أرسل محتوى src/VatReturns.jsx الحالي كامل.")
else:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق التعديل بنجاح على src/VatReturns.jsx")
