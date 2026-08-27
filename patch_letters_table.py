# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# --- تعديل 1: إضافة state لخانة الجدول وصفوفه ---
old1 = """  const [isCapturing, setIsCapturing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef(null);"""
assert content.count(old1) == 1, "old1 not found or not unique"
new1 = old1 + """

  // --- جدول دفعات الإيجار (اختياري) ---
  const [showTable, setShowTable] = useState(false);
  const [tableRows, setTableRows] = useState([
    { period: "الخمس سنوات الأولى", from: "2026/01/09", to: "2031/01/08", net: "900,000 ريال", withTax: "1,035,000 ريال" },
    { period: "الخمس سنوات الثانية", from: "2031/01/09", to: "2036/01/08", net: "1,000,000 ريال", withTax: "1,150,000 ريال" },
    { period: "الأربع سنوات الثالثة", from: "2036/01/09", to: "2040/01/08", net: "1,125,000 ريال", withTax: "1,293,750 ريال" },
  ]);

  function updateTableRow(idx, field, value) {
    setTableRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function addTableRow() {
    setTableRows((rows) => [...rows, { period: "", from: "", to: "", net: "", withTax: "" }]);
  }

  function removeTableRow(idx) {
    setTableRows((rows) => rows.filter((_, i) => i !== idx));
  }"""
content = content.replace(old1, new1)

# --- تعديل 2: إضافة عناصر التحكم بالجدول تحت زر "إعادة تعبئة النص من القالب" ---
old2 = """          <button
            type="button"
            onClick={() => applyTemplate(letterTypeKey)}
            style={{ width: "100%", background: "#f0f4f8", color: "#1B4D7A", border: "1px solid #ddd", borderRadius: "8px", padding: "9px", fontSize: "13px", fontFamily: "Cairo, sans-serif", cursor: "pointer", marginBottom: "10px", fontWeight: "bold" }}
          >
            إعادة تعبئة النص من القالب
          </button>"""
assert content.count(old2) == 1, "old2 not found or not unique"
new2 = old2 + """

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#555", marginBottom: "10px", fontWeight: "bold", cursor: "pointer" }}>
            <input type="checkbox" checked={showTable} onChange={(e) => setShowTable(e.target.checked)} />
            تضمين جدول دفعات إيجار
          </label>

          {showTable && (
            <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "10px", marginBottom: "14px" }}>
              {tableRows.map((row, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px dashed #eee" }}>
                  <input value={row.period} onChange={(e) => updateTableRow(idx, "period", e.target.value)} placeholder="الحقبة" style={{ gridColumn: "1 / -1", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "Cairo, sans-serif" }} />
                  <input value={row.from} onChange={(e) => updateTableRow(idx, "from", e.target.value)} placeholder="من" style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "Cairo, sans-serif" }} />
                  <input value={row.to} onChange={(e) => updateTableRow(idx, "to", e.target.value)} placeholder="إلى" style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "Cairo, sans-serif" }} />
                  <input value={row.net} onChange={(e) => updateTableRow(idx, "net", e.target.value)} placeholder="الإيجار الصافي" style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "Cairo, sans-serif" }} />
                  <input value={row.withTax} onChange={(e) => updateTableRow(idx, "withTax", e.target.value)} placeholder="شامل الضريبة" style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "6px 8px", fontSize: "12px", fontFamily: "Cairo, sans-serif" }} />
                  <button type="button" onClick={() => removeTableRow(idx)} style={{ gridColumn: "1 / -1", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", padding: "4px", fontSize: "11px", cursor: "pointer" }}>حذف الصف</button>
                </div>
              ))}
              <button type="button" onClick={addTableRow} style={{ width: "100%", background: "#f0f4f8", color: "#1B4D7A", border: "1px solid #ddd", borderRadius: "6px", padding: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>+ إضافة صف</button>
            </div>
          )}"""
content = content.replace(old2, new2)

# --- تعديل 3: عرض الجدول الملوّن داخل الخطاب بعد النص ---
old3 = """            <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: "180px" }}>
              {bodyText}
            </div>"""
assert content.count(old3) == 1, "old3 not found or not unique"
new3 = old3 + """

            {showTable && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "18px", fontSize: "13px", direction: "rtl" }}>
                <thead>
                  <tr style={{ background: "#0F5C3C", color: "#fff" }}>
                    <th style={{ padding: "8px", border: "1px solid #0F5C3C", fontWeight: "bold" }}>الحقبة</th>
                    <th style={{ padding: "8px", border: "1px solid #0F5C3C", fontWeight: "bold" }}>من</th>
                    <th style={{ padding: "8px", border: "1px solid #0F5C3C", fontWeight: "bold" }}>إلى</th>
                    <th style={{ padding: "8px", border: "1px solid #0F5C3C", fontWeight: "bold" }}>الإيجار الصافي</th>
                    <th style={{ padding: "8px", border: "1px solid #0F5C3C", fontWeight: "bold" }}>شامل الضريبة (15%)</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#f0f7f3" : "#fff" }}>
                      <td style={{ padding: "8px", border: "1px solid #cfe3d8", fontWeight: "bold" }}>{row.period}</td>
                      <td style={{ padding: "8px", border: "1px solid #cfe3d8" }}>{row.from}</td>
                      <td style={{ padding: "8px", border: "1px solid #cfe3d8" }}>{row.to}</td>
                      <td style={{ padding: "8px", border: "1px solid #cfe3d8" }}>{row.net}</td>
                      <td style={{ padding: "8px", border: "1px solid #cfe3d8", color: "#9A7D0A", fontWeight: "bold" }}>{row.withTax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}"""
content = content.replace(old3, new3)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — 3 تعديلات (ميزة جدول الدفعات)")
