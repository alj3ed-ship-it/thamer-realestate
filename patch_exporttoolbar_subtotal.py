# -*- coding: utf-8 -*-
"""
patch_exporttoolbar_subtotal.py

المشكلة الجذرية: في جدول الطباعة/PDF (داخل ExportToolbar.jsx)، حساب
subtotal/grand total للأعمدة الرقمية كان يمرر الخلية الخام (cell) لدالة
parseRiyalNumber بدل القيمة المفكوكة (cellValue). إذا كانت الخلية كائن
غني {value, color} (كما في عمود المبلغ بصفحة الاستحقاقات)، فإن
parseRiyalNumber ترجع null دائماً (لأنها تتحقق typeof === "string" أول
شي)، فيبقى المجموع الفرعي صفراً دائماً — حتى لو الأرقام صحيحة بالجدول
نفسه.

ملاحظة: تصدير Excel لا يعاني من هذه المشكلة لأنه يستخدم unwrapCell()
قبل تمرير القيمة، لكن جدول الطباعة/PDF كان ينقصه نفس الخطوة.

الاستخدام:
    python patch_exporttoolbar_subtotal.py
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

old = """                          if (numericKeys.has(col.key)) {
                            const num = parseRiyalNumber(cell);
                            if (num !== null) subtotal[col.key] += num;
                          }"""

new = """                          if (numericKeys.has(col.key)) {
                            const num = parseRiyalNumber(cellValue);
                            if (num !== null) subtotal[col.key] += num;
                          }"""

assert content.count(old) == 1, "لم يتم العثور على السطر المتوقع (أو تكرر أكثر من مرة) داخل ExportToolbar.jsx"
content = content.replace(old, new)

FILE_PATH.write_text(content, encoding="utf-8")

print(f"تم التعديل بنجاح: {FILE_PATH}")
print("- subtotal بجدول الطباعة/PDF الآن يستخدم القيمة المفكوكة (cellValue) بدل الخلية الخام (cell)")
print("- هذا يصلح كل الصفحات اللي تستخدم ExportToolbar وترسل خلايا غنية (value+color) بعمود رقمي، مو بس صفحة الاستحقاقات")
