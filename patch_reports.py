# -*- coding: utf-8 -*-
FILE = "src/Reports.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Add property priority helper + sort properties before building report data
old_today = '''  const today = new Date();

  const occupancyData = properties.map(p => {'''

new_today = '''  const today = new Date();

  function getPropertyPriority(name) {
    if (!name) return 99;
    if (name.includes("سلمان") && !name.includes("عبدالله")) return 1;
    if (name.includes("إبراهيم")) return 2;
    if (name.includes("عبدالله الكبيرة")) return 3;
    if (name.includes("عبدالله الصغيرة")) return 4;
    return 99;
  }

  const sortedProperties = [...properties].sort((a, b) => {
    const pa = getPropertyPriority(a.name);
    const pb = getPropertyPriority(b.name);
    if (pa !== pb) return pa - pb;
    return (a.name || "").localeCompare(b.name || "", "ar");
  });

  const occupancyData = sortedProperties.map(p => {'''

if old_today not in content:
    raise SystemExit("PATCH FAILED: today/occupancyData block not found — aborting safely.")
content = content.replace(old_today, new_today)

old_revenue = '''  const revenueByProperty = properties.map(p => {'''
new_revenue = '''  const revenueByProperty = sortedProperties.map(p => {'''
if old_revenue not in content:
    raise SystemExit("PATCH FAILED: revenueByProperty block not found — aborting safely.")
content = content.replace(old_revenue, new_revenue)

old_vacant = '''  const vacantUnits = units.filter(u => u.status !== "مؤجرة").map(u => {
    const prop = properties.find(p => p.id === u.property_id);
    return { ...u, propName: prop?.name };
  });'''
new_vacant = '''  const vacantUnits = units.filter(u => u.status !== "مؤجرة").map(u => {
    const prop = properties.find(p => p.id === u.property_id);
    return { ...u, propName: prop?.name, propPriority: getPropertyPriority(prop?.name) };
  }).sort((a, b) => a.propPriority - b.propPriority || (a.propName || "").localeCompare(b.propName || "", "ar"));'''
if old_vacant not in content:
    raise SystemExit("PATCH FAILED: vacantUnits block not found — aborting safely.")
content = content.replace(old_vacant, new_vacant)

# 2) Redesign shared table style tokens (zebra-ready cell padding + shadow wrapper)
old_styles = '''  const thStyle = { padding: "10px 12px", textAlign: "center" };
  const tdStyle = { padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e0e7ef" };
  const tableWrap = { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" };
  const thead = { background: "#1B4D7A", color: "#fff" };'''

new_styles = '''  const thStyle = { padding: "14px 16px", textAlign: "center", fontWeight: 600, fontSize: 13.5 };
  const tdStyle = (i) => ({ padding: "14px 16px", textAlign: "center", borderBottom: "1px solid #e0e7ef", background: i % 2 === 0 ? "#fff" : "#f9fafb" });
  const tableWrap = { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" };
  const thead = { background: "#1B4D7A", color: "#fff" };

  function occupancyBadge(pct) {
    const color = pct >= 90 ? "#166534" : pct >= 60 ? "#854d0e" : "#991b1b";
    const bg = pct >= 90 ? "#dcfce7" : pct >= 60 ? "#fef9c3" : "#fee2e2";
    return (
      <span style={{ background: bg, color, padding: "4px 14px", borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
        {pct}%
      </span>
    );
  }'''

if old_styles not in content:
    raise SystemExit("PATCH FAILED: styles block not found — aborting safely.")
content = content.replace(old_styles, new_styles)

# 3) Update table bodies to use tdStyle(i) with zebra index, and occupancy badge
old_occ_body = '''            <tbody>
              {occupancyData.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.rented}</td>
                  <td style={tdStyle}>{p.total}</td>
                  <td style={tdStyle}>{p.pct}%</td>
                </tr>
              ))}
            </tbody>'''
new_occ_body = '''            <tbody>
              {occupancyData.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle(i), fontWeight: 600, color: "#1B4D7A" }}>{p.name}</td>
                  <td style={tdStyle(i)}>{p.rented}</td>
                  <td style={tdStyle(i)}>{p.total}</td>
                  <td style={tdStyle(i)}>{occupancyBadge(p.pct)}</td>
                </tr>
              ))}
            </tbody>'''
if old_occ_body not in content:
    raise SystemExit("PATCH FAILED: occupancy tbody not found — aborting safely.")
content = content.replace(old_occ_body, new_occ_body)

old_exp_body = '''            <tbody>
              {expiringLeases.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد عقود تنتهي خلال 90 يوم</td></tr>
              ) : expiringLeases.map(l => (
                <tr key={l.id}>
                  <td style={tdStyle}>{l.tenantName}</td>
                  <td style={tdStyle}>{l.tenantPhone}</td>
                  <td style={tdStyle}>{l.propName}</td>
                  <td style={tdStyle}>{l.unitNumber}</td>
                  <td style={tdStyle}>{l.end_date}</td>
                  <td style={tdStyle}>{l.daysLeft} يوم</td>
                </tr>
              ))}
            </tbody>'''
new_exp_body = '''            <tbody>
              {expiringLeases.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد عقود تنتهي خلال 90 يوم</td></tr>
              ) : expiringLeases.map((l, i) => (
                <tr key={l.id}>
                  <td style={{ ...tdStyle(i), fontWeight: 600, color: "#1B4D7A" }}>{l.tenantName}</td>
                  <td style={tdStyle(i)}>{l.tenantPhone}</td>
                  <td style={tdStyle(i)}>{l.propName}</td>
                  <td style={tdStyle(i)}>{l.unitNumber}</td>
                  <td style={tdStyle(i)}>{l.end_date}</td>
                  <td style={tdStyle(i)}>
                    <span style={{
                      background: l.daysLeft <= 30 ? "#fee2e2" : "#fef9c3",
                      color: l.daysLeft <= 30 ? "#991b1b" : "#854d0e",
                      padding: "4px 12px", borderRadius: 20, fontWeight: 700, fontSize: 12.5
                    }}>{l.daysLeft} يوم</span>
                  </td>
                </tr>
              ))}
            </tbody>'''
if old_exp_body not in content:
    raise SystemExit("PATCH FAILED: expiring tbody not found — aborting safely.")
content = content.replace(old_exp_body, new_exp_body)

old_vac_body = '''            <tbody>
              {vacantUnits.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد وحدات شاغرة</td></tr>
              ) : vacantUnits.map(u => (
                <tr key={u.id}>
                  <td style={tdStyle}>{u.propName}</td>
                  <td style={tdStyle}>{u.unit_number}</td>
                  <td style={tdStyle}>{u.unit_type}</td>
                  <td style={tdStyle}>{u.monthly_rent} ر.س</td>
                </tr>
              ))}
            </tbody>'''
new_vac_body = '''            <tbody>
              {vacantUnits.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد وحدات شاغرة</td></tr>
              ) : vacantUnits.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ ...tdStyle(i), fontWeight: 600, color: "#1B4D7A" }}>{u.propName}</td>
                  <td style={tdStyle(i)}>{u.unit_number}</td>
                  <td style={tdStyle(i)}>{u.unit_type}</td>
                  <td style={tdStyle(i)}>{u.monthly_rent} ر.س</td>
                </tr>
              ))}
            </tbody>'''
if old_vac_body not in content:
    raise SystemExit("PATCH FAILED: vacant tbody not found — aborting safely.")
content = content.replace(old_vac_body, new_vac_body)

old_rev_body = '''            <tbody>
              {revenueByProperty.map(p => (
                <tr key={p.id}>
                  <td style={tdStyle}>{p.name}</td>
                  <td style={tdStyle}>{p.annual.toLocaleString()} ر.س</td>
                </tr>
              ))}
              <tr style={{ background: "#f0f4f8", fontWeight: "bold" }}>
                <td style={tdStyle}>الاجمالي</td>
                <td style={tdStyle}>{totalRevenue.toLocaleString()} ر.س</td>
              </tr>
            </tbody>'''
new_rev_body = '''            <tbody>
              {revenueByProperty.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle(i), fontWeight: 600, color: "#1B4D7A" }}>{p.name}</td>
                  <td style={{ ...tdStyle(i), fontWeight: 700, color: "#166534" }}>{p.annual.toLocaleString()} ر.س</td>
                </tr>
              ))}
              <tr style={{ background: "#eff6ff" }}>
                <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 800, color: "#1B4D7A" }}>الاجمالي</td>
                <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 800, color: "#1B4D7A" }}>{totalRevenue.toLocaleString()} ر.س</td>
              </tr>
            </tbody>'''
if old_rev_body not in content:
    raise SystemExit("PATCH FAILED: revenue tbody not found — aborting safely.")
content = content.replace(old_rev_body, new_rev_body)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل Reports.jsx بنجاح")
