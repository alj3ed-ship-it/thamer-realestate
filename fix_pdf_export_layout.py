# -*- coding: utf-8 -*-
"""
يصلح مشكلتين بتصدير PDF من ExportToolbar.jsx:
1) عرض التقرير كان ثابت 1700px بغض النظر عن عدد الأعمدة، فيطلع شكل "جريدة" عريضة
   لما تكون الأعمدة قليلة (زي جدول قاعة مذهلة 7 أعمدة). الحل: عرض ديناميكي حسب
   عدد الأعمدة الفعلي.
2) خوارزمية تقطيع الصفحات كانت تنشئ صفحة زيادة شبه فاضية لما تتبقى مساحة بيضاء
   صغيرة بنهاية آخر شريحة. الحل: تجاهل البقايا الصغيرة بدل إنشاء صفحة لها.
"""

path = "src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1) إضافة حساب العرض الديناميكي بعد تعريف displayCols
old1 = """  const displayCols = groupCol ? columns.filter((c) => c.key !== groupCol.key) : columns;"""
new1 = """  const displayCols = groupCol ? columns.filter((c) => c.key !== groupCol.key) : columns;

  // عرض التقرير يتناسب مع عدد الأعمدة الفعلي بدل عرض ثابت (كان يسبب شكل
  // "جريدة" عريضة عند التقارير قليلة الأعمدة مثل جدول الحجوزات)
  const colCountForWidth = groupCol ? displayCols.length : columns.length;
  const dynamicPrintWidth = Math.max(750, Math.min(1700, colCountForWidth * 170 + 150));"""
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على تعريف displayCols — تحقق يدوياً")

# 2) تطبيق العرض الديناميكي على منطقة الطباعة/PDF (بدل العرض الثابت بالـ styles)
old2 = """      <div
        id="export-print-area"
        ref={printRef}
        style={isCapturing ? styles.printRootVisible : styles.printRoot}
      >"""
new2 = """      <div
        id="export-print-area"
        ref={printRef}
        style={{
          ...(isCapturing ? styles.printRootVisible : styles.printRoot),
          width: `${dynamicPrintWidth}px`,
        }}
      >"""
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على div منطقة الطباعة — تحقق يدوياً")

# 3) إصلاح تقطيع صفحات PDF لتجاهل البقايا الصغيرة (تمنع صفحة فارغة بالنهاية)
old3 = """      let renderedPx = 0;
      let pageIndex = 0;
      while (renderedPx < canvas.height) {
        const sliceHeight = Math.min(sliceHeightPx, canvas.height - renderedPx);"""
new3 = """      let renderedPx = 0;
      let pageIndex = 0;
      const MIN_TRAILING_PX = 25; // تجاهل بقايا بيضاء صغيرة تسبب صفحة شبه فارغة بالنهاية
      while (renderedPx < canvas.height) {
        const remainingPx = canvas.height - renderedPx;
        if (pageIndex > 0 && remainingPx < MIN_TRAILING_PX) break;
        const sliceHeight = Math.min(sliceHeightPx, remainingPx);"""
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على منطق تقطيع صفحات PDF — تحقق يدوياً")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ تم تطبيق {changes} من أصل 3 تعديلات على {path}")
