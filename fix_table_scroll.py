# -*- coding: utf-8 -*-
"""
يضيف تمرير عرضي (scroll) خاص بكل جدول لحاله على الجوال/الآيباد، بدل ما
يُقطع أو يُضغط. يعتمد على إن كل جدول بالمشروع أصلاً ملفوف بـ
<div id="....-table"> (نمط ثابت موجود بكل الصفحات) — فالإصلاح قاعدة CSS
واحدة تستهدف كل هذي الحاويات تلقائياً، بدون أي تعديل على ملفات JSX.

شغّله من جذر المشروع:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_table_scroll.py
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

addition = '''

/* تمرير عرضي مستقل لكل جدول على الجوال/الآيباد — يعتمد على إن كل جدول
   بالمشروع ملفوف بـ <div id="....-table">. الجدول ياخذ عرضه الطبيعي
   الكامل (مو مضغوط)، والحاوية تتمرّر بدل ما تنكسر الصفحة كلها. */
@media (max-width: 900px) {
  div[id$="-table"] {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
  div[id$="-table"] table {
    width: max-content !important;
    min-width: 100% !important;
  }
}
'''

if "div[id$=\"-table\"]" in content:
    print("[تنبيه] يبدو إن هذا التعديل مطبّق مسبقاً بالملف — ما أضفت شي عشان ما يتكرر.")
else:
    content = content + addition
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"==> {path}: تمت الإضافة بنجاح.")

print("انتهى.")
