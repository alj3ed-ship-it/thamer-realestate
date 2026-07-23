# -*- coding: utf-8 -*-
"""
يصلح مشكلة معروفة بمتصفح Safari مع حاويات التمرير العرضي داخل صفحات RTL:
المتصفح يوقف التمرير قبل ما يوصل آخر عمود فعلياً (يبقى مخفي وراء الحافة).

الحل القياسي: نخلي حاوية التمرير نفسها "LTR" داخلياً (بس لغرض حساب التمرير)،
والمحتوى (الجدول) يرجّع RTL طبيعي بالكامل. هذا يصلح حساب أقصى مسافة تمرير
بدون أي تغيير على شكل أو ترتيب الجدول.

شغّله من جذر المشروع:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_rtl_scroll.py
"""

def replace_once(content, old, new, label):
    count = content.count(old)
    if count != 1:
        print(f"[تحذير] لم أجد تطابقاً وحيداً لـ: {label} (عدد التطابقات: {count})")
        print("      -> تخطّيت هذا التعديل.")
        return content, False
    return content.replace(old, new, 1), True


path = "src/index.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''@media (max-width: 900px) {
  div[id$="-table"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  div[id$="-table"] table {
    width: max-content !important;
    min-width: 100% !important;
  }
}'''

new = '''@media (max-width: 900px) {
  div[id$="-table"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    direction: ltr; /* يصلح خلل Safari بحساب أقصى مسافة تمرير داخل RTL */
  }
  div[id$="-table"] table {
    direction: rtl; /* يرجّع اتجاه المحتوى الطبيعي بعد إصلاح التمرير */
    width: max-content !important;
    min-width: 100% !important;
  }
}'''

content, ok = replace_once(content, old, new, "تصحيح اتجاه التمرير RTL")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

if ok:
    print(f"==> {path}: تم التعديل بنجاح.")
print("انتهى.")
