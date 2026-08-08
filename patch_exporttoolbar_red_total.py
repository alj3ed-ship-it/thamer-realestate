# -*- coding: utf-8 -*-
"""
patch_exporttoolbar_red_total.py

الطلب: تلوين قيمة عمود "المبلغ المستحق" باللون الأحمر في صفوف الإجمالي
الفرعي وصف الإجمالي الكلي (بالطباعة/PDF وبإكسل)، بنفس أسلوب التلوين
الحالي المستخدم لعمودي "الأساسي" و"الضريبة".

الاستخدام:
    python patch_exporttoolbar_red_total.py
"""

import pathlib

FILE_PATH = pathlib.Path(r"src/components/ExportToolbar.jsx")

if not FILE_PATH.exists():
    candidates = list(pathlib.Path(".").rglob("ExportToolbar.jsx"))
    if len(candidates) == 1:
        FILE_PATH = candidates[0]
    elif len(candidates) > 1:
        raise SystemExit(
            "لقيت أكثر من نسخة من ExportToolbar.jsx، حدد المسار يدوياً بمتغير FILE_PATH:\n"
            + "\n".join(str(c) for c in candidates)
        )
    else:
        raise SystemExit("ما لقيت ملف ExportToolbar.jsx. تأكد أنك تشغل السكربت من داخل مجلد المشروع.")

content = FILE_PATH.read_text(encoding="utf-8")

# ---------------------------------------------------------------
# التعديل 1: دالة التلوين المستخدمة بالطباعة/PDF
# ---------------------------------------------------------------
old_1 = """  const amountFontColor = (col) => {
    if (col.label.includes("الأساسي")) return "#1B4D7A";
    if (col.label.includes("الضريبة")) return "#B42318";
    return null;
  };"""

new_1 = """  const amountFontColor = (col) => {
    if (col.label.includes("الأساسي")) return "#1B4D7A";
    if (col.label.includes("الضريبة")) return "#B42318";
    if (col.label.includes("المستحق")) return "#e74c3c";
    return null;
  };"""

assert content.count(old_1) == 1, "لم يتم العثور على دالة amountFontColor بالشكل المتوقع"
content = content.replace(old_1, new_1)

# ---------------------------------------------------------------
# التعديل 2: دالة التلوين المستخدمة بتصدير Excel (ARGB)
# ---------------------------------------------------------------
old_2 = """  const amountFontColorArgb = (col) => {
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label.includes("الضريبة")) return "FFB42318";
    return null;
  };"""

new_2 = """  const amountFontColorArgb = (col) => {
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label.includes("الضريبة")) return "FFB42318";
    if (col.label.includes("المستحق")) return "FFE74C3C";
    return null;
  };"""

assert content.count(old_2) == 1, "لم يتم العثور على دالة amountFontColorArgb بالشكل المتوقع"
content = content.replace(old_2, new_2)

FILE_PATH.write_text(content, encoding="utf-8")

print(f"تم التعديل بنجاح: {FILE_PATH}")
print("- أي عمود يحتوي اسمه على كلمة \"المستحق\" (مثل: المبلغ المستحق) سيظهر بلون أحمر")
print("  بصفوف الإجمالي الفرعي والإجمالي الكلي، بالطباعة/PDF وبإكسل.")
