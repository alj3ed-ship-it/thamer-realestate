path = r"src\Leases.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  function unitsCell(leaseId) {
    const objs = getLeaseUnitObjs(leaseId);
    if (objs.length === 0) return "—";
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {objs.map(u => {
          const excluded = isUnitExcluded(leaseId, u.id);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => { if (!isReadOnly) toggleUnitExclusion(leaseId, u.id); }}
              title={excluded ? "مستثناة من فرز النوع — اضغط لإرجاعها" : "اضغط لاستثنائها من فرز النوع"}
              style={{
                border: excluded ? "1px dashed #9ca3af" : "1px solid #ddd6fe",
                background: excluded ? "#f3f4f6" : "#efe9fe",
                color: excluded ? "#9ca3af" : "#7c3aed",
                padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
                textDecoration: excluded ? "line-through" : "none",
                fontFamily: "Cairo, sans-serif",
              }}>
              {u.unit_number} {u.unit_type}{excluded ? " 🚫" : ""}
            </button>
          );
        })}
      </div>
    );
  }"""

new = """  function getUnitTypeColors(unitType) {
    const t = (unitType || "").trim();
    if (t === "محل") return { border: "#AED6F1", background: "#EBF5FB", color: "#2E86C1" };
    if (t === "شقة") return { border: "#D2B4DE", background: "#F4ECF7", color: "#8E44AD" };
    return { border: "#F5CBA7", background: "#FEF5E7", color: "#D68910" };
  }

  function unitsCell(leaseId) {
    const objs = getLeaseUnitObjs(leaseId);
    if (objs.length === 0) return "—";
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {objs.map(u => {
          const excluded = isUnitExcluded(leaseId, u.id);
          const colors = getUnitTypeColors(u.unit_type);
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => { if (!isReadOnly) toggleUnitExclusion(leaseId, u.id); }}
              title={excluded ? "مستثناة من فرز النوع — اضغط لإرجاعها" : "اضغط لاستثنائها من فرز النوع"}
              style={{
                border: excluded ? "1px dashed #9ca3af" : `1px solid ${colors.border}`,
                background: excluded ? "#f3f4f6" : colors.background,
                color: excluded ? "#9ca3af" : colors.color,
                padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
                textDecoration: excluded ? "line-through" : "none",
                fontFamily: "Cairo, sans-serif",
              }}>
              {u.unit_number} {u.unit_type}{excluded ? " 🚫" : ""}
            </button>
          );
        })}
      </div>
    );
  }"""

assert content.count(old) == 1, "unitsCell block not found"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تلوين شارات الوحدات حسب النوع ✓")