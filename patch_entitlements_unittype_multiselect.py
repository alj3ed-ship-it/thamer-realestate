import io

path = "src/Entitlements.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) State replacement
old1 = '  const [selectedUnitType, setSelectedUnitType] = useState("");'
new1 = '''  const [selectedUnitTypes, setSelectedUnitTypes] = useState([]);
  const [unitTypeDropdownOpen, setUnitTypeDropdownOpen] = useState(false);
  const unitTypeDropdownRef = useRef(null);'''
assert content.count(old1) == 1, f"old1 count: {content.count(old1)}"
content = content.replace(old1, new1)

# 2) Add effect + helper functions after viewingLeaseId state
old2 = '  const [viewingLeaseId, setViewingLeaseId] = useState(null);'
new2 = old2 + '''

  useEffect(() => {
    function handleClickOutside(e) {
      if (unitTypeDropdownRef.current && !unitTypeDropdownRef.current.contains(e.target)) {
        setUnitTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleUnitType = (t) => {
    setSelectedUnitTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const clearUnitTypeFilter = () => setSelectedUnitTypes([]);

  const unitTypeFilterLabel = () => {
    if (selectedUnitTypes.length === 0) return "كل الأنواع";
    if (selectedUnitTypes.length === 1) return selectedUnitTypes[0];
    return `${selectedUnitTypes.length} أنواع محددة`;
  };'''
assert content.count(old2) == 1, f"old2 count: {content.count(old2)}"
content = content.replace(old2, new2)

# 3) Filtering logic
old3 = '      if (selectedUnitType && !units.some((u) => (u.unit_type || "").trim() === selectedUnitType)) continue;'
new3 = '      if (selectedUnitTypes.length > 0 && !units.some((u) => selectedUnitTypes.includes((u.unit_type || "").trim()))) continue;'
assert content.count(old3) == 1, f"old3 count: {content.count(old3)}"
content = content.replace(old3, new3)

# 4) UI dropdown
old4 = '''              <div>
                <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>نوع الوحدة</label>
                <select value={selectedUnitType} onChange={(e) => setSelectedUnitType(e.target.value)}
                  style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "140px" }}>
                  <option value="">كل الأنواع</option>
                  {uniqueUnitTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>'''
new4 = '''              <div style={{ position: "relative" }} ref={unitTypeDropdownRef}>
                <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>نوع الوحدة</label>
                <button type="button" onClick={() => setUnitTypeDropdownOpen((o) => !o)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", color: "#111827", backgroundColor: "#fff", cursor: "pointer", minWidth: "160px", justifyContent: "space-between", fontFamily: "Cairo, sans-serif" }}>
                  <span>{unitTypeFilterLabel()}</span>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>▾</span>
                </button>
                {unitTypeDropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20, backgroundColor: "#fff", border: "1px solid #d1d5db", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)", minWidth: "180px", maxHeight: "280px", overflowY: "auto", padding: "6px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "6px", fontSize: "13px", color: "#111827", cursor: "pointer" }}>
                      <input type="checkbox" checked={selectedUnitTypes.length === 0} onChange={clearUnitTypeFilter} />
                      <span>كل الأنواع</span>
                    </label>
                    <div style={{ height: "1px", backgroundColor: "#e5e7eb", margin: "4px 0" }} />
                    {uniqueUnitTypes.map((t) => (
                      <label key={t} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 8px", borderRadius: "6px", fontSize: "13px", color: "#111827", cursor: "pointer" }}>
                        <input type="checkbox" checked={selectedUnitTypes.includes(t)} onChange={() => toggleUnitType(t)} />
                        <span>{t}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>'''
assert content.count(old4) == 1, f"old4 count: {content.count(old4)}"
content = content.replace(old4, new4)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تطبيق كل التعديلات بنجاح")