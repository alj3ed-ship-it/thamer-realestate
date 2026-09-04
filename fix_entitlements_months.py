import io

path = "src/Entitlements.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1) state declaration
old1 = '  const [selectedMonthNum, setSelectedMonthNum] = useState("1");'
new1 = '''  const [selectedMonths, setSelectedMonths] = useState([1]);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef(null);'''
replacements.append((old1, new1))

# 2) helper functions (inserted before "const [loading, setLoading]")
old2 = '''  const unitTypeFilterLabel = () => {
    if (selectedUnitTypes.length === 0) return "كل الأنواع";
    if (selectedUnitTypes.length === 1) return selectedUnitTypes[0];
    return `${selectedUnitTypes.length} أنواع محددة`;
  };
  const [loading, setLoading] = useState(true);'''
new2 = '''  const unitTypeFilterLabel = () => {
    if (selectedUnitTypes.length === 0) return "كل الأنواع";
    if (selectedUnitTypes.length === 1) return selectedUnitTypes[0];
    return `${selectedUnitTypes.length} أنواع محددة`;
  };

  const toggleMonth = (m) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };
  const clearMonthFilter = () => setSelectedMonths([]);
  const monthFilterLabel = () => {
    if (selectedMonths.length === 0) return "كل الأشهر";
    if (selectedMonths.length === 1) return `${selectedMonths[0]} - ${HIJRI_MONTHS[selectedMonths[0] - 1]}`;
    return `${selectedMonths.length} أشهر محددة`;
  };
  const selectedMonthsLabelFull = () => {
    if (selectedMonths.length === 0) return "كل الأشهر";
    return selectedMonths.slice().sort((a, b) => a - b).map((m) => HIJRI_MONTHS[m - 1]).join("، ");
  };

  const [loading, setLoading] = useState(true);'''
replacements.append((old2, new2))

# 3) close month dropdown on outside click
old3 = '''  useEffect(() => {
    function handleClickOutside(e) {
      if (filterBoxRef.current && !filterBoxRef.current.contains(e.target)) {
        setShowPropDropdown(false);
        setShowTenantDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);'''
new3 = '''  useEffect(() => {
    function handleClickOutside(e) {
      if (filterBoxRef.current && !filterBoxRef.current.contains(e.target)) {
        setShowPropDropdown(false);
        setShowTenantDropdown(false);
        setMonthDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);'''
replacements.append((old3, new3))

# 4) handleSearch: remove single filterMonth
old4 = '''    const filterYear = parseInt(selectedYear);
    const filterMonth = parseInt(selectedMonthNum);
    const found = [];'''
new4 = '''    const filterYear = parseInt(selectedYear);
    const found = [];'''
replacements.append((old4, new4))

# 5) handleSearch: multi-month matching
old5 = '''      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
      if (!hijri || hijri.year !== filterYear || hijri.month !== filterMonth) continue;'''
new5 = '''      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
      if (!hijri || hijri.year !== filterYear) continue;
      if (selectedMonths.length > 0 && !selectedMonths.includes(hijri.month)) continue;'''
replacements.append((old5, new5))

# 6) UI: replace single <select> with multi-select dropdown
old6 = '''        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>الشهر</label>
          <select value={selectedMonthNum} onChange={(e) => setSelectedMonthNum(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "160px" }}>
            {HIJRI_MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} - {name}</option>
            ))}
          </select>
        </div>'''
new6 = '''        <div style={{ position: "relative" }} ref={monthDropdownRef}>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>الشهر</label>
          <button type="button" onClick={() => { setMonthDropdownOpen((o) => !o); setShowPropDropdown(false); setShowTenantDropdown(false); }}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{monthFilterLabel()}</span>
            <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
          </button>

          {monthDropdownOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "200px", maxHeight: "300px", overflowY: "auto" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                <button type="button" onClick={() => setSelectedMonths(HIJRI_MONTHS.map((_, i) => i + 1))}
                  style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  تحديد الكل
                </button>
                <button type="button" onClick={clearMonthFilter}
                  style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  إلغاء الكل
                </button>
              </div>
              {HIJRI_MONTHS.map((name, i) => (
                <label key={i + 1} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(i + 1)}
                    onChange={() => toggleMonth(i + 1)}
                  />
                  {i + 1} - {name}
                </label>
              ))}
            </div>
          )}
        </div>'''
replacements.append((old6, new6))

# 7) ExportToolbar filename/title: reflect multi-month selection (affects Excel/PDF/print)
old7 = '''            filename={`entitlements_${selectedYear}_${selectedMonthNum}${statusFilter !== "all" ? "_" + statusFilter : ""}`}
            title={`جدول الاستحقاقات - ${HIJRI_MONTHS[parseInt(selectedMonthNum) - 1]} ${selectedYear} هـ${statusFilter !== "all" ? " - " + (STATUS_FILTERS.find((f) => f.key === statusFilter)?.label || "") : ""}`}'''
new7 = '''            filename={`entitlements_${selectedYear}_${selectedMonths.length === 0 ? "all" : selectedMonths.slice().sort((a, b) => a - b).join("-")}${statusFilter !== "all" ? "_" + statusFilter : ""}`}
            title={`جدول الاستحقاقات - ${selectedMonthsLabelFull()} ${selectedYear} هـ${statusFilter !== "all" ? " - " + (STATUS_FILTERS.find((f) => f.key === statusFilter)?.label || "") : ""}`}'''
replacements.append((old7, new7))

for i, (old, new) in enumerate(replacements, 1):
    count = content.count(old)
    assert count == 1, f"replacement #{i} matched {count} times (expected 1)"
    content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل Entitlements.jsx بنجاح ✅")