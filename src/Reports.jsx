import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function Reports({ onBack }) {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeReport, setActiveReport] = useState("occupancy");

  useEffect(() => {
    supabase.from("properties").select("*").then(({ data }) => setProperties(data || []));
    supabase.from("units").select("*").then(({ data }) => setUnits(data || []));
    supabase.from("tenants").select("*").then(({ data }) => setTenants(data || []));
    supabase.from("leases").select("*").then(({ data }) => setLeases(data || []));
    supabase.from("payments").select("*").then(({ data }) => setPayments(data || []));
  }, []);

  const today = new Date();

  const occupancyData = properties.map(p => {
    const propUnits = units.filter(u => u.property_id === p.id);
    const rented = propUnits.filter(u => u.status === "مؤجرة").length;
    const total = propUnits.length;
    const pct = total ? Math.round((rented / total) * 100) : 0;
    return { ...p, rented, total, pct };
  });

  const revenueByProperty = properties.map(p => {
    const propUnits = units.filter(u => u.property_id === p.id);
    const propUnitIds = propUnits.map(u => u.id);
    const propLeases = leases.filter(l => propUnitIds.includes(l.unit_id) && l.status === "نشط");
    const annual = propLeases.reduce((s, l) => s + Number(l.rent_amount), 0);
    return { ...p, annual };
  });

  const totalRevenue = revenueByProperty.reduce((s, p) => s + p.annual, 0);

  const expiringLeases = leases.filter(l => {
    const end = new Date(l.end_date);
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 90;
  }).map(l => {
    const tenant = tenants.find(t => t.id === l.tenant_id);
    const unit = units.find(u => u.id === l.unit_id);
    const prop = unit ? properties.find(p => p.id === unit.property_id) : null;
    const daysLeft = Math.ceil((new Date(l.end_date) - today) / (1000 * 60 * 60 * 24));
    return { ...l, tenantName: tenant?.name, tenantPhone: tenant?.phone, unitNumber: unit?.unit_number, propName: prop?.name, daysLeft };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  const vacantUnits = units.filter(u => u.status !== "مؤجرة").map(u => {
    const prop = properties.find(p => p.id === u.property_id);
    return { ...u, propName: prop?.name };
  });

  const btnStyle = (key) => ({
    padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontFamily: "Tahoma, Arial, sans-serif", fontSize: "13px",
    background: activeReport === key ? "#1B4D7A" : "#e0e7ef",
    color: activeReport === key ? "#fff" : "#1B4D7A",
  });

  const thStyle = { padding: "10px 12px", textAlign: "center" };
  const tdStyle = { padding: "10px 12px", textAlign: "center", borderBottom: "1px solid #e0e7ef" };
  const tableWrap = { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" };
  const thead = { background: "#1B4D7A", color: "#fff" };

  return (
    <div style={{ padding: "32px", fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "8px 20px", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}>رجوع</button>
        <h2 style={{ color: "#1B4D7A", margin: 0 }}>التقارير</h2>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        <button style={btnStyle("occupancy")} onClick={() => setActiveReport("occupancy")}>نسبة الاشغال</button>
        <button style={btnStyle("expiring")} onClick={() => setActiveReport("expiring")}>عقود تنتهي قريبا</button>
        <button style={btnStyle("vacant")} onClick={() => setActiveReport("vacant")}>الوحدات الشاغرة</button>
        <button style={btnStyle("revenue")} onClick={() => setActiveReport("revenue")}>الايرادات بالعقار</button>
      </div>

      {activeReport === "occupancy" && (
        <table style={tableWrap}>
          <thead style={thead}>
            <tr>
              <th style={thStyle}>العقار</th>
              <th style={thStyle}>مؤجرة</th>
              <th style={thStyle}>الاجمالي</th>
              <th style={thStyle}>نسبة الاشغال</th>
            </tr>
          </thead>
          <tbody>
            {occupancyData.map(p => (
              <tr key={p.id}>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>{p.rented}</td>
                <td style={tdStyle}>{p.total}</td>
                <td style={tdStyle}>{p.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeReport === "expiring" && (
        <table style={tableWrap}>
          <thead style={thead}>
            <tr>
              <th style={thStyle}>المستاجر</th>
              <th style={thStyle}>الجوال</th>
              <th style={thStyle}>العقار</th>
              <th style={thStyle}>الوحدة</th>
              <th style={thStyle}>تاريخ الانتهاء</th>
              <th style={thStyle}>الايام المتبقية</th>
            </tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      )}

      {activeReport === "vacant" && (
        <table style={tableWrap}>
          <thead style={thead}>
            <tr>
              <th style={thStyle}>العقار</th>
              <th style={thStyle}>رقم الوحدة</th>
              <th style={thStyle}>النوع</th>
              <th style={thStyle}>الايجار الشهري</th>
            </tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      )}

      {activeReport === "revenue" && (
        <table style={tableWrap}>
          <thead style={thead}>
            <tr>
              <th style={thStyle}>العقار</th>
              <th style={thStyle}>الايراد السنوي</th>
            </tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      )}
    </div>
  );
}


