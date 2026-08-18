import pathlib

path = pathlib.Path("src/Letters.jsx")
content = path.read_text(encoding="utf-8")

# ---------- 1) إضافة الحالات (state) الجديدة ----------
old_state = '''  const [isCapturing, setIsCapturing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef(null);'''

new_state = '''  const [isCapturing, setIsCapturing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef(null);

  // --- الخطابات المحفوظة ---
  const [savedLetters, setSavedLetters] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedSearch, setSavedSearch] = useState("");
  const [saveInProgress, setSaveInProgress] = useState(false);'''

assert content.count(old_state) == 1, f"state block match count: {content.count(old_state)}"
content = content.replace(old_state, new_state)

# ---------- 2) إضافة الدوال (fetch / save / delete / load) قبل "if (loading) return" ----------
old_before_render = '''  if (loading) return <div style={{ padding: "32px", textAlign: "center" }}>جاري التحميل...</div>;'''

new_before_render = '''  async function fetchSavedLetters() {
    setSavedLoading(true);
    const { data, error } = await supabase
      .from("letters")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSavedLetters(data || []);
    setSavedLoading(false);
  }

  function openSavedModal() {
    setShowSavedModal(true);
    fetchSavedLetters();
  }

  async function handleSaveLetter() {
    setSaveInProgress(true);
    try {
      const { error } = await supabase.from("letters").insert({
        letter_type: letterTypeKey,
        letter_title: letterTitle,
        tenant_name: tenantName,
        property_name: propertyName,
        unit_text: unitText,
        amount: amount,
        date_hijri: dateHijri,
        body_text: bodyText,
        lease_id: selectedLeaseId || null,
      });
      if (error) throw error;
      alert("تم حفظ الخطاب بنجاح ✅");
    } catch (err) {
      console.error("save letter error:", err);
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      setSaveInProgress(false);
    }
  }

  async function handleDeleteSavedLetter(id) {
    if (!window.confirm("متأكد تبي تحذف هذا الخطاب المحفوظ؟")) return;
    const { error } = await supabase.from("letters").delete().eq("id", id);
    if (!error) {
      setSavedLetters((prev) => prev.filter((l) => l.id !== id));
    } else {
      alert("تعذر الحذف: " + error.message);
    }
  }

  function handleLoadSavedLetter(letter) {
    setLetterTypeKey(letter.letter_type || "other");
    setCustomTitle(letter.letter_title || "");
    setTenantName(letter.tenant_name || "");
    setPropertyName(letter.property_name || "");
    setUnitText(letter.unit_text || "");
    setAmount(letter.amount || "");
    setDateHijri(letter.date_hijri || "");
    setBodyText(letter.body_text || "");
    setLeaseSearch(letter.tenant_name || "");
    setShowSavedModal(false);
  }

  const filteredSavedLetters = savedLetters.filter((l) => {
    const q = savedSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (l.tenant_name || "").toLowerCase().includes(q) ||
      (l.letter_title || "").toLowerCase().includes(q) ||
      (l.property_name || "").toLowerCase().includes(q)
    );
  });

  if (loading) return <div style={{ padding: "32px", textAlign: "center" }}>جاري التحميل...</div>;'''

assert content.count(old_before_render) == 1, f"before-render match count: {content.count(old_before_render)}"
content = content.replace(old_before_render, new_before_render)

# ---------- 3) إضافة الأزرار (حفظ + عرض المحفوظة) بجانب زر تحميل PDF ----------
old_buttons = '''          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            style={{ width: "100%", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}
          >
            {pdfLoading ? "جارٍ التجهيز..." : "📄 تحميل PDF"}
          </button>
        </div>'''

new_buttons = '''          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            style={{ width: "100%", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold", marginBottom: "10px" }}
          >
            {pdfLoading ? "جارٍ التجهيز..." : "📄 تحميل PDF"}
          </button>

          <button
            type="button"
            onClick={handleSaveLetter}
            disabled={saveInProgress}
            style={{ width: "100%", background: "#0F5C3C", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold", marginBottom: "10px" }}
          >
            {saveInProgress ? "جارٍ الحفظ..." : "💾 حفظ الخطاب"}
          </button>

          <button
            type="button"
            onClick={openSavedModal}
            style={{ width: "100%", background: "#f0f4f8", color: "#1B4D7A", border: "1px solid #ddd", borderRadius: "8px", padding: "10px", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}
          >
            📁 الخطابات المحفوظة
          </button>
        </div>'''

assert content.count(old_buttons) == 1, f"buttons match count: {content.count(old_buttons)}"
content = content.replace(old_buttons, new_buttons)

# ---------- 4) إضافة النافذة المنبثقة (Modal) قبل نهاية المكوّن ----------
old_tail = '''      </div>
    </div>
  );
}'''

new_tail = '''      </div>

      {showSavedModal && (
        <div
          className="no-print"
          onClick={() => setShowSavedModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: "12px", padding: "24px",
              width: "620px", maxWidth: "92%", maxHeight: "80vh", overflowY: "auto",
              direction: "rtl", fontFamily: "Cairo, sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", color: "#1B4D7A", margin: 0 }}>الخطابات المحفوظة</h2>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}
              >
                ✕
              </button>
            </div>

            <input
              value={savedSearch}
              onChange={(e) => setSavedSearch(e.target.value)}
              placeholder="بحث باسم المستأجر أو العقار أو عنوان الخطاب..."
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", marginBottom: "14px" }}
            />

            {savedLoading && <div style={{ textAlign: "center", padding: "20px", color: "#888" }}>جاري التحميل...</div>}

            {!savedLoading && filteredSavedLetters.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>لا توجد خطابات محفوظة مطابقة</div>
            )}

            {!savedLoading && filteredSavedLetters.map((l) => (
              <div
                key={l.id}
                style={{
                  border: "1px solid #eee", borderRadius: "8px", padding: "12px",
                  marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", color: "#1B4D7A", fontSize: "14px" }}>
                    {l.tenant_name || "بدون اسم"} — {l.letter_title || "خطاب"}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "3px" }}>
                    {l.property_name || ""} {l.unit_text ? `(${l.unit_text})` : ""} · {new Date(l.created_at).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleLoadSavedLetter(l)}
                    style={{ background: "#1B4D7A", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif" }}
                  >
                    فتح
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedLetter(l.id)}
                    style={{ background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif" }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}'''

assert content.count(old_tail) == 1, f"tail match count: {content.count(old_tail)}"
content = content.replace(old_tail, new_tail)

path.write_text(content, encoding="utf-8")
print("تم تطبيق كل التعديلات بنجاح ✅ (state + دوال + أزرار + نافذة الخطابات المحفوظة)")
