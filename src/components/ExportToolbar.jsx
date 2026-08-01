import React, { useRef, useState } from "react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * مكوّن تصدير موحّد: طباعة / PDF / Excel
 *
 * props:
 * - data: array of objects (البيانات الخام للتصدير)
 * - columns: [{ key: "tenant", label: "المستأجر" }, ...]
 * - filename: اسم الملف بدون امتداد
 * - title: عنوان التقرير (يظهر أعلى PDF/الطباعة)
 * - stats: (اختياري) [{ label: "الإجمالي", value: "95,700 ريال", color: "#1B4D7A" }, ...]
 * - officeName / officeSubtitle / logoSrc: (اختياري) ترويسة PDF/الطباعة
 *
 * ملاحظة إصلاح تصدير Excel (يوليو 2026):
 * استبدلنا مكتبة xlsx (SheetJS) بـ exceljs، لأن النسخة المجانية من xlsx ما تدعم
 * التلوين/البولد عند الكتابة (هذا حصري بنسختها المدفوعة). exceljs مجانية بالكامل
 * وتدعم كل شي احتجناه.
 *
 * منطق التصدير الجديد "يكتشف تلقائياً" من شكل البيانات (columns/data) بدون ما
 * يحتاج أي تعديل بالصفحات اللي تستخدم هذا المكوّن:
 * - عمود اسمه "الربع" (label أو key === "quarter") → تُجمَّع الصفوف تحته بعنوان قسم
 *   لكل ربع + صف إجمالي فرعي بصيغة SUM حقيقية + إجمالي كلي بالنهاية.
 * - أي عمود قيمه كلها بصيغة "187,500 ريال" → يتحوّل لرقم حقيقي بصيغة عرض
 *   مخصصة (numFmt) تبقي شكله "187,500 ريال" لكنه رقم فعلي يقبل SUM/فلترة.
 * - عمود اسمه "الحالة" → تلوين أخضر خفيف للصفوف "مقدَّم"، أحمر خفيف لـ"متأخر".
 */
export default function ExportToolbar({
  data,
  columns,
  filename,
  title,
  stats = null,
  officeName = "مكتب ثامر بن سلمان العقاري",
  officeSubtitle = "إدارة الأملاك",
  logoSrc = null,
}) {
  const [loading, setLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const printRef = useRef(null);

  const todayLabel = new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buildPrintNode = () => printRef.current;

  // === منطق مشترك بين Excel والطباعة/PDF (يوليو 2026) ===
  // نفس "الاكتشاف التلقائي" المستخدم بتصدير Excel نطبّقه هنا كمان، عشان تقرير
  // الطباعة/PDF يطلع بنفس التجميع والألوان بدل الجدول المسطّح القديم.
  const groupCol = columns.find((c) => c.label === "الربع" || c.key === "quarter");
  const statusCol = columns.find((c) => c.label === "الحالة" || c.key === "status");
  // عمود التجميع نفسه لا يتكرر بكل صف — يظهر بعنوان القسم بدل ذلك
  const displayCols = groupCol ? columns.filter((c) => c.key !== groupCol.key) : columns;

  // عرض التقرير يتناسب مع عدد الأعمدة الفعلي بدل عرض ثابت (كان يسبب شكل
  // "جريدة" عريضة عند التقارير قليلة الأعمدة مثل جدول الحجوزات)
  const colCountForWidth = groupCol ? displayCols.length : columns.length;
  const dynamicPrintWidth = Math.max(750, Math.min(1700, colCountForWidth * 170 + 150));

  // يحوّل "187,500 ريال" أو "٢٨,١٢٥ ريال" لرقم حقيقي. يرجع null لأي شي غير ذلك
  // (مثل التواريخ) عشان ما نلخبط أعمدة غير مالية.
  const parseRiyalNumber = (val) => {
    if (typeof val !== "string") return null;
    const trimmed = val.trim();
    if (!/ريال\s*$/.test(trimmed)) return null;
    const westernDigits = trimmed
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
      .replace(/[^\d.]/g, "");
    if (westernDigits === "") return null;
    const num = Number(westernDigits);
    return Number.isNaN(num) ? null : num;
  };

  const numericKeys = new Set(
    displayCols
      .filter(
        (col) =>
          data.length > 0 &&
          data.every((row) => {
            const v = row[col.key];
            return v == null || v === "" || parseRiyalNumber(v) !== null;
          }) &&
          data.some((row) => parseRiyalNumber(row[col.key]) !== null)
      )
      .map((c) => c.key)
  );

  const colLetter = (n) => {
    let s = "";
    let num = n;
    while (num > 0) {
      const m = (num - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      num = Math.floor((num - 1) / 26);
    }
    return s;
  };

  // إصلاح ترتيب النص: نعيد بناء "2026-Q1 (يناير - مارس 2026)" بصيغة عربية
  // بالكامل "الربع الأول 2026 (يناير - مارس)" عشان ما يصير تصادم بين حروف
  // لاتينية ("Q1") وقوس عربي يلخبط خوارزمية Bidi ببرامج زي WPS/Excel.
  const quarterNames = { "1": "الأول", "2": "الثاني", "3": "الثالث", "4": "الرابع" };
  const formatQuarterLabel = (label) => {
    if (typeof label !== "string") return label;
    const m = label.match(/^(\d{4})-Q([1-4])\s*\(([^)]+)\)\s*$/);
    if (!m) return label;
    const [, year, q, inner] = m;
    return `الربع ${quarterNames[q] || q} ${year} (${inner})`;
  };

  // تلوين ثابت حسب نوع العمود (تفضيل المستخدم): الإيراد الأساسي أزرق،
  // الضريبة أحمر — يُطبّق بالإكسل وبالطباعة/PDF على حد سواء.
  const amountFontColor = (col) => {
    if (col.label.includes("الأساسي")) return "#1B4D7A";
    if (col.label.includes("الضريبة")) return "#B42318";
    return null;
  };
  const amountFontColorArgb = (col) => {
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label.includes("الضريبة")) return "FFB42318";
    return null;
  };

  const handlePrint = () => {
    const node = buildPrintNode();
    if (!node) return;

    const styleTag = document.createElement("style");
    styleTag.id = "export-print-isolation";
    styleTag.innerHTML = `
      @media print {
        body * { visibility: hidden !important; }
        #export-print-area, #export-print-area * { visibility: visible !important; }
        #export-print-area {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          visibility: visible !important;
          padding: 10mm !important;
          box-sizing: border-box !important;
        }
        #export-print-area table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        #export-print-area tr,
        #export-print-area td,
        #export-print-area th {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        #export-print-area thead {
          display: table-header-group !important;
        }
        @page { size: landscape; margin: 8mm; }
      }
    `;
    document.head.appendChild(styleTag);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("export-print-isolation");
      if (el) el.remove();
    }, 500);
  };

  const handleExcel = async () => {
    setExcelLoading(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("البيانات", {
        views: [{ rightToLeft: true }],
      });

      sheet.columns = displayCols.map((col) => ({
        key: col.key,
        width: col.label.includes("مستأجر") || col.label.includes("عقار") ? 26 : 18,
      }));

      const headerRow = sheet.addRow(displayCols.map((c) => c.label));
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B4D7A" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin", color: { argb: "FF163D61" } },
          bottom: { style: "thin", color: { argb: "FF163D61" } },
          left: { style: "thin", color: { argb: "FF163D61" } },
          right: { style: "thin", color: { argb: "FF163D61" } },
        };
      });

      const numFmtRiyal = '#,##0" ريال"';
      const rtlFix = (s) => (typeof s === "string" ? "\u200F" + s : s);

      const writeDataRow = (rowData) => {
        const rowValues = displayCols.map((col) => {
          const raw = rowData[col.key];
          if (numericKeys.has(col.key)) {
            const num = parseRiyalNumber(raw);
            return num === null ? raw ?? "" : num;
          }
          return raw ?? "";
        });
        const row = sheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Arial" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          const colKey = displayCols[colNumber - 1]?.key;
          if (numericKeys.has(colKey)) cell.numFmt = numFmtRiyal;
        });
        if (statusCol) {
          const statusIdx = displayCols.findIndex((c) => c.key === statusCol.key);
          if (statusIdx !== -1) {
            const cell = row.getCell(statusIdx + 1);
            const val = String(rowData[statusCol.key] || "");
            if (val.includes("مقدَّم") || val.includes("✓")) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F5E9" } };
              cell.font = { color: { argb: "FF1E7A46" }, bold: true, name: "Arial" };
            } else if (val.includes("متأخر")) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE8E8" } };
              cell.font = { color: { argb: "FFB42318" }, bold: true, name: "Arial" };
            }
          }
        }
        return row;
      };

      if (groupCol) {
        const groups = [];
        const groupIndex = new Map();
        data.forEach((row) => {
          const key = row[groupCol.key];
          if (!groupIndex.has(key)) {
            groupIndex.set(key, groups.length);
            groups.push({ key, rows: [] });
          }
          groups[groupIndex.get(key)].rows.push(row);
        });

        const subtotalRowNumbers = [];

        groups.forEach((group) => {
          const titleRow = sheet.addRow([rtlFix(formatQuarterLabel(group.key))]);
          sheet.mergeCells(titleRow.number, 1, titleRow.number, displayCols.length);
          const titleCell = titleRow.getCell(1);
          titleCell.font = { bold: true, name: "Arial" };
          titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E2F3" } };
          titleCell.alignment = { horizontal: "center", vertical: "middle" };

          const firstDataRowNum = titleRow.number + 1;
          group.rows.forEach((r) => writeDataRow(r));
          const lastDataRowNum = firstDataRowNum + group.rows.length - 1;

          // مهم: نكتب قيمة بخلية العنوان بس، وما نحط "" بباقي الخلايا —
          // خلية فيها "" تُعتبر "مشغولة" بنظر إكسل/WPS وتمنع فيض النص الطويل
          // (overflow) لليسار، فيصير النص محشور ومقصوص من جهة اليمين.
          const subtotalRow = sheet.addRow([rtlFix(`إجمالي ${formatQuarterLabel(group.key)}`)]);
          const firstNumericIdx = displayCols.findIndex((c) => numericKeys.has(c.key));
          if (firstNumericIdx > 1) {
            sheet.mergeCells(subtotalRow.number, 1, subtotalRow.number, firstNumericIdx);
          }
          subtotalRow.getCell(1).font = { bold: true, name: "Arial", color: { argb: "FFB42318" } };
          subtotalRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
          displayCols.forEach((col, i) => {
            if (numericKeys.has(col.key)) {
              const letter = colLetter(i + 1);
              const cell = subtotalRow.getCell(i + 1);
              cell.value = { formula: `SUM(${letter}${firstDataRowNum}:${letter}${lastDataRowNum})` };
              cell.numFmt = numFmtRiyal;
              const color = amountFontColorArgb(col);
              cell.font = color
                ? { bold: true, name: "Arial", color: { argb: color } }
                : { bold: true, name: "Arial" };
              cell.alignment = { horizontal: "center", vertical: "middle" };
            }
          });
          subtotalRowNumbers.push(subtotalRow.number);
          sheet.addRow([]);
        });

        const grandRow = sheet.addRow(["الإجمالي الكلي"]);
        const firstNumericIdxGrand = displayCols.findIndex((c) => numericKeys.has(c.key));
        if (firstNumericIdxGrand > 1) {
          sheet.mergeCells(grandRow.number, 1, grandRow.number, firstNumericIdxGrand);
        }
        grandRow.getCell(1).font = { bold: true, size: 13, name: "Arial" };
        grandRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        displayCols.forEach((col, i) => {
          if (numericKeys.has(col.key)) {
            const letter = colLetter(i + 1);
            const formula = subtotalRowNumbers.map((rn) => `${letter}${rn}`).join("+");
            const cell = grandRow.getCell(i + 1);
            cell.value = { formula };
            cell.numFmt = numFmtRiyal;
            const color = amountFontColorArgb(col);
            cell.font = color
              ? { bold: true, size: 13, name: "Arial", color: { argb: color } }
              : { bold: true, size: 13, name: "Arial" };
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
      } else {
        data.forEach((r, idx) => {
          const row = writeDataRow(r);
          if (idx % 2 === 1) {
            row.eachCell((cell) => {
              if (!cell.fill || cell.fill.fgColor?.argb !== "FFE2F5E9") {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };
              }
            });
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("حدث خطأ أثناء إنشاء ملف Excel: " + err.message);
    } finally {
      setExcelLoading(false);
    }
  };

  const handlePDF = async () => {
    const node = buildPrintNode();
    if (!node) {
      alert("تعذر تجهيز التقرير للتصدير");
      return;
    }
    setLoading(true);
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    const prevBodyOverflowX = document.body.style.overflowX;
    try {
      window.scrollTo(0, 0);
      document.documentElement.style.overflowX = "visible";
      document.body.style.overflowX = "visible";
      setIsCapturing(true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        foreignObjectRendering: false,
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("التقاط التقرير رجع فارغ (canvas بلا أبعاد)");
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const MARGIN_MM = 10;
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
      }
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("حدث خطأ أثناء إنشاء PDF: " + err.message);
    } finally {
      document.documentElement.style.overflowX = prevHtmlOverflowX;
      document.body.style.overflowX = prevBodyOverflowX;
      setIsCapturing(false);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="export-toolbar no-print" style={styles.container}>
        {title && <span style={styles.title}>{title}</span>}
        <button onClick={handlePrint} style={styles.btn}>
          🖨️ طباعة
        </button>
        <button onClick={handlePDF} style={styles.btn} disabled={loading}>
          {loading ? "جارٍ التجهيز..." : "📄 PDF"}
        </button>
        <button onClick={handleExcel} style={styles.btn} disabled={excelLoading}>
          {excelLoading ? "جارٍ التجهيز..." : "📊 Excel"}
        </button>
      </div>

      <div
        id="export-print-area"
        ref={printRef}
        style={{
          ...(isCapturing ? styles.printRootVisible : styles.printRoot),
          width: `${dynamicPrintWidth}px`,
        }}
      >
        <div style={styles.letterhead}>
          <div style={styles.letterheadRight}>
            {logoSrc && <img src={logoSrc} alt="logo" style={styles.logo} />}
            <div>
              <div style={styles.officeName}>{officeName}</div>
              <div style={styles.officeSubtitle}>{officeSubtitle}</div>
            </div>
          </div>
          <div style={styles.letterheadLeft}>
            <div style={styles.reportTitle}>{title || "تقرير"}</div>
            <div style={styles.reportDate}>تاريخ الطباعة: {todayLabel}</div>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <div style={styles.statsRow}>
            {stats.map((s, i) => (
              <div
                key={i}
                style={{
                  ...styles.statBox,
                  borderColor: s.color || "#1B4D7A",
                }}
              >
                <div style={styles.statLabel}>{s.label}</div>
                <div style={{ ...styles.statValue, color: s.color || "#1B4D7A" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {groupCol ? (
          <table style={styles.table}>
            <thead>
              <tr>
                {displayCols.map((col) => (
                  <th key={col.key} style={styles.th}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const groups = [];
                const groupIndex = new Map();
                data.forEach((row) => {
                  const key = row[groupCol.key];
                  if (!groupIndex.has(key)) {
                    groupIndex.set(key, groups.length);
                    groups.push({ key, rows: [] });
                  }
                  groups[groupIndex.get(key)].rows.push(row);
                });

                const grandTotals = {};
                displayCols.forEach((col) => {
                  if (numericKeys.has(col.key)) grandTotals[col.key] = 0;
                });

                const elements = [];

                groups.forEach((group, gi) => {
                  elements.push(
                    <tr key={`title-${gi}`}>
                      <td colSpan={displayCols.length} style={styles.groupTitleCell}>
                        {formatQuarterLabel(group.key)}
                      </td>
                    </tr>
                  );

                  const subtotal = {};
                  displayCols.forEach((col) => {
                    if (numericKeys.has(col.key)) subtotal[col.key] = 0;
                  });

                  group.rows.forEach((row, ri) => {
                    elements.push(
                      <tr key={`row-${gi}-${ri}`} style={{ background: ri % 2 === 0 ? "#ffffff" : "#f5f7fa" }}>
                        {displayCols.map((col) => {
                          const cell = row[col.key];
                          const isRich = cell && typeof cell === "object" && "value" in cell;
                          const cellValue = isRich ? cell.value : cell ?? "—";
                          let tdStyle = styles.td;
                          if (numericKeys.has(col.key)) {
                            const num = parseRiyalNumber(cell);
                            if (num !== null) subtotal[col.key] += num;
                          }
                          if (statusCol && col.key === statusCol.key) {
                            const val = String(cellValue || "");
                            if (val.includes("مقدَّم") || val.includes("✓")) {
                              tdStyle = { ...tdStyle, background: "#E2F5E9", color: "#1E7A46", fontWeight: "bold" };
                            } else if (val.includes("متأخر")) {
                              tdStyle = { ...tdStyle, background: "#FCE8E8", color: "#B42318", fontWeight: "bold" };
                            }
                          }
                          return (
                            <td key={col.key} style={tdStyle}>
                              {cellValue}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });

                  Object.keys(subtotal).forEach((k) => {
                    grandTotals[k] += subtotal[k];
                  });

                  elements.push(
                    <tr key={`subtotal-${gi}`}>
                      {displayCols.map((col, i) => {
                        if (i === 0) {
                          return (
                            <td key={col.key} style={styles.subtotalLabelCell}>
                              {`إجمالي ${formatQuarterLabel(group.key)}`}
                            </td>
                          );
                        }
                        if (numericKeys.has(col.key)) {
                          const color = amountFontColor(col);
                          return (
                            <td
                              key={col.key}
                              style={{ ...styles.subtotalValueCell, color: color || styles.subtotalValueCell.color }}
                            >
                              {subtotal[col.key].toLocaleString()} ريال
                            </td>
                          );
                        }
                        return <td key={col.key} style={styles.subtotalValueCell}></td>;
                      })}
                    </tr>
                  );
                });

                elements.push(
                  <tr key="grand-total">
                    {displayCols.map((col, i) => {
                      if (i === 0) {
                        return (
                          <td key={col.key} style={styles.grandTotalLabelCell}>
                            الإجمالي الكلي
                          </td>
                        );
                      }
                      if (numericKeys.has(col.key)) {
                        const color = amountFontColor(col);
                        return (
                          <td
                            key={col.key}
                            style={{ ...styles.grandTotalValueCell, color: color || styles.grandTotalValueCell.color }}
                          >
                            {grandTotals[col.key].toLocaleString()} ريال
                          </td>
                        );
                      }
                      return <td key={col.key} style={styles.grandTotalValueCell}></td>;
                    })}
                  </tr>
                );

                return elements;
              })()}
            </tbody>
          </table>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} style={styles.th}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f5f7fa",
                  }}
                >
                  {columns.map((col) => {
                    const cell = row[col.key];
                    const isRich = cell && typeof cell === "object" && "value" in cell;
                    const cellValue = isRich ? cell.value : (cell ?? "—");
                    const cellColor = isRich ? cell.color : undefined;
                    const cellSubtext = isRich ? cell.subtext : null;
                    const cellSubColor = isRich ? cell.subtextColor : undefined;
                    return (
                      <td key={col.key} style={{ ...styles.td, color: cellColor || styles.td.color, fontWeight: cellColor ? "bold" : "normal" }}>
                        <div>{cellValue}</div>
                        {cellSubtext && (
                          <div style={{ fontSize: "11px", marginTop: "3px", color: cellSubColor || "#27ae60", fontWeight: "bold" }}>
                            {cellSubtext}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={styles.footer}>
          <span>عدد السجلات: {data.length}</span>
          <span>{officeName} — تقرير مُولَّد آلياً</span>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  title: {
    fontWeight: "bold",
    marginLeft: "8px",
  },
  btn: {
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    background: "#f5f5f5",
    cursor: "pointer",
    fontSize: "14px",
  },
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
  },
  printRootVisible: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 999999,
    width: "1700px",
    background: "#ffffff",
    padding: "30px 50px",
    fontFamily: "Cairo, Tahoma, sans-serif",
    direction: "rtl",
    color: "#111827",
    boxSizing: "border-box",
    overflow: "visible",
  },
  letterhead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "3px solid #1B4D7A",
    paddingBottom: "16px",
    marginBottom: "20px",
  },
  letterheadRight: { display: "flex", alignItems: "center", gap: "14px" },
  logo: { width: "56px", height: "56px", objectFit: "contain" },
  officeName: { fontSize: "20px", fontWeight: "bold", color: "#1B4D7A" },
  officeSubtitle: { fontSize: "13px", color: "#6b7280", marginTop: "2px" },
  letterheadLeft: { textAlign: "left" },
  reportTitle: { fontSize: "17px", fontWeight: "bold", color: "#111827" },
  reportDate: { fontSize: "12px", color: "#6b7280", marginTop: "4px" },

  statsRow: { display: "flex", gap: "14px", marginBottom: "20px", flexWrap: "wrap" },
  statBox: {
    flex: "1 1 160px",
    border: "2px solid",
    borderRadius: "10px",
    padding: "12px 18px",
    textAlign: "center",
    background: "#fafbfc",
  },
  statLabel: { fontSize: "13px", color: "#555", marginBottom: "4px" },
  statValue: { fontSize: "19px", fontWeight: "bold" },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    tableLayout: "fixed",
  },
  th: {
    background: "#1B4D7A",
    color: "#fff",
    padding: "10px 12px",
    textAlign: "right",
    fontWeight: 600,
    border: "1px solid #163d61",
  },
  td: {
    padding: "9px 12px",
    textAlign: "right",
    border: "1px solid #e5e7eb",
    wordBreak: "break-word",
  },
  groupTitleCell: {
    background: "#D9E2F3",
    color: "#111827",
    fontWeight: "bold",
    textAlign: "center",
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    unicodeBidi: "isolate",
    direction: "rtl",
  },
  subtotalLabelCell: {
    fontWeight: "bold",
    color: "#B42318",
    padding: "9px 12px",
    textAlign: "right",
    border: "1px solid #e5e7eb",
    background: "#fafbfc",
    unicodeBidi: "isolate",
    direction: "rtl",
  },
  subtotalValueCell: {
    fontWeight: "bold",
    color: "#111827",
    padding: "9px 12px",
    textAlign: "center",
    border: "1px solid #e5e7eb",
    background: "#fafbfc",
  },
  grandTotalLabelCell: {
    fontWeight: "bold",
    fontSize: "15px",
    color: "#111827",
    padding: "10px 12px",
    textAlign: "right",
    border: "1px solid #e5e7eb",
    background: "#eef1f5",
  },
  grandTotalValueCell: {
    fontWeight: "bold",
    fontSize: "15px",
    color: "#111827",
    padding: "10px 12px",
    textAlign: "center",
    border: "1px solid #e5e7eb",
    background: "#eef1f5",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "16px",
    paddingTop: "10px",
    borderTop: "1px solid #e5e7eb",
    fontSize: "12px",
    color: "#9ca3af",
  },
};