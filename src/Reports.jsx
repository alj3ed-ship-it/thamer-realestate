import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import ExportToolbar from "./components/ExportToolbar";

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

  function normalizeArabic(str) {
    return (str || "")
      .replace(/[إأآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  }

  function getPropertyPriority(name) {
    const n = normalizeArabic(name);
    if (!n) return 99;
    if (n.includes("سلمان") && !n.includes("عبدالله")) return 1;
    if (n.includes("براهيم")) return 2;
    if (n.includes("عبدالله الكبيره")) return 3;
    if (n.includes("عبدالله الصغيره")) return 4;
    return 99;
  }

  const sortedProperties = [...properties].sort((a, b) => {
    const pa = getPropertyPriority(a.name);
    const pb = getPropertyPriority(b.name);
    if (pa !== pb) return pa - pb;
    return (a.name || "").localeCompare(b.name || "", "ar");
  });

  const occupancyData = sortedProperties.map(p => {
    const propUnits = units.filter(u => u.property_id === p.id);
    const rented = propUnits.filter(u => u.status === "مؤجرة").length;
    const total = propUnits.length;
    const pct = total ? Math.round((rented / total) * 100) : 0;
    return { ...p, rented, total, pct };
  });

  // نعتبر العقد "فعّال" إذا كانت حالته active صراحة، أو إذا كانت حالته فاضية (بعض
  // العقود المضافة من فورم "إضافة عقد جديد" لا تحفظ عمود status أصلاً) —
  // هذا يمنع تكرار مشكلة عدم احتساب عقود جديدة بتقرير الإيرادات
  const revenueByProperty = sortedProperties.map(p => {
    const propUnits = units.filter(u => u.property_id === p.id);
    const propUnitIds = propUnits.map(u => u.id);
    const propLeases = leases.filter(l => l.property_id === p.id && (l.status === "active" || l.status === "نشط" || !l.status));
    const annual = propLeases.reduce((s, l) => s + Number(l.rent_amount || 0), 0);
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
    return { ...u, propName: prop?.name, propPriority: getPropertyPriority(prop?.name) };
  }).sort((a, b) => a.propPriority - b.propPriority || (a.propName || "").localeCompare(b.propName || "", "ar"));

  const btnStyle = (key) => ({
    padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontFamily: "Tahoma, Arial, sans-serif", fontSize: "13px",
    background: activeReport === key ? "#1B4D7A" : "#e0e7ef",
    color: activeReport === key ? "#fff" : "#1B4D7A",
  });

  const thStyle = { padding: "14px 16px", textAlign: "center", fontWeight: 600, fontSize: 13.5 };
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
  }

  // بيانات وأعمدة التصدير حسب التقرير النشط حالياً
  const reportConfig = {
    occupancy: {
      title: "تقرير نسبة الإشغال",
      filename: "occupancy_report",
      columns: [
        { key: "name", label: "العقار" },
        { key: "rented", label: "مؤجرة" },
        { key: "total", label: "الإجمالي" },
        { key: "pct", label: "نسبة الإشغال" },
      ],
      data: occupancyData.map(p => ({ name: p.name, rented: p.rented, total: p.total, pct: `${p.pct}%` })),
    },
    expiring: {
      title: "تقرير العقود المنتهية قريباً",
      filename: "expiring_leases_report",
      columns: [
        { key: "tenantName", label: "المستأجر" },
        { key: "tenantPhone", label: "الجوال" },
        { key: "propName", label: "العقار" },
        { key: "unitNumber", label: "الوحدة" },
        { key: "endDate", label: "تاريخ الانتهاء" },
        { key: "daysLeft", label: "الأيام المتبقية" },
      ],
      data: expiringLeases.map(l => ({
        tenantName: l.tenantName || "—",
        tenantPhone: l.tenantPhone || "—",
        propName: l.propName || "—",
        unitNumber: l.unitNumber || "—",
        endDate: l.end_date || "—",
        daysLeft: `${l.daysLeft} يوم`,
      })),
    },
    vacant: {
      title: "تقرير الوحدات الشاغرة",
      filename: "vacant_units_report",
      columns: [
        { key: "propName", label: "العقار" },
        { key: "unitNumber", label: "رقم الوحدة" },
        { key: "unitType", label: "النوع" },
        { key: "rent", label: "الإيجار الشهري" },
      ],
      data: vacantUnits.map(u => ({
        propName: u.propName || "—",
        unitNumber: u.unit_number || "—",
        unitType: u.unit_type || "—",
        rent: u.monthly_rent ? `${u.monthly_rent} ر.س` : "—",
      })),
    },
    revenue: {
      title: "تقرير الإيرادات بالعقار",
      filename: "revenue_report",
      columns: [
        { key: "name", label: "العقار" },
        { key: "annual", label: "الإيراد السنوي" },
      ],
      data: [
        ...revenueByProperty.map(p => ({ name: p.name, annual: `${p.annual.toLocaleString()} ر.س` })),
        { name: "الإجمالي", annual: `${totalRevenue.toLocaleString()} ر.س` },
      ],
    },
  };

  const currentConfig = reportConfig[activeReport];

  return (
    <div style={{ padding: "32px", fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button onClick={onBack} style={{ padding: "8px 20px", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}>رجوع</button>
        <h2 style={{ color: "#1B4D7A", margin: 0 }}>التقارير</h2>
      </div>
      <div className="no-print" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        <button style={btnStyle("occupancy")} onClick={() => setActiveReport("occupancy")}>نسبة الاشغال</button>
        <button style={btnStyle("expiring")} onClick={() => setActiveReport("expiring")}>عقود تنتهي قريبا</button>
        <button style={btnStyle("vacant")} onClick={() => setActiveReport("vacant")}>الوحدات الشاغرة</button>
        <button style={btnStyle("revenue")} onClick={() => setActiveReport("revenue")}>الايرادات بالعقار</button>
      </div>

      <div id="reports-table">
        <ExportToolbar
          data={currentConfig.data}
          columns={currentConfig.columns}
          filename={currentConfig.filename}
          title={currentConfig.title}
        />

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
              {occupancyData.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle(i), fontWeight: 600, color: "#1B4D7A" }}>{p.name}</td>
                  <td style={tdStyle(i)}>{p.rented}</td>
                  <td style={tdStyle(i)}>{p.total}</td>
                  <td style={tdStyle(i)}>{occupancyBadge(p.pct)}</td>
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
              ) : vacantUnits.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ ...tdStyle(i), fontWeight: 600, color: "#1B4D7A" }}>{u.propName}</td>
                  <td style={tdStyle(i)}>{u.unit_number}</td>
                  <td style={tdStyle(i)}>{u.unit_type}</td>
                  <td style={tdStyle(i)}>{u.monthly_rent} ر.س</td>
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
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}