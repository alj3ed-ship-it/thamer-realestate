import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import officeLogo from "./assets/thamer-logo.svg";
import watermarkLogo from "./assets/watermark-logo.svg";
import officeSignature from "./assets/signature.png";

const OFFICE_NAME = "مكتب ثامر بن سلمان العقاري";
const OFFICE_PHONE = "0555507144";
const SIGNER_NAME = "ثامر بن سلمان";

// أنواع الخطابات — أضف/عدّل حسب ما تحتاج مستقبلاً
const LETTER_TYPES = [
  {
    key: "late_payment",
    label: "متأخر سداد",
    buildBody: ({ tenant, property, unit, amount }) =>
      `المكرم / ${tenant || "..........."}\n\nالسلام عليكم ورحمة الله وبركاته،\n\nنحيطكم علماً بأن المبلغ المستحق عليكم وقدره (${amount || "..........."} ريال) عن الوحدة (${unit || "..........."}) الكائنة ضمن ${property || "..........."} قد تجاوز تاريخ الاستحقاق دون سداد حتى تاريخه.\n\nنأمل منكم المبادرة بسداد المبلغ المستحق خلال مدة أقصاها سبعة أيام من تاريخ هذا الخطاب، تفادياً لاتخاذ الإجراءات النظامية اللازمة.\n\nولكم منا خالص الشكر والتقدير.`,
  },
  {
    key: "general_notice",
    label: "تنبيه عام",
    buildBody: ({ tenant, property, unit }) =>
      `المكرم / ${tenant || "..........."}\n\nالسلام عليكم ورحمة الله وبركاته،\n\nنود تنبيهكم بخصوص الوحدة (${unit || "..........."}) الكائنة ضمن ${property || "..........."}، حيث نأمل منكم الالتزام بما ورد في العقد المبرم بيننا خلال أقرب وقت ممكن.\n\nولكم منا خالص الشكر والتقدير.`,
  },
  {
    key: "eviction",
    label: "إخلاء",
    buildBody: ({ tenant, property, unit }) =>
      `المكرم / ${tenant || "..........."}\n\nالسلام عليكم ورحمة الله وبركاته،\n\nإلحاقاً بالمخالفات المتكررة لبنود العقد المبرم بيننا بخصوص الوحدة (${unit || "..........."}) الكائنة ضمن ${property || "..........."}، نفيدكم بضرورة إخلاء الوحدة المذكورة وتسليمها خلال مدة أقصاها ثلاثون يوماً من تاريخ هذا الخطاب.\n\nولكم منا خالص الشكر والتقدير.`,
  },
  {
    key: "other",
    label: "أخرى",
    buildBody: () => "",
  },
];

// تحويل تقريبي من ميلادي إلى هجري (خوارزمية كويتية شائعة) — يمكن تعديله يدوياً بأي وقت
function gregorianToHijriApprox(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let m = month, y = year;
  if (m < 3) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { year: hYear, month: hMonth, day: hDay };
}

export default function Letters({ onBack }) {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeaseId, setSelectedLeaseId] = useState("");
  const [letterTypeKey, setLetterTypeKey] = useState(LETTER_TYPES[0].key);
  const [customTitle, setCustomTitle] = useState("");

  const [tenantName, setTenantName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [unitText, setUnitText] = useState("");
  const [amount, setAmount] = useState("");
  const [dateHijri, setDateHijri] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef(null);

  // --- بحث المستأجر القابل للكتابة ---
  const [leaseSearch, setLeaseSearch] = useState("");
  const [showLeaseDropdown, setShowLeaseDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const leaseBoxRef = useRef(null);

  useEffect(() => { fetchLeases(); initDate(); }, []);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(e) {
      if (leaseBoxRef.current && !leaseBoxRef.current.contains(e.target)) {
        setShowLeaseDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function initDate() {
    const h = gregorianToHijriApprox(new Date());
    setDateHijri(`${h.year}/${String(h.month).padStart(2, "0")}/${String(h.day).padStart(2, "0")} هـ`);
  }

  async function fetchLeases() {
    setLoading(true);
    const { data, error } = await supabase.from("leases").select(`
      id,
      tenants ( name, phone ),
      properties ( name ),
      lease_units ( units ( unit_number, unit_type ) )
    `);
    if (error) {
      // في حال عمود phone غير موجود بجدول tenants، أعد المحاولة بدونه
      const retry = await supabase.from("leases").select(`
        id,
        tenants ( name ),
        properties ( name ),
        lease_units ( units ( unit_number, unit_type ) )
      `);
      setLeases(retry.data || []);
    } else {
      setLeases(data || []);
    }
    setLoading(false);
  }

  const leaseOptions = useMemo(() => {
    return leases
      .filter((l) => l.tenants?.name)
      .map((l) => ({
        id: l.id,
        tenant: l.tenants?.name || "",
        phone: l.tenants?.phone || "",
        property: l.properties?.name || "",
        unit: (l.lease_units || [])
          .map((lu) => lu.units && `${lu.units.unit_type} ${lu.units.unit_number}`)
          .filter(Boolean)
          .join(" + "),
      }))
      .sort((a, b) => a.tenant.localeCompare(b.tenant, "ar"));
  }, [leases]);

  // فلترة القائمة حسب النص المكتوب — يبحث بالاسم أو العقار أو الوحدة
  const filteredLeaseOptions = useMemo(() => {
    const q = leaseSearch.trim().toLowerCase();
    if (!q) return leaseOptions;
    return leaseOptions.filter((l) =>
      l.tenant.toLowerCase().includes(q) ||
      l.property.toLowerCase().includes(q) ||
      (l.unit || "").toLowerCase().includes(q)
    );
  }, [leaseOptions, leaseSearch]);

  function applyTemplate(typeKey, overrides = {}) {
    const type = LETTER_TYPES.find((t) => t.key === typeKey) || LETTER_TYPES[0];
    const ctx = {
      tenant: overrides.tenant ?? tenantName,
      property: overrides.property ?? propertyName,
      unit: overrides.unit ?? unitText,
      amount: overrides.amount ?? amount,
    };
    setBodyText(type.buildBody(ctx));
  }

  function handleLeaseSelect(id) {
    setSelectedLeaseId(id);
    const found = leaseOptions.find((l) => String(l.id) === String(id));
    if (found) {
      setTenantName(found.tenant);
      setPropertyName(found.property);
      setUnitText(found.unit);
      setLeaseSearch(`${found.tenant} — ${found.property} (${found.unit || "بدون وحدة"})`);
      applyTemplate(letterTypeKey, {
        tenant: found.tenant,
        property: found.property,
        unit: found.unit,
        amount,
      });
    }
    setShowLeaseDropdown(false);
    setHighlightIndex(-1);
  }

  function handleLeaseSearchChange(value) {
    setLeaseSearch(value);
    setShowLeaseDropdown(true);
    setHighlightIndex(-1);
    // لو المستخدم عدّل النص يدوياً، نلغي الربط بالعقد المختار سابقاً
    if (selectedLeaseId) setSelectedLeaseId("");
  }

  function handleLeaseSearchKeyDown(e) {
    if (!showLeaseDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filteredLeaseOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && filteredLeaseOptions[highlightIndex]) {
        handleLeaseSelect(filteredLeaseOptions[highlightIndex].id);
      }
    } else if (e.key === "Escape") {
      setShowLeaseDropdown(false);
    }
  }

  function handleTypeChange(key) {
    setLetterTypeKey(key);
    applyTemplate(key);
  }

  const letterTitle = letterTypeKey === "other"
    ? (customTitle || "خطاب")
    : (LETTER_TYPES.find((t) => t.key === letterTypeKey)?.label || "خطاب");

  async function handleDownloadPDF() {
    const node = printRef.current;
    if (!node) return;
    setPdfLoading(true);
    try {
      window.scrollTo(0, 0);
      setIsCapturing(true);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      // ننتظر تحميل كل الصور داخل عنصر الطباعة (اللوقو المائي + التوقيع) فعلياً
      // قبل التصوير — بدون هذا الانتظار، html2canvas قد يلتقط الصورة قبل ما
      // يخلص المتصفح تحميلها فتظهر فارغة (خصوصاً أول مرة تفتح الصفحة).
      const imgs = Array.from(node.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        // ملاحظة: جربنا foreignObjectRendering:true لإصلاح تفكك حروف "فال"، لكنه
        // سبب صفحة PDF فاضية بالكامل. الإصلاح الفعلي والكافي كان حذف unicode-bidi
        // المفروض على أرقام التصاريح بالأسطر أعلاه — false هو الإعداد الصحيح والمستقر.
        foreignObjectRendering: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const MARGIN_MM = 12;
      const usableWidth = pageWidth - MARGIN_MM * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", MARGIN_MM, MARGIN_MM, usableWidth, Math.min(imgHeight, pageHeight - MARGIN_MM * 2));
      pdf.save(`خطاب_${tenantName || "بدون_اسم"}.pdf`);
    } catch (err) {
      console.error("letter PDF error:", err);
      alert("حدث خطأ أثناء إنشاء PDF: " + err.message);
    } finally {
      setIsCapturing(false);
      setPdfLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "32px", textAlign: "center" }}>جاري التحميل...</div>;

  return (
    <div style={{ padding: "32px", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h1 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "24px" }}>الخطابات</h1>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px", alignItems: "start" }}>
        {/* لوحة التحكم */}
        <div className="no-print" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>نوع الخطاب</label>
          <select
            value={letterTypeKey}
            onChange={(e) => handleTypeChange(e.target.value)}
            style={{ width: "100%", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }}
          >
            {LETTER_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>

          {letterTypeKey === "other" && (
            <>
              <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>عنوان الخطاب</label>
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="مثال: خطاب تجديد عقد"
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }}
              />
            </>
          )}

          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>المستأجر (اختياري - للتعبئة التلقائية)</label>
          <div ref={leaseBoxRef} style={{ position: "relative", marginBottom: "14px" }}>
            <input
              value={leaseSearch}
              onChange={(e) => handleLeaseSearchChange(e.target.value)}
              onFocus={() => setShowLeaseDropdown(true)}
              onKeyDown={handleLeaseSearchKeyDown}
              placeholder="اكتب اسم المستأجر أو العقار أو رقم الوحدة..."
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif" }}
            />
            {showLeaseDropdown && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0,
                background: "#fff", border: "1px solid #ddd", borderRadius: "8px",
                maxHeight: "260px", overflowY: "auto", zIndex: 20,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              }}>
                {filteredLeaseOptions.length === 0 && (
                  <div style={{ padding: "10px 12px", fontSize: "13px", color: "#9ca3af" }}>لا توجد نتائج مطابقة</div>
                )}
                {filteredLeaseOptions.map((l, idx) => (
                  <div
                    key={l.id}
                    onMouseDown={(e) => { e.preventDefault(); handleLeaseSelect(l.id); }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    style={{
                      padding: "8px 12px", fontSize: "13px", cursor: "pointer",
                      background: idx === highlightIndex ? "#eef3ff" : "#fff",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#1B4D7A" }}>{l.tenant}</div>
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>{l.property} ({l.unit || "بدون وحدة"})</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>اسم المستأجر</label>
          <input value={tenantName} onChange={(e) => setTenantName(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }} />

          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>العقار</label>
          <input value={propertyName} onChange={(e) => setPropertyName(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }} />

          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>الوحدة</label>
          <input value={unitText} onChange={(e) => setUnitText(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }} />

          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>المبلغ (إن وجد)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثال: 7,500"
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }} />

          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>التاريخ الهجري</label>
          <input value={dateHijri} onChange={(e) => setDateHijri(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }} />

          <button
            type="button"
            onClick={() => applyTemplate(letterTypeKey)}
            style={{ width: "100%", background: "#f0f4f8", color: "#1B4D7A", border: "1px solid #ddd", borderRadius: "8px", padding: "9px", fontSize: "13px", fontFamily: "Cairo, sans-serif", cursor: "pointer", marginBottom: "10px", fontWeight: "bold" }}
          >
            إعادة تعبئة النص من القالب
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            style={{ width: "100%", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}
          >
            {pdfLoading ? "جارٍ التجهيز..." : "📄 تحميل PDF"}
          </button>
        </div>

        {/* نص الخطاب القابل للتعديل */}
        <div>
          <div className="no-print" style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>نص الخطاب (قابل للتعديل الحر)</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={10}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", lineHeight: 1.9, resize: "vertical" }}
            />
          </div>

          {/* معاينة/طباعة الخطاب */}
          <div
            ref={printRef}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: isCapturing ? 0 : "12px",
              boxShadow: isCapturing ? "none" : "0 2px 12px rgba(0,0,0,0.07)",
              padding: "40px 45px",
              direction: "rtl",
              fontFamily: "Cairo, sans-serif",
              width: "700px",
              maxWidth: "100%",
              minHeight: "760px",
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* شعار مائي بخلفية كامل الصفحة — ممطوط طولياً عمداً ليصل خطه الأخضر قرب منطقة التوقيع */}
            <img
              src={watermarkLogo}
              alt=""
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "600px",
                maxWidth: "90%",
                height: "660px",
                opacity: 0.16,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>

            <style>{`@import url('https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=Tajawal:wght@500&display=swap');`}</style>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1B4D7A", paddingBottom: "16px", marginBottom: "28px" }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "22px", color: "#9A7D0A", fontFamily: "'Aref Ruqaa', serif" }}>{OFFICE_NAME}</div>
                <div style={{ fontSize: "13px", color: "#0F5C3C", marginTop: "6px", display: "flex", gap: "6px" }}>
                  <span>جوال</span>
                  <span>:</span>
                  <span style={{ direction: "ltr" }}>{OFFICE_PHONE}</span>
                </div>
              </div>
              <div style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "12px", lineHeight: 1.9, textAlign: "left" }}>
  <div style={{ direction: "ltr", unicodeBidi: "isolate", whiteSpace: "nowrap" }}>
    <span style={{ color: "#0F5C3C" }}>EJAR</span>
    <span style={{ color: "#0F5C3C" }}> - </span>
    <span style={{ color: "#9A7D0A" }}>13160921</span>
  </div>
  <div style={{ direction: "rtl", unicodeBidi: "isolate", whiteSpace: "nowrap" }}>
    <span style={{ color: "#0F5C3C" }}>فال</span>
    <span style={{ color: "#0F5C3C" }}> - </span>
    <span style={{ color: "#9A7D0A", direction: "ltr", unicodeBidi: "isolate" }}>1200029314</span>
  </div>
</div>
            </div>

            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>التاريخ: {dateHijri}</div>
            <div style={{ fontWeight: "bold", fontSize: "16px", color: "#111827", margin: "18px 0 16px" }}>{letterTitle}</div>

            <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: "180px" }}>
              {bodyText}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <img src={officeSignature} alt="التوقيع" style={{ width: "130px", height: "auto", display: "block", margin: "0 auto", marginBottom: "-6px", transform: "translateX(-18px)" }} />
                <div style={{ fontSize: "13px", marginTop: "0px", color: "#111827" }}>{SIGNER_NAME}</div>
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}