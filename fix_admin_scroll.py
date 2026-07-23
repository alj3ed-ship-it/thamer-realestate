# -*- coding: utf-8 -*-
"""
يوسّع إصلاح التمرير العرضي/RTL ليشمل صفحات لوحة التحكم (الأدمن) أيضاً.

السبب اللي ما خلى الإصلاح يشتغل بلوحة التحكم: صفحات الأدمن (المستأجرون،
العقود، الدفعات، الوحدات، العقارات...) فيها حاوية تمرير داخلية إضافية
(overflow-x: auto مكتوبة بالكود الأصلي لأغراض سطح المكتب) غير الحاوية
الخارجية (div[id$="-table"]) اللي استهدفناها بالإصلاح السابق. هذي الحاوية
الداخلية هي اللي فعلياً تتحكم بالتمرير بمتصفح الجوال، فإصلاح اتجاه RTL
ما وصلها.

هذا التعديل يوسّع نفس القاعدة لتشمل أي حاوية تمرير (داخلية أو خارجية)
تحت أي div[id$="-table"]، بدون المساس بأي ملف JSX.

شغّله من جذر المشروع:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_admin_scroll.py
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
    direction: ltr; /* يصلح خلل Safari بحساب أقصى مسافة تمرير داخل RTL */
  }
  div[id$="-table"] table {
    direction: rtl; /* يرجّع اتجاه المحتوى الطبيعي بعد إصلاح التمرير */
    width: max-content !important;
    min-width: 100% !important;
  }
}'''

new = '''@media (max-width: 900px) {
  /* يشمل الحاوية الخارجية (div[id$="-table"]) وأي حاوية تمرير داخلية
     موجودة أصلاً بصفحات لوحة التحكم (overflow-x: auto مكتوبة inline) */
  div[id$="-table"],
  div[id$="-table"] [style*="overflow"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    direction: ltr !important; /* يصلح خلل Safari بحساب أقصى مسافة تمرير داخل RTL */
  }
  div[id$="-table"] table {
    direction: rtl !important; /* يرجّع اتجاه المحتوى الطبيعي بعد إصلاح التمرير */
    width: max-content !important;
    min-width: 100% !important;
  }
}'''

content, ok = replace_once(content, old, new, "توسيع إصلاح التمرير ليشمل صفحات لوحة التحكم")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

if ok:
    print(f"==> {path}: تم التعديل بنجاح.")
else:
    print("راجع محتوى الملف يدوياً — الجزء المطلوب تعديله لم يُطابق بالضبط (ربما يحتاج فحص يدوي بسيط).")
print("انتهى.")
