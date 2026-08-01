# -*- coding: utf-8 -*-
"""
يضيف السنة والنوع المختارين (إذا كانا محددين) لعنوان تقرير الطباعة/PDF بدل عنوان ثابت
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''      <ExportToolbar
        title="حجوزات قاعة مذهلة"'''
new = '''      <ExportToolbar
        title={`حجوزات قاعة مذهلة${selectedYear !== 'all' ? ' - سنة ' + selectedYear + ' هـ' : ' - كل السنين'}${selectedType !== 'all' ? ' - ' + selectedType : ''}`}'''

if old in content:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تحديث عنوان التقرير ليشمل السنة والنوع المختارين")
else:
    print("⚠ لم يتم العثور على عنوان ExportToolbar الحالي — تحقق يدوياً")
