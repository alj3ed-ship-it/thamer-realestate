# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# --- تعديل 1: إضافة state لوضع اللصق من Word ---
old1 = """  function removeTableRow(idx) {
    setTableRows((rows) => rows.filter((_, i) => i !== idx));
  }"""
assert content.count(old1) == 1, "old1 not found or not unique"
new1 = old1 + """

  // --- وضع اللصق المباشر من Word (يحافظ على الجدول والألوان كما هي) ---
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedHtml, setPastedHtml] = useState("");
  const pasteEditableRef = useRef(null);

  function handlePasteUpdate() {
    if (pasteEditableRef.current) setPastedHtml(pasteEditableRef.current.innerHTML);
  }"""
content = content.replace(old1, new1)

# --- تعديل 2: إضافة خانة تفعيل + صندوق اللصق تحت جدول الدفعات ---
old2 = """              <button type="button" onClick={addTableRow} style={{ width: "100%", background: "#f0f4f8", color: "#1B4D7A", border: "1px solid #ddd", borderRadius: "6px", padding: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>+ إضافة صف</button>
            </div>
          )}"""
assert content.count(old2) == 1, "old2 not found or not unique"
new2 = old2 + """

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#555", marginBottom: "10px", fontWeight: "bold", cursor: "pointer" }}>
            <input type="checkbox" checked={pasteMode} onChange={(e) => setPasteMode(e.target.checked)} />
            لصق نص/جدول من Word مباشرة (بنفس الألوان)
          </label>

          {pasteMode && (
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>
                افتح ملف Word، انسخ (Ctrl+C) الجدول/النص المطلوب، ثم الصقه هنا (Ctrl+V)
              </div>
              <div
                ref={pasteEditableRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handlePasteUpdate}
                onPaste={() => setTimeout(handlePasteUpdate, 0)}
                style={{
                  minHeight: "220px", border: "1px solid #ddd", borderRadius: "8px",
                  padding: "12px", fontSize: "14px", fontFamily: "Cairo, sans-serif",
                  background: "#fff", direction: "rtl", overflowY: "auto", maxHeight: "400px",
                }}
              />
              <button
                type="button"
                onClick={() => { setPastedHtml(""); if (pasteEditableRef.current) pasteEditableRef.current.innerHTML = ""; }}
                style={{ width: "100%", background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", padding: "6px", fontSize: "12px", cursor: "pointer", marginTop: "6px" }}
              >
                مسح المحتوى الملصوق
              </button>
            </div>
          )}"""
content = content.replace(old2, new2)

# --- تعديل 3: عرض المحتوى الملصوق (بالجدول والألوان) بدل نص القالب داخل الخطاب المطبوع ---
old3 = """            <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: "180px" }}>
              {bodyText}
            </div>"""
assert content.count(old3) == 1, "old3 not found or not unique"
new3 = """            {pasteMode ? (
              <div
                style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", minHeight: "180px" }}
                dangerouslySetInnerHTML={{ __html: pastedHtml }}
              />
            ) : (
              <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: "180px" }}>
                {bodyText}
              </div>
            )}"""
content = content.replace(old3, new3)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — 3 تعديلات (ميزة اللصق من Word)")
