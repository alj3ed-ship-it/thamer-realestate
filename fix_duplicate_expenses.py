# -*- coding: utf-8 -*-
"""
يصلح مشكلة تكرار سطر totalExpenses (بسبب تشغيل سكربت التعديل مرتين)
يبقي على نسخة واحدة فقط من السطر
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

target_line = "  const totalExpenses = totalRevenue - totalNet;\n"
count = content.count(target_line)

if count <= 1:
    print(f"ℹ لم يتم العثور على تكرار (عدد النسخ الحالي: {count}) — لا حاجة للإصلاح")
else:
    # نحذف كل النسخ أولاً، ثم نضيف نسخة وحدة فقط بعد سطر totalNet
    content = content.replace(target_line, "")
    anchor = "  const totalNet = Math.round(totalRevenue * (1 - expensePct / 100));\n"
    content = content.replace(anchor, anchor + target_line, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ تم حذف {count - 1} نسخة مكررة، وبقيت نسخة واحدة صحيحة من totalExpenses")
