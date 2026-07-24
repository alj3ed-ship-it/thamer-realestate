# -*- coding: utf-8 -*-
import re

path = r"src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''  // العنصر المخفي (مُستخدم فقط وقت الطباعة/التصدير) — إعدادات أصلية شغّالة
  printRoot: {
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

new_block = '''  // العنصر المخفي (مُستخدم فقط وقت الطباعة/التصدير)
  // إصلاح (يوليو 2026): استبدلنا left:-9999px بـ height:0 + overflow:hidden +
  // visibility:hidden. الإحداثيات السالبة (left:-9999px) تخدع بعض المتصفحات
  // (خصوصاً على الشاشات الضيقة) فتوسّع مساحة الصفحة (html/body) الفعلية لتشمل
  // هذا العنصر البعيد، وتسبب فراغ أبيض ضخم وتمرير غير طبيعي. هذي الطريقة تبقي
  // العنصر بمكانه بالتدفق الطبيعي (top/left:0) لكن بدون أي ارتفاع أو ظهور.
  printRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 0,
    width: "1700px",
    overflow: "hidden",
    visibility: "hidden",
    background: "#ffffff",
    padding: "30px 50px",
    fontFamily: "Cairo, Tahoma, sans-serif",
    direction: "rtl",
    color: "#111827",
    boxSizing: "border-box",
  },'''

if old_block not in content:
    print("❌ لم يتم العثور على الكتلة المطلوبة — تحقق من الملف يدوياً")
else:
    content = content.replace(old_block, new_block)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم إصلاح ExportToolbar.jsx بنجاح")
