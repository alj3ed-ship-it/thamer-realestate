# -*- coding: utf-8 -*-
"""
يصلح تقطيع صفوف الجدول نصفين بين صفحات PDF (مشكلة مختلفة عن إصلاح الطباعة المباشرة السابق).
تصدير PDF يصوّر التقرير كصورة واحدة ثم يقصّها بارتفاع ثابت بالبكسل بدون معرفة حدود الصفوف.
هذا التعديل يحسب حدود كل صف جدول فعلياً، ويرجع نقطة القص لبداية أي صف يوشك ينقطع،
عشان الصف كامل ينتقل للصفحة التالية بدل ما ينقطع نصفين.
"""

path = "src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """      const MARGIN_MM = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - MARGIN_MM * 2;
      const usableHeight = pageHeight - MARGIN_MM * 2;

      // نقص شريحة بكسلات مضبوطة من الكانفس الأصلي لكل صفحة، بدل ما نرسم
      // الصورة كاملة بإزاحة سالبة ونعتمد على قص جسPDF التلقائي عند حافة
      // الصفحة — هذا الأسلوب القديم كان يكرر جزء (بمقدار الهامش السفلي)
      // من نهاية كل صفحة ببداية الصفحة اللي بعدها، لأن حساب الخطوة
      // (usableHeight) كان يطرح الهامشين، بينما القص الفعلي بجسPDF ما كان
      // يحترم إلا الهامش العلوي.
      const pxPerMM = canvas.width / usableWidth;
      const sliceHeightPx = Math.floor(usableHeight * pxPerMM);

      let renderedPx = 0;
      let pageIndex = 0;
      const MIN_TRAILING_PX = 25; // تجاهل بقايا بيضاء صغيرة تسبب صفحة شبه فارغة بالنهاية
      while (renderedPx < canvas.height) {
        const remainingPx = canvas.height - renderedPx;
        if (pageIndex > 0 && remainingPx < MIN_TRAILING_PX) break;
        const sliceHeight = Math.min(sliceHeightPx, remainingPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const sliceData = sliceCanvas.toDataURL("image/png");

        if (pageIndex > 0) pdf.addPage();
        const sliceHeightMM = sliceHeight / pxPerMM;
        pdf.addImage(sliceData, "PNG", MARGIN_MM, MARGIN_MM, usableWidth, sliceHeightMM);

        renderedPx += sliceHeight;
        pageIndex += 1;
      }"""

new = """      const MARGIN_MM = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - MARGIN_MM * 2;
      const usableHeight = pageHeight - MARGIN_MM * 2;

      // نقص شريحة بكسلات مضبوطة من الكانفس الأصلي لكل صفحة، بدل ما نرسم
      // الصورة كاملة بإزاحة سالبة ونعتمد على قص جسPDF التلقائي عند حافة
      // الصفحة — هذا الأسلوب القديم كان يكرر جزء (بمقدار الهامش السفلي)
      // من نهاية كل صفحة ببداية الصفحة اللي بعدها، لأن حساب الخطوة
      // (usableHeight) كان يطرح الهامشين، بينما القص الفعلي بجسPDF ما كان
      // يحترم إلا الهامش العلوي.
      const pxPerMM = canvas.width / usableWidth;
      const sliceHeightPx = Math.floor(usableHeight * pxPerMM);

      // نحسب حدود كل صف جدول (بمقياس بكسلات الكانفس) عشان نتفادى قص أي صف
      // نصفين بين صفحتين — القص القديم كان يعتمد على ارتفاع ثابت بدون معرفة
      // مكان الصفوف، فيقطع أي صف يقع بالضبط عند حافة الصفحة.
      const rootRectForRows = node.getBoundingClientRect();
      const nodeHeightPx = node.offsetHeight || rootRectForRows.height || 1;
      const canvasToNodeRatio = canvas.height / nodeHeightPx;
      const rowBoundaries = Array.from(node.querySelectorAll("tr")).map((row) => {
        const r = row.getBoundingClientRect();
        return {
          top: (r.top - rootRectForRows.top) * canvasToNodeRatio,
          bottom: (r.bottom - rootRectForRows.top) * canvasToNodeRatio,
        };
      });

      function snapCutToRowBoundary(idealCut, pageStart) {
        for (const rb of rowBoundaries) {
          if (idealCut > rb.top + 1 && idealCut < rb.bottom - 1 && rb.top > pageStart) {
            return rb.top;
          }
        }
        return idealCut;
      }

      let renderedPx = 0;
      let pageIndex = 0;
      const MIN_TRAILING_PX = 25; // تجاهل بقايا بيضاء صغيرة تسبب صفحة شبه فارغة بالنهاية
      while (renderedPx < canvas.height) {
        const remainingPx = canvas.height - renderedPx;
        if (pageIndex > 0 && remainingPx < MIN_TRAILING_PX) break;
        let sliceHeight = Math.min(sliceHeightPx, remainingPx);
        const idealCut = renderedPx + sliceHeight;
        if (idealCut < canvas.height) {
          const snapped = snapCutToRowBoundary(idealCut, renderedPx);
          if (snapped - renderedPx > 0) sliceHeight = snapped - renderedPx;
        }

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const sliceData = sliceCanvas.toDataURL("image/png");

        if (pageIndex > 0) pdf.addPage();
        const sliceHeightMM = sliceHeight / pxPerMM;
        pdf.addImage(sliceData, "PNG", MARGIN_MM, MARGIN_MM, usableWidth, sliceHeightMM);

        renderedPx += sliceHeight;
        pageIndex += 1;
      }"""

if old in content:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم إصلاح تقطيع صفوف الجدول بتصدير PDF (لن ينقسم أي صف بين صفحتين بعد الآن)")
else:
    print("⚠ لم يتم العثور على منطق تقطيع صفحات PDF الحالي — تحقق يدوياً")
