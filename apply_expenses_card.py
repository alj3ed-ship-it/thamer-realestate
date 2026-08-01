# -*- coding: utf-8 -*-
"""
يستبدل بطاقة "إجمالي قيمة الحجوزات" ببطاقة "المصاريف" (تحسب تلقائياً من نسبة المصاريف)
لأن بطاقة قيمة الحجوزات كانت تتكرر بنفس رقم "المبالغ المستلمة" عند عدم وجود متأخرات
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1) إضافة متغير حساب المصاريف بعد totalNet
old1 = "  const totalNet = Math.round(totalRevenue * (1 - expensePct / 100));"
new1 = (
    "  const totalNet = Math.round(totalRevenue * (1 - expensePct / 100));\n"
    "  const totalExpenses = totalRevenue - totalNet;"
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على سطر totalNet — تحقق يدوياً")

# 2) استبدال بطاقة "إجمالي قيمة الحجوزات" ببطاقة "المصاريف"
old2 = '        <SummaryCard label="إجمالي قيمة الحجوزات" value={`${totalRevenue.toLocaleString()} ر.س`} color="#1B4D7A" />'
new2 = '        <SummaryCard label="المصاريف" value={`${totalExpenses.toLocaleString()} ر.س`} color="#D35400" />'
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على بطاقة إجمالي قيمة الحجوزات — تحقق يدوياً")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ تم تطبيق {changes} من أصل 2 تعديلات على {path}")
