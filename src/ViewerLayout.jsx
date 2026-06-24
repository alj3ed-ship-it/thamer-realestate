import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function ViewerLayout() {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [activePage, setActivePage] = useState("properties");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  useEffect(() => {
    supabase.from("properties").select("*").then(({ data }) => setProperties(data || []));
    supabase.from("units").select("*").then(({ data }) => setUnits(data || []));
    supabase.from("tenants").select("*").then(({ data }) => setTenants(data || []));
    supabase.from("leases").select("*").then(({ data }) => setLeases(data || []));
  }, []);

  const navStyle = (page) => ({
    padding: "10px 20px", cursor: "pointer", borderRadius: "8px",
    background: activePage === page ? "#1B4D7A" : "transparent",
    color: activePage === page ? "#fff" : "#1B4D7A",
    border: "none", fontSize: "15px", fontFamily: "Tahoma, Arial, sans-serif"
  });

  const propertyUnits = selectedProperty ? units.filter(u => u.property_id === selectedProperty.id) : [];
  const tenantLeases = selectedTenant ? leases.filter(l => l.tenant_id === selectedTenant.id) : [];

  const getUnitNumber = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit ? unit.unit_number : "-";
  };

  const getPropertyName = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit) return "-";
    const prop = properties.find(p => p.id === unit.property_id);
    return prop ? prop.name : "-";
  };

  const rowStyle = {
    borderBottom: "1px solid #e0e7ef", textAlign: "center", cursor: "pointer"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ background: "#1B4D7A", padding: "16px 32px", display: "flex", alignItems: "center", gap: "16px" }}>
        <img src="/logo_v6_wide.svg" alt="شعار" style={{ height: "40px" }} />
        <span style={{ color: "#F5D98C", fontSize: "18px", fontWeight: "bold" }}>مكتب ثامر بن سلمان العقاري — عرض</span>
      </div>

      <div style={{ background: "#fff", padding: "12px 32px", display: "flex", gap: "8px", borderBottom: "1px solid #e0e7ef" }}>
        <button style={navStyle("properties")} onClick={() => { setActivePage("properties"); setSelectedProperty(null); setSelectedTenant(null); }}>العقارات</button>
        <button style={navStyle("units")} onClick={() => { setActivePage("units"); setSelectedProperty(null); setSelectedTenant(null); }}>الوحدات</button>
        <button style={navStyle("tenants")} onClick={() => { setActivePage("tenants"); setSelectedProperty(null); setSelectedTenant(null); }}>المستأجرون</button>
        <button style={navStyle("leases")} onClick={() => { setActivePage("leases"); setSelectedProperty(null); setSelectedTenant(null); }}>العقود</button>
      </div>

      <div style={{ padding: "32px" }}>

        {/* تفاصيل عقار */}
        {selectedProperty && (
          <div>
            <button onClick={() => setSelectedProperty(null)} style={{
              marginBottom: "16px", padding: "8px 20px", background: "#1B4D7A", color: "#fff",
              border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif"
            }}>← رجوع للعقارات</button>
            <h3 style={{ color: "#1B4D7A", marginBottom: "16px" }}>{selectedProperty.name} — {selectedProperty.address}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
              <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                <tr>
                  <th style={{ padding: "12px" }}>رقم الوحدة</th>
                  <th style={{ padding: "12px" }}>النوع</th>
                  <th style={{ padding: "12px" }}>الدور</th>
                  <th style={{ padding: "12px" }}>الإيجار الشهري</th>
                  <th style={{ padding: "12px" }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {propertyUnits.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد وحدات</td></tr>
                ) : propertyUnits.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                    <td style={{ padding: "12px" }}>{u.unit_number}</td>
                    <td style={{ padding: "12px" }}>{u.unit_type}</td>
                    <td style={{ padding: "12px" }}>{u.floor}</td>
                    <td style={{ padding: "12px" }}>{u.monthly_rent} ر.س</td>
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
          </div>
        )}

        {/* تفاصيل مستأجر */}
        {selectedTenant && (
          <div>
            <button onClick={() => setSelectedTenant(null)} style={{
              marginBottom: "16px", padding: "8px 20px", background: "#1B4D7A", color: "#fff",
              border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif"
            }}>← رجوع للمستأجرين</button>
            <h3 style={{ color: "#1B4D7A", marginBottom: "16px" }}>{selectedTenant.name} — {selectedTenant.phone}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
              <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                <tr>
                  <th style={{ padding: "12px" }}>العقار</th>
                  <th style={{ padding: "12px" }}>رقم الوحدة</th>
                  <th style={{ padding: "12px" }}>تاريخ البداية</th>
                  <th style={{ padding: "12px" }}>تاريخ النهاية</th>
                  <th style={{ padding: "12px" }}>مبلغ الإيجار</th>
                  <th style={{ padding: "12px" }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {tenantLeases.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد عقود</td></tr>
                ) : tenantLeases.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                    <td style={{ padding: "12px" }}>{getPropertyName(l.unit_id)}</td>
                    <td style={{ padding: "12px" }}>{getUnitNumber(l.unit_id)}</td>
                    <td style={{ padding: "12px" }}>{l.start_date}</td>
                    <td style={{ padding: "12px" }}>{l.end_date}</td>
                    <td style={{ padding: "12px" }}>{l.rent_amount} ر.س</td>
                    <td style={{ padding: "12px" }}>{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!selectedProperty && !selectedTenant && (
          <>
            {activePage === "properties" && (
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                  <tr>
                    <th style={{ padding: "12px" }}>اسم العقار</th>
                    <th style={{ padding: "12px" }}>العنوان</th>
                    <th style={{ padding: "12px" }}>عدد الوحدات</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map(p => (
                    <tr key={p.id} onClick={() => setSelectedProperty(p)} style={rowStyle}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f4f8"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "12px", color: "#1B4D7A", fontWeight: "bold" }}>{p.name}</td>
                      <td style={{ padding: "12px" }}>{p.address}</td>
                      <td style={{ padding: "12px" }}>{p.total_units}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activePage === "units" && (
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                  <tr>
                    <th style={{ padding: "12px" }}>رقم الوحدة</th>
                    <th style={{ padding: "12px" }}>النوع</th>
                    <th style={{ padding: "12px" }}>الإيجار الشهري</th>
                    <th style={{ padding: "12px" }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                      <td style={{ padding: "12px" }}>{u.unit_number}</td>
                      <td style={{ padding: "12px" }}>{u.unit_type}</td>
                      <td style={{ padding: "12px" }}>{u.monthly_rent} ر.س</td>
                      <td style={{ padding: "12px" }}>{u.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activePage === "tenants" && (
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                  <tr>
                    <th style={{ padding: "12px" }}>الاسم</th>
                    <th style={{ padding: "12px" }}>الجوال</th>
                    <th style={{ padding: "12px" }}>رقم الهوية</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} onClick={() => setSelectedTenant(t)} style={rowStyle}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f4f8"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "12px", color: "#1B4D7A", fontWeight: "bold" }}>{t.name}</td>
                      <td style={{ padding: "12px" }}>{t.phone}</td>
                      <td style={{ padding: "12px" }}>{t.national_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activePage === "leases" && (
              <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                  <tr>
                    <th style={{ padding: "12px" }}>تاريخ البداية</th>
                    <th style={{ padding: "12px" }}>تاريخ النهاية</th>
                    <th style={{ padding: "12px" }}>مبلغ الإيجار</th>
                    <th style={{ padding: "12px" }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {leases.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                      <td style={{ padding: "12px" }}>{l.start_date}</td>
                      <td style={{ padding: "12px" }}>{l.end_date}</td>
                      <td style={{ padding: "12px" }}>{l.rent_amount} ر.س</td>
                      <td style={{ padding: "12px" }}>{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

