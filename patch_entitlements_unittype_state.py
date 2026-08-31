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

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تطبيق تعديلات الـ state والمنطق بنجاح")