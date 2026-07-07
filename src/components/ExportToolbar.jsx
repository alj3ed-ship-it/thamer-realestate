import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
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
 *          إحصائيات ملخّصة تظهر بأعلى التقرير المطبوع
 * - officeName: (اختياري) اسم المكتب بالترويسة، افتراضياً "مكتب ثامر بن سلمان العقاري"
 * - officeSubtitle: (اختياري) وصف فرعي، افتراضياً "إدارة الأملاك"
 * - logoSrc: (اختياري) مسار شعار يظهر بالترويسة
 *
 * ملاحظة تصميمية مهمة:
 * التقرير المطبوع/PDF يُبنى من عنصر مخفي مستقل (مو من الجدول الظاهر بالشاشة)،
 * مصمم خصيصاً للطباعة (خط أكبر، تباعد أوسع، ترويسة رسمية، ملخص أرقام واضح).
 * هذا يفادي مشكلة تشوّه النص العربي اللي تصير أحياناً عند تصوير عناصر الشاشة المزدحمة،
 * ويضمن شكل احترافي ثابت بغض النظر عن تصميم الصفحة الظاهرة.
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
  const [isCapturing, setIsCapturing] = useState(false);
  const printRef = useRef(null);

  const todayLabel = new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // يبني نسخة الطباعة/PDF من عنصر مخفي مستقل عشان يفادي مشاكل تصوير الشاشة
  // (نص متراكب/متقطّع) ويضمن شكل واضح واسع دائماً بغض النظر عن تصميم الشاشة.
  const buildPrintNode = () => printRef.current;

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
        }
        @page { size: landscape; margin: 12mm; }
      }
    `;
    document.head.appendChild(styleTag);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("export-print-isolation");
      if (el) el.remove();
    }, 500);
  };

  const handleExcel = () => {
    const rows = data.map((row) => {
      const obj = {};
      columns.forEach((col) => {
        obj[col.label] = row[col.key];
      });
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = columns.map(() => ({ wch: 20 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "البيانات");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handlePDF = async () => {
    const node = buildPrintNode();
    if (!node) {
      alert("تعذر تجهيز التقرير للتصدير");
      return;
    }
    setLoading(true);
    try {
      // نُظهر العنصر فعلياً فوق الشاشة (طبقة بيضاء كاملة) وقت التصوير بالضبط.
      // هذا يضمن إن المتصفح رسم المحتوى فعلياً قبل أي محاولة تصوير —
      // التخبئة البعيدة عن الشاشة كانت تعطي أحياناً صورة فارغة رغم عدم وجود أي خطأ برمجي.
      // نرجّع الصفحة لأعلى قبل التصوير — مكتبة html2canvas فيها خلل معروف
      // مع عناصر position:fixed لما تكون الصفحة ممرّرة (scrolled)، يسبب قطع
      // بأعلى الصورة الملتقطة بمقدار مسافة التمرير بالضبط.
      window.scrollTo(0, 0);
      setIsCapturing(true);
      // ننتظر إعادة الرسم (repaint) فعلياً بعد تغيير الحالة، وتحميل الخطوط كاملة.
      // ضفنا انتظار إضافي (150ms) لأن العنصر الكبير (الترويسة + الجدول) يحتاج وقت أطول
      // ليخلص المتصفح رسمه بالكامل بعد ظهوره المفاجئ — لاحظنا قطع بأعلى الترويسة
      // بدون هالانتظار الإضافي رغم عدم وجود أي خطأ برمجي.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        foreignObjectRendering: true,
      });

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("التقاط التقرير رجع فارغ (canvas بلا أبعاد)");
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // هامش موحّد حول المحتوى بكل الجهات (بدل ما يلتصق بحواف الصفحة)
      const MARGIN_MM = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - MARGIN_MM * 2;
      const usableHeight = pageHeight - MARGIN_MM * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let heightLeft = imgHeight;
      let pageIndex = 0;
      while (heightLeft > 0) {
        if (pageIndex > 0) pdf.addPage();
        const yOffset = MARGIN_MM - pageIndex * usableHeight;
        pdf.addImage(imgData, "PNG", MARGIN_MM, yOffset, usableWidth, imgHeight);
        heightLeft -= usableHeight;
        pageIndex += 1;
      }
      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("حدث خطأ أثناء إنشاء PDF: " + err.message);
    } finally {
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
        <button onClick={handleExcel} style={styles.btn}>
          📊 Excel
        </button>
      </div>

      {/* عنصر الطباعة/PDF المخفي — مستقل تماماً عن تصميم الشاشة، مبني خصيصاً للوضوح */}
      <div
        id="export-print-area"
        ref={printRef}
        style={isCapturing ? styles.printRootVisible : styles.printRoot}
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
                {columns.map((col) => (
                  <td key={col.key} style={styles.td}>
                    {row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

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

  // العنصر المخفي (مُستخدم فقط وقت الطباعة/التصدير)
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
  },
  // نفس التصميم بالضبط، بس ظاهر فعلياً فوق كل شي وقت التصوير.
  // نستخدم absolute (مو fixed) عمداً — html2canvas فيه خلل معروف مع position:fixed
  // عند وجود تمرير بالصفحة، يسبب قطع الجزء العلوي من الصورة الملتقطة.
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
    overflow: "hidden",
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

  statsRow: { display: "flex", gap: "14px", marginBottom: "20px" },
  statBox: {
    flex: 1,
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