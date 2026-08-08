# -*- coding: utf-8 -*-
"""
patch_entitlements_amount_export.py

المشكلة: في ExportToolbar، حقل amount كان يتحول من رقم صافي إلى
object {value, color} قبل التصدير، فيصير جمع subtotal/total لعمود
"المبلغ المستحق" يفشل (NaN أو 0) لأن الدالة تحاول تجمع object + object.

الحل: نضيف حقل جديد amountDisplay للعرض الملوّن (باستخدام نفس القيم)،
ونخلي amount يبقى رقم صافي كما هو قادم من ...r (بدون override).
وبعدين نحدث عمود الجدول key من "amount" إلى "amountDisplay".

الاستخدام:
    python patch_entitlements_amount_export.py
"""

import pathlib

# عدّل هذا المسار إذا كان الملف بمكان مختلف
FILE_PATH = pathlib.Path(r"src/pages/Entitlements.jsx")

# لو الملف مو داخل src/pages بمشروعك (حسب لقطة الشاشة كان داخل src مباشرة)
# جرب البحث التلقائي إذا المسار أعلاه غير موجود
if not FILE_PATH.exists():
    candidates = list(pathlib.Path(".").rglob("Entitlements.jsx"))
    if len(candidates) == 1:
        FILE_PATH = candidates[0]
    elif len(candidates) > 1:
        raise SystemExit(
            "لقيت أكثر من نسخة من Entitlements.jsx، حدد المسار يدوياً بمتغير FILE_PATH:\n"
            + "\n".join(str(c) for c in candidates)
        )
    else:
        raise SystemExit("ما لقيت ملف Entitlements.jsx. تأكد أنك تشغل السكربت من داخل مجلد المشروع.")

content = FILE_PATH.read_text(encoding="utf-8")

# ---------------------------------------------------------------
# التعديل 1: استبدال override حقل amount بحقل جديد amountDisplay
# ---------------------------------------------------------------
old_1 = '        amount: { value: `${r.amount.toLocaleString()} ريال`, color: amountColor },'
new_1 = (
    '        amountDisplay: { value: `${r.amount.toLocaleString()} ريال`, color: amountColor },'
)

assert content.count(old_1) == 1, f"لم يتم العثور على السطر المتوقع (أو تكرر أكثر من مرة): {old_1!r}"
content = content.replace(old_1, new_1)

# ---------------------------------------------------------------
# التعديل 2: تحديث عمود الجدول ليستخدم amountDisplay بدل amount
# ---------------------------------------------------------------
old_2 = '              { key: "amount", label: "المبلغ المستحق" },'
new_2 = '              { key: "amountDisplay", label: "المبلغ المستحق" },'

assert content.count(old_2) == 1, f"لم يتم العثور على السطر المتوقع (أو تكرر أكثر من مرة): {old_2!r}"
content = content.replace(old_2, new_2)

FILE_PATH.write_text(content, encoding="utf-8")

print(f"تم التعديل بنجاح: {FILE_PATH}")
print("- amount الآن رقم صافي (يُستخدم في التجميع/subtotal/total)")
print("- amountDisplay هو الحقل الملوّن الجديد المستخدم في عمود التصدير")
