import io

path = "src/Leases.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) state variables
old1 = '''  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [tenantSearchText, setTenantSearchText] = useState("");
  const tenantBoxRef = useRef(null);'''
new1 = old1 + '''
  const [filterPropertiesMulti, setFilterPropertiesMulti] = useState([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [propertySearchText, setPropertySearchText] = useState("");
  const propertyBoxRef = useRef(null);'''
assert content.count(old1) == 1, "old1 not found"
content = content.replace(old1, new1)

# 2) click-outside handler
old2 = '''  useEffect(() => {
    function handleClickOutside(e) {
      if (tenantBoxRef.current && !tenantBoxRef.current.contains(e.target)) {
        setShowTenantDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);'''
new2 = '''  useEffect(() => {
    function handleClickOutside(e) {
      if (tenantBoxRef.current && !tenantBoxRef.current.contains(e.target)) {
        setShowTenantDropdown(false);
      }
      if (propertyBoxRef.current && !propertyBoxRef.current.contains(e.target)) {
        setShowPropertyDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);'''
assert content.count(old2) == 1, "old2 not found"
content = content.replace(old2, new2)

# 3) computed lists
old3 = '''  // ترتيب العقارات لشاشة الكروت (نفس ترتيب priority المستخدم بباقي الصفحات)
  const sortedPropertiesForCards = [...properties].sort((a, b) => {
    const pa = a.priority ?? 99;
    const pb = b.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.name || "").localeCompare(b.name || "", "ar");
  });'''
new3 = old3 + '''

  // تصفية متعددة للعقارات بشاشة النظرة العامة (اختيار كذا عقار مع بعض)
  const displayedPropertiesForCards = filterPropertiesMulti.length === 0
    ? sortedPropertiesForCards
    : sortedPropertiesForCards.filter(p => filterPropertiesMulti.includes(p.id));

  const overviewLeases = filterPropertiesMulti.length === 0
    ? leases
    : leases.filter(l => filterPropertiesMulti.includes(l.property_id));'''
assert content.count(old3) == 1, "old3 not found"
content = content.replace(old3, new3)

# 4) totals cards
old4 = '''              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>إجمالي العقود</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#1B4D7A" }}>{leases.length}</div>
            </div>
            <div style={{ flex: "1 1 220px", background: "#fff", border: "1px solid #1d4ed833", borderTop: "4px solid #1d4ed8", borderRadius: 14, padding: "18px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>إجمالي القيمة (صافي)</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#1d4ed8" }}>{leases.reduce((sum, l) => sum + getNetRentAmount(l), 0).toLocaleString()} ريال</div>'''
new4 = '''              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>إجمالي العقود{filterPropertiesMulti.length > 0 ? " (مصفّى)" : ""}</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#1B4D7A" }}>{overviewLeases.length}</div>
            </div>
            <div style={{ flex: "1 1 220px", background: "#fff", border: "1px solid #1d4ed833", borderTop: "4px solid #1d4ed8", borderRadius: 14, padding: "18px 22px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>إجمالي القيمة (صافي){filterPropertiesMulti.length > 0 ? " (مصفّى)" : ""}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#1d4ed8" }}>{overviewLeases.reduce((sum, l) => sum + getNetRentAmount(l), 0).toLocaleString()} ريال</div>'''
assert content.count(old4) == 1, "old4 not found"
content = content.replace(old4, new4)

# 5) no-properties message + cards map
old5 = '''          {sortedPropertiesForCards.length === 0 && (
            <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
              لا توجد عقارات
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {sortedPropertiesForCards.map(p => {'''
new5 = '''          {displayedPropertiesForCards.length === 0 && (
            <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
              {filterPropertiesMulti.length > 0 ? "لا توجد عقارات مطابقة للتصفية" : "لا توجد عقارات"}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {displayedPropertiesForCards.map(p => {'''
assert content.count(old5) == 1, "old5 not found"
content = content.replace(old5, new5)

# 6) toolbar dropdown UI
old6 = '''        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
        {filterProperty !== "الكل" && ('''
new6 = '''        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
        {filterProperty === "الكل" && (
          <div ref={propertyBoxRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "Cairo, sans-serif", minWidth: 220, background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span>
                {filterPropertiesMulti.length === 0
                  ? "تصفية عقارات محددة"
                  : filterPropertiesMulti.length === 1
                    ? (properties.find(p => p.id === filterPropertiesMulti[0])?.name || "عقار واحد")
                    : `${filterPropertiesMulti.length} عقارات محددة`}
              </span>
              <span style={{ fontSize: 10, color: "#999" }}>▾</span>
            </button>

            {showPropertyDropdown && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: 10, zIndex: 20, minWidth: 240, maxHeight: 320, overflowY: "auto" }}>
                <input
                  type="text"
                  placeholder="اكتب اسم العقار..."
                  value={propertySearchText}
                  onChange={(e) => setPropertySearchText(e.target.value)}
                  autoFocus
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "Cairo, sans-serif", marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #eee" }}>
                  <button type="button" onClick={() => setFilterPropertiesMulti(sortedPropertiesForCards.filter(p => (p.name || "").includes(propertySearchText.trim())).map(p => p.id))}
                    style={{ fontSize: 12, color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                    تحديد الكل
                  </button>
                  <button type="button" onClick={() => setFilterPropertiesMulti([])}
                    style={{ fontSize: 12, color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                    إلغاء الكل
                  </button>
                </div>
                {sortedPropertiesForCards.filter(p => (p.name || "").includes(propertySearchText.trim())).length === 0 && (
                  <div style={{ fontSize: 13, color: "#999", padding: "6px 4px" }}>لا يوجد عقار بهذا الاسم</div>
                )}
                {sortedPropertiesForCards.filter(p => (p.name || "").includes(propertySearchText.trim())).map(p => (
                  <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", fontSize: 14, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={filterPropertiesMulti.includes(p.id)}
                      onChange={() => {
                        setFilterPropertiesMulti(prev =>
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        );
                      }}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {filterProperty !== "الكل" && ('''
assert content.count(old6) == 1, "old6 not found"
content = content.replace(old6, new6)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")