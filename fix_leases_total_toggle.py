path = r"src\Leases.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة state للتبديل بعد filterUnitType
old_state = """  const [filterUnitType, setFilterUnitType] = useState("");"""
new_state = """  const [filterUnitType, setFilterUnitType] = useState("");
  const [totalsMode, setTotalsMode] = useState("net"); // 'net' = صافي بدون ضريبة | 'gross' = شامل الضريبة"""
assert content.count(old_state) == 1, "state block not found"
content = content.replace(old_state, new_state)

# 2) إضافة دالة الإجمالي الشامل بجانب getNetRentAmount
old_func = """  function getNetRentAmount(lease) {
    const amt = Number(lease.rent_amount || 0);
    if (lease.tax_enabled && lease.amount_includes_vat) {
      return Math.round(amt / 1.15);
    }
    return amt;
  }

  const totalAmount = filteredLeases.reduce((sum, l) => sum + getNetRentAmount(l), 0);"""

new_func = """  function getNetRentAmount(lease) {
    const amt = Number(lease.rent_amount || 0);
    if (lease.tax_enabled && lease.amount_includes_vat) {
      return Math.round(amt / 1.15);
    }
    return amt;
  }

  // الإجمالي الشامل للضريبة: للعقود الشاملة أصلاً = نفس المبلغ، وللعقود غير الشاملة (الضريبة تُضاف فوق) = المبلغ + 15%
  function getGrossRentAmount(lease) {
    const amt = Number(lease.rent_amount || 0);
    if (!lease.tax_enabled) return amt;
    if (lease.amount_includes_vat) return amt;
    return Math.round(amt * 1.15);
  }

  const totalAmountNet = filteredLeases.reduce((sum, l) => sum + getNetRentAmount(l), 0);
  const totalAmountGross = filteredLeases.reduce((sum, l) => sum + getGrossRentAmount(l), 0);
  const totalAmount = totalsMode === "gross" ? totalAmountGross : totalAmountNet;"""

assert content.count(old_func) == 1, "getNetRentAmount block not found"
content = content.replace(old_func, new_func)

# 3) تحديث exportStats ليعكس الوضع المختار
old_stats = """  const exportStats = [
    { label: "عدد العقود", value: filteredLeases.length, color: "#1B4D7A" },
    { label: "الإجمالي (صافي بدون ضريبة)", value: `${totalAmount.toLocaleString()} ريال`, color: "#1d4ed8" },
  ];"""

new_stats = """  const exportStats = [
    { label: "عدد العقود", value: filteredLeases.length, color: "#1B4D7A" },
    {
      label: totalsMode === "gross" ? "الإجمالي (شامل الضريبة)" : "الإجمالي (صافي بدون ضريبة)",
      value: `${totalAmount.toLocaleString()} ريال`,
      color: "#1d4ed8"
    },
  ];"""

assert content.count(old_stats) == 1, "exportStats block not found"
content = content.replace(old_stats, new_stats)

# 4) تحديث شريط الإجمالي بإضافة زر التبديل
old_bar = """      {!loading && (
        <div className="no-print" style={{
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
          padding: "14px 20px", marginBottom: 20, display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
        }}>
          <span style={{ color: "#374151", fontSize: 14 }}>
            عدد العقود الظاهرة: <strong>{filteredLeases.length}</strong>
          </span>
          <span style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 18 }}>
            الإجمالي (صافي بدون ضريبة): {totalAmount.toLocaleString()} ريال
          </span>
        </div>
      )}"""

new_bar = """      {!loading && (
        <div className="no-print" style={{
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
          padding: "14px 20px", marginBottom: 20, display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
        }}>
          <span style={{ color: "#374151", fontSize: 14 }}>
            عدد العقود الظاهرة: <strong>{filteredLeases.length}</strong>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #bfdbfe" }}>
              <button
                type="button"
                onClick={() => setTotalsMode("net")}
                style={{
                  padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "none",
                  background: totalsMode === "net" ? "#1d4ed8" : "#fff",
                  color: totalsMode === "net" ? "#fff" : "#1d4ed8",
                  fontFamily: "Cairo, sans-serif"
                }}>
                صافي
              </button>
              <button
                type="button"
                onClick={() => setTotalsMode("gross")}
                style={{
                  padding: "5px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: "none",
                  background: totalsMode === "gross" ? "#8e44ad" : "#fff",
                  color: totalsMode === "gross" ? "#fff" : "#8e44ad",
                  fontFamily: "Cairo, sans-serif"
                }}>
                شامل الضريبة
              </button>
            </div>
            <span style={{ color: totalsMode === "gross" ? "#8e44ad" : "#1d4ed8", fontWeight: 700, fontSize: 18 }}>
              الإجمالي ({totalsMode === "gross" ? "شامل الضريبة" : "صافي بدون ضريبة"}): {totalAmount.toLocaleString()} ريال
            </span>
          </div>
        </div>
      )}"""

assert content.count(old_bar) == 1, "totals bar block not found"
content = content.replace(old_bar, new_bar)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم إضافة زر تبديل صافي/شامل الضريبة ✓")