# -*- coding: utf-8 -*-
FILE = "src/ViewerLayout.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''            <h3 style={{ color: "#1B4D7A", marginBottom: "16px" }}>{selectedProperty.name} — {selectedProperty.address}</h3>
            <div id="property-units-table">
              <ExportToolbar
                data={propertyUnits.map(u => ({ unitNumber: u.unit_number || "—", unitType: u.unit_type || "—", status: u.status || "—" }))}
                columns={[
                  { key: "unitNumber", label: "رقم الوحدة" },
                  { key: "unitType", label: "النوع" },
                  { key: "status", label: "الحالة" },
                ]}
                filename={`property_${selectedProperty.name || "units"}`}
                title={`تقرير وحدات ${selectedProperty.name || ""}`}
              />
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                  <tr>
                    <th style={{ padding: "12px" }}>رقم الوحدة</th>
                    <th style={{ padding: "12px" }}>النوع</th>
                    <th style={{ padding: "12px" }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyUnits.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد وحدات</td></tr>
                  ) : propertyUnits.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                      <td style={{ padding: "12px" }}>{u.unit_number}</td>
                      <td style={{ padding: "12px" }}>{unitTypeBadge(u.unit_type, "")}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          padding: "4px 12px", borderRadius: "20px", fontSize: "13px",
                          background: u.status === "مؤجرة" ? "#d4edda" : "#fff3cd",
                          color: u.status === "مؤجرة" ? "#155724" : "#856404"
                        }}>{u.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>'''

new_block = '''            <h3 style={{ color: "#1B4D7A", marginBottom: "4px" }}>{selectedProperty.name}</h3>
            <p style={{ color: "#888", margin: "0 0 20px" }}>{selectedProperty.address}</p>

            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              {[
                { label: "إجمالي الوحدات", value: propertyUnits.length, color: "#1B4D7A", icon: "🏢" },
                { label: "مؤجرة", value: propertyUnits.filter(u => u.status === "مؤجرة").length, color: "#166534", icon: "✅" },
                { label: "شاغرة", value: propertyUnits.filter(u => u.status === "شاغرة").length, color: "#854d0e", icon: "🕓" },
                { label: "صيانة", value: propertyUnits.filter(u => u.status === "صيانة").length, color: "#991b1b", icon: "🔧" },
              ].map(c => (
                <div key={c.label} style={{
                  flex: "1 1 180px",
                  background: "#fff",
                  border: `1px solid ${c.color}33`,
                  borderTop: `4px solid ${c.color}`,
                  borderRadius: 14,
                  padding: "18px 22px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
                </div>
              ))}
            </div>

            <div id="property-units-table">
              <ExportToolbar
                data={propertyUnits.map(u => ({ unitNumber: u.unit_number || "—", unitType: u.unit_type || "—", status: u.status || "—" }))}
                columns={[
                  { key: "unitNumber", label: "رقم الوحدة" },
                  { key: "unitType", label: "النوع" },
                  { key: "status", label: "الحالة" },
                ]}
                filename={`property_${selectedProperty.name || "units"}`}
                title={`تقرير وحدات ${selectedProperty.name || ""}`}
              />
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                  <tr>
                    <th style={{ padding: "14px 16px" }}>رقم الوحدة</th>
                    <th style={{ padding: "14px 16px" }}>النوع</th>
                    <th style={{ padding: "14px 16px" }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {propertyUnits.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد وحدات</td></tr>
                  ) : propertyUnits.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "14px 16px" }}>{u.unit_number}</td>
                      <td style={{ padding: "14px 16px" }}>{unitTypeBadge(u.unit_type, "")}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          padding: "4px 12px", borderRadius: "20px", fontSize: "13px",
                          background: u.status === "مؤجرة" ? "#d4edda" : "#fff3cd",
                          color: u.status === "مؤجرة" ? "#155724" : "#856404"
                        }}>{u.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>'''

if old_block not in content:
    raise SystemExit("PATCH FAILED: block not found — file may have changed, aborting safely.")
content = content.replace(old_block, new_block)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل ViewerLayout.jsx بنجاح — تفاصيل العقار")
