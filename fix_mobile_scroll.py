# -*- coding: utf-8 -*-
"""
يصلح مشكلة التمرير العرضي اللانهائي على الآيباد/الجوال.
السبب: نسخة الطباعة المخفية بكل صفحة كانت تُخفى بتحريكها لمسافة سالبة كبيرة
(left: -9999px)، وهذا يجعل متصفح Safari بالجوال/الآيباد يوسّع "منطقة العرض"
(viewport) الفعلية للصفحة، فيسمح بتمرير/تكبير حر بلا نهاية رغم وجود
overflow-x: hidden بالصفحة.

الحل: إخفاء العنصر بطريقة لا تدفعه فعلياً خارج حدود الصفحة (height: 0 +
overflow: hidden + visibility: hidden) بدل تحريكه بعيداً. يبقى العنصر
بنفس مكانه لكن بمساحة مرئية صفرية، فما يوسّع منطقة العرض على أي متصفح.
تعديل بملف واحد (ExportToolbar.jsx) يُطبَّق تلقائياً على كل الصفحات لأنها
كلها تستخدم نفس المكوّن.

شغّله من جذر المشروع:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_mobile_scroll.py
"""

def replace_once(content, old, new, label):
    count = content.count(old)
    if count != 1:
        print(f"[تحذير] لم أجد تطابقاً وحيداً لـ: {label} (عدد التطابقات: {count})")
        print("      -> تخطّيت هذا التعديل.")
        return content, False
    return content.replace(old, new, 1), True


path = "src/components/ExportToolbar.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

applied = 0
total = 0

# 1) تحصين نمط إخفاء نسخة الطباعة الأساسي
total += 1
old1 = '''  printRoot: {
    position: "absolute",
    top: 0,
    left: "-9999px",
    width: "1700px",
    background: "#ffffff",
    padding: "30px 50px",
    fontFamily: "Cairo, Tahoma, sans-serif",
    direction: "rtl",
    color: "#111827",
    boxSizing: "border-box",
    overflow: "hidden",
  },'''
new1 = '''  printRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "1700px",
    height: 0,
    overflow: "hidden",
    visibility: "hidden",
    pointerEvents: "none",
    background: "#ffffff",
    padding: "30px 50px",
    fontFamily: "Cairo, Tahoma, sans-serif",
    direction: "rtl",
    color: "#111827",
    boxSizing: "border-box",
  },'''
content, ok = replace_once(content, old1, new1, "نمط printRoot (الإخفاء الأساسي)")
if ok:
    applied += 1

# 2) توسيع قواعد الطباعة عشان تلغي الإخفاء الجديد وقت الطباعة الفعلية
total += 1
old2 = '''        #export-print-area {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
        }
        @page { size: landscape; margin: 12mm; }'''
new2 = '''        #export-print-area {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          visibility: visible !important;
        }
        @page { size: landscape; margin: 12mm; }'''
content, ok = replace_once(content, old2, new2, "قواعد @media print")
if ok:
    applied += 1

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n==> {path}: تم تطبيق {applied} من أصل {total} تعديل.")
print("انتهى. أي سطر [تحذير] يعني الملف يختلف شوي عن النسخة المتوقعة.")
