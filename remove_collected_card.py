# -*- coding: utf-8 -*-
"""
يحذف بطاقة "إجمالي المبالغ المستلمة" من صف البطاقات الملخصة لأنها مشتتة/مكررة
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '        <SummaryCard label="إجمالي المبالغ المستلمة" value={`${totalCollected.toLocaleString()} ر.س`} color="#27ae60" />\n'

if old in content:
    content = content.replace(old, "", 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم حذف بطاقة إجمالي المبالغ المستلمة بنجاح")
else:
    print("⚠ لم يتم العثور على بطاقة إجمالي المبالغ المستلمة — تحقق يدوياً")
