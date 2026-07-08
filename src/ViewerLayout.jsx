import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getUnitTypeColor } from "./theme";

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

const UNIT_TYPE_ORDER = { "محل": 1, "شقة": 2, "ورشة": 3 };

// ألوان ثابتة: لون واحد لكل "عقار" ولون واحد لكل "مستأجر" بكل الصفحات
const PROPERTY_BADGE_COLOR = { bg: "#EBF5FB", color: "#1B4D7A", border: "#AED6F1" };
const TENANT_BADGE_COLOR = { bg: "#F4ECF7", color: "#6C3483", border: "#D2B4DE" };

function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  if (!day || !month || !year) return null;
  return { year, month, day };
}

function addHijriMonths(date, months) {
  const totalMonths = date.year * 12 + (date.month - 1) + months;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1, day: date.day };
}

function computeInstallmentHijri(startDateHijri, totalInstallments, installmentNumber) {
  const start = parseHijri(startDateHijri);
  if (!start || !totalInstallments) return null;
  const intervalMonths = 12 / totalInstallments;
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths;
  return addHijriMonths(start, Math.round(monthsToAdd));
}

function unitTypeBadge(unitType, unitNumber) {
  const c = getUnitTypeColor(unitType);
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap",
    }}>
      {unitType} {unitNumber}
    </span>
  );
}

function propertyBadge(name) {
  if (!name) return "-";
  return (
    <span style={{
      background: PROPERTY_BADGE_COLOR.bg, color: PROPERTY_BADGE_COLOR.color,
      border: `1px solid ${PROPERTY_BADGE_COLOR.border}`,
      padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap",
    }}>
      {name}
    </span>
  );
}

function tenantBadge(name) {
  if (!name) return "-";
  return (
    <span style={{
      background: TENANT_BADGE_COLOR.bg, color: TENANT_BADGE_COLOR.color,
      border: `1px solid ${TENANT_BADGE_COLOR.border}`,
      padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap",
    }}>
      {name}
    </span>
  );
}

function searchInput(value, onChange, placeholder) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "بحث..."}
        style={{
          width: "100%", maxWidth: "320px", border: "1px solid #ddd", borderRadius: "8px",
          padding: "9px 14px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif",
          direction: "rtl", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export default function ViewerLayout() {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activePage, setActivePage] = useState("properties");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  // فلترة الاستحقاقات (شهر/سنة هجري)
  const [selectedYear, setSelectedYear] = useState("1448");
  const [selectedMonthNum, setSelectedMonthNum] = useState("1");
  const [entResults, setEntResults] = useState([]);
  const [entSearched, setEntSearched] = useState(false);

  // بحث نصي لكل تبويب
  const [searchProperties, setSearchProperties] = useState("");
  const [searchUnits, setSearchUnits] = useState("");
  const [searchTenants, setSearchTenants] = useState("");
  const [searchLeases, setSearchLeases] = useState("");
  const [searchEntitlements, setSearchEntitlements] = useState("");

  useEffect(() => {
    supabase.from("properties").select("*").order("priority").then(({ data }) => setProperties(data || []));
    supabase.from("units").select("*").then(({ data }) => setUnits(data || []));
    supabase.from("tenants").select("*").then(({ data }) => setTenants(data || []));
    supabase.from("leases").select(`
      *,
      properties ( name, priority ),
      lease_units ( units ( unit_number, unit_type ) )
    `).then(({ data }) => setLeases(data || []));
    supabase.from("payments").select(`
      id, lease_id, amount_due, amount_paid, installment_number, total_installments,
      leases (
        id, property_id, start_date_hijri,
        properties ( name, priority ),
        tenants ( name, note ),
        lease_units ( units ( unit_number, unit_type ) )
      )
    `).then(({ data }) => setPayments((data || []).filter((p) => p.leases)));
  }, []);

  const navStyle = (page) => ({
    padding: "10px 20px", cursor: "pointer", borderRadius: "8px",
    background: activePage === page ? "#1B4D7A" : "transparent",
    color: activePage === page ? "#fff" : "#1B4D7A",
    border: "none", fontSize: "15px", fontFamily: "Tahoma, Arial, sans-serif"
  });

  const propertyUnits = selectedProperty
    ? units.filter(u => u.property_id === selectedProperty.id)
      .slice()
      .sort((a, b) => (parseInt(a.unit_number) || 999) - (parseInt(b.unit_number) || 999))
    : [];
  const tenantLeases = selectedTenant ? leases.filter(l => l.tenant_id === selectedTenant.id) : [];

  const rowStyle = {
    borderBottom: "1px solid #e0e7ef", textAlign: "center", cursor: "pointer"
  };

  // ترتيب موحّد: أولوية العقار، ثم نوع الوحدة (محل > شقة > ورشة)، ثم رقم الوحدة
  const propertyPriorityMap = {};
  properties.forEach(p => { propertyPriorityMap[p.id] = p.priority ?? 99; });

  const sortedUnits = units.slice().sort((a, b) => {
    const pa = propertyPriorityMap[a.property_id] ?? 99;
    const pb = propertyPriorityMap[b.property_id] ?? 99;
    if (pa !== pb) return pa - pb;
    const ta = UNIT_TYPE_ORDER[(a.unit_type || "").trim()] || 4;
    const tb = UNIT_TYPE_ORDER[(b.unit_type || "").trim()] || 4;
    if (ta !== tb) return ta - tb;
    return (parseInt(a.unit_number) || 999) - (parseInt(b.unit_number) || 999);
  });

  // مفتاح ترتيب موحّد لأي عقد بناءً على أفضل (أقل) نوع/رقم وحدة مرتبطة به
  function leaseUnitSortKey(l) {
    const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
    let type = 5, num = 999;
    unitsList.forEach(u => {
      const t = UNIT_TYPE_ORDER[(u.unit_type || "").trim()] || 4;
      const n = parseInt(u.unit_number) || 999;
      if (t < type || (t === type && n < num)) { type = t; num = n; }
    });
    return { type, num };
  }

  const getPropertyNameForUnit = (unitId) => {
    const u = units.find(un => un.id === unitId);
    if (!u) return "-";
    const p = properties.find(pp => pp.id === u.property_id);
    return p ? p.name : "-";
  };

  // لكل مستأجر، نحدد أول وحدة/عقد مرتبط له لأغراض الترتيب والعرض
  const tenantSortInfo = (tenant) => {
    const tLeases = leases.filter(l => l.tenant_id === tenant.id);
    let best = { priority: 99, type: 5, num: 999, units: [] };
    tLeases.forEach(l => {
      const priority = l.properties?.priority ?? 99;
      const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
      unitsList.forEach(u => {
        const t = UNIT_TYPE_ORDER[(u.unit_type || "").trim()] || 4;
        const n = parseInt(u.unit_number) || 999;
        if (priority < best.priority || (priority === best.priority && t < best.type) || (priority === best.priority && t === best.type && n < best.num)) {
          best = { priority, type: t, num: n, units: unitsList };
        } else if (best.units.length === 0) {
          best = { ...best, units: unitsList };
        }
      });
    });
    return best;
  };

  const sortedTenants = tenants.slice().map(t => ({ ...t, _sort: tenantSortInfo(t) }))
    .sort((a, b) => {
      if (a._sort.priority !== b._sort.priority) return a._sort.priority - b._sort.priority;
      if (a._sort.type !== b._sort.type) return a._sort.type - b._sort.type;
      return a._sort.num - b._sort.num;
    });

  const sortedLeases = leases.slice().sort((a, b) => {
    const pa = a.properties?.priority ?? 99;
    const pb = b.properties?.priority ?? 99;
    if (pa !== pb) return pa - pb;
    const ka = leaseUnitSortKey(a);
    const kb = leaseUnitSortKey(b);
    if (ka.type !== kb.type) return ka.type - kb.type;
    return ka.num - kb.num;
  });

  // ===== تطبيق البحث النصي على كل تبويب =====
  const filteredProperties = properties.filter(p => {
    const q = searchProperties.trim();
    if (!q) return true;
    return (p.name || "").includes(q) || (p.address || "").includes(q);
  });

  const filteredUnits = sortedUnits.filter(u => {
    const q = searchUnits.trim();
    if (!q) return true;
    const propName = properties.find(p => p.id === u.property_id)?.name || "";
    return propName.includes(q) || String(u.unit_number || "").includes(q) || (u.unit_type || "").includes(q);
  });

  const filteredTenants = sortedTenants.filter(t => {
    const q = searchTenants.trim();
    if (!q) return true;
    return (t.name || "").includes(q) || (t.phone || "").includes(q);
  });

  const filteredLeases = sortedLeases.filter(l => {
    const q = searchLeases.trim();
    if (!q) return true;
    const propName = l.properties?.name || "";
    const tenantName = tenants.find(t => t.id === l.tenant_id)?.name || "";
    return propName.includes(q) || tenantName.includes(q);
  });

  function computeStatus(row) {
    const due = Number(row.amount_due || 0);
    const paid = Number(row.amount_paid || 0);
    if (paid <= 0) return "unpaid";
    if (paid >= due && due > 0) return "paid";
    return "partial";
  }

  function statusToArabic(status) {
    if (status === "paid") return "مدفوع";
    if (status === "partial") return "جزئي";
    return "لم يُسدَّد";
  }

  function statusBadge(status) {
    if (status === "paid") return <span style={{ background: "#EAFAF1", color: "#27ae60", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>مدفوع ✓</span>;
    if (status === "partial") return <span style={{ background: "#FEF9E7", color: "#f39c12", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>جزئي ⚠</span>;
    return <span style={{ background: "#FDEDEC", color: "#e74c3c", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>لم يُسدَّد ✗</span>;
  }

  function handleEntitlementsSearch() {
    const filterYear = parseInt(selectedYear);
    const filterMonth = parseInt(selectedMonthNum);
    const found = [];

    for (const row of payments) {
      const lease = row.leases;
      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
      if (!hijri || hijri.year !== filterYear || hijri.month !== filterMonth) continue;

      const unitsList = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      const status = computeStatus(row);

      found.push({
        tenant: lease.tenants?.name || "",
        activity: lease.tenants?.note || "—",
        property: lease.properties?.name || "",
        propertyPriority: lease.properties?.priority ?? 99,
        unit: unitsList.map((u) => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—",
        amount: Number(row.amount_due || 0),
        paidAmount: Number(row.amount_paid || 0),
        status,
        statusLabel: statusToArabic(status),
      });
    }

    found.sort((a, b) => a.propertyPriority - b.propertyPriority);
    setEntResults(found);
    setEntSearched(true);
  }

  const filteredEntResults = entResults.filter(r => {
    const q = searchEntitlements.trim();
    if (!q) return true;
    return (r.property || "").includes(q) || (r.tenant || "").includes(q);
  });

  const totalAmount = filteredEntResults.reduce((s, r) => s + (r.amount || 0), 0);
  const paidAmount = filteredEntResults.filter(r => r.status === "paid").reduce((s, r) => s + (r.amount || 0), 0);
  const partialAmount = filteredEntResults.filter(r => r.status === "partial").reduce((s, r) => s + (r.amount || 0), 0);
  const unpaidAmount = filteredEntResults.filter(r => r.status === "unpaid").reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ background: "#1B4D7A", padding: "16px 32px", display: "flex", alignItems: "center", gap: "16px" }}>
        <img src="/logo_v6_wide.svg" alt="شعار" style={{ height: "40px" }} />
        <span style={{ color: "#F5D98C", fontSize: "18px", fontWeight: "bold" }}>مكتب ثامر بن سلمان العقاري — عرض</span>
      </div>

      <div style={{ background: "#fff", padding: "12px 32px", display: "flex", gap: "8px", borderBottom: "1px solid #e0e7ef", flexWrap: "wrap" }}>
        <button style={navStyle("properties")} onClick={() => { setActivePage("properties"); setSelectedProperty(null); setSelectedTenant(null); }}>العقارات</button>
        <button style={navStyle("units")} onClick={() => { setActivePage("units"); setSelectedProperty(null); setSelectedTenant(null); }}>الوحدات</button>
        <button style={navStyle("tenants")} onClick={() => { setActivePage("tenants"); setSelectedProperty(null); setSelectedTenant(null); }}>المستأجرون</button>
        <button style={navStyle("leases")} onClick={() => { setActivePage("leases"); setSelectedProperty(null); setSelectedTenant(null); }}>العقود</button>
        <button style={navStyle("entitlements")} onClick={() => { setActivePage("entitlements"); setSelectedProperty(null); setSelectedTenant(null); }}>الاستحقاقات</button>
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
                    <td style={{ padding: "12px" }}>{unitTypeBadge(u.unit_type, "")}</td>
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
                  <th style={{ padding: "12px" }}>الوحدة</th>
                  <th style={{ padding: "12px" }}>تاريخ البداية</th>
                  <th style={{ padding: "12px" }}>مبلغ العقد</th>
                  <th style={{ padding: "12px" }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {tenantLeases.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد عقود</td></tr>
                ) : tenantLeases.map(l => {
                  const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                      <td style={{ padding: "12px" }}>{propertyBadge(l.properties?.name)}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                          {unitsList.length === 0 ? "—" : unitsList.map((u, i) => <span key={i}>{unitTypeBadge(u.unit_type, u.unit_number)}</span>)}
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>{l.start_date_hijri || l.start_date || "-"}</td>
                      <td style={{ padding: "12px" }}>{Number(l.contract_value || l.rent_amount || 0).toLocaleString()} ر.س</td>
                      <td style={{ padding: "12px" }}>{l.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!selectedProperty && !selectedTenant && (
          <>
            {activePage === "properties" && (
              <div>
                {searchInput(searchProperties, setSearchProperties, "بحث بالاسم أو العنوان...")}
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                  <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                    <tr>
                      <th style={{ padding: "12px" }}>اسم العقار</th>
                      <th style={{ padding: "12px" }}>العنوان</th>
                      <th style={{ padding: "12px" }}>عدد الوحدات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.length === 0 ? (
                      <tr><td colSpan="3" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد نتائج</td></tr>
                    ) : filteredProperties.map(p => (
                      <tr key={p.id} onClick={() => setSelectedProperty(p)} style={rowStyle}
                        onMouseEnter={e => e.currentTarget.style.background = "#f0f4f8"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "12px" }}>{propertyBadge(p.name)}</td>
                        <td style={{ padding: "12px" }}>{p.address}</td>
                        <td style={{ padding: "12px" }}>{p.total_units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activePage === "units" && (
              <div>
                {searchInput(searchUnits, setSearchUnits, "بحث بالعقار أو رقم الوحدة أو النوع...")}
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                  <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                    <tr>
                      <th style={{ padding: "12px" }}>العقار</th>
                      <th style={{ padding: "12px" }}>رقم الوحدة</th>
                      <th style={{ padding: "12px" }}>النوع</th>
                      <th style={{ padding: "12px" }}>الإيجار الشهري</th>
                      <th style={{ padding: "12px" }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnits.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد نتائج</td></tr>
                    ) : filteredUnits.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                        <td style={{ padding: "12px" }}>{propertyBadge(getPropertyNameForUnit ? (properties.find(p => p.id === u.property_id)?.name) : null)}</td>
                        <td style={{ padding: "12px" }}>{u.unit_number}</td>
                        <td style={{ padding: "12px" }}>{unitTypeBadge(u.unit_type, "")}</td>
                        <td style={{ padding: "12px" }}>{u.monthly_rent} ر.س</td>
                        <td style={{ padding: "12px" }}>{u.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activePage === "tenants" && (
              <div>
                {searchInput(searchTenants, setSearchTenants, "بحث بالاسم أو الجوال...")}
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                  <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                    <tr>
                      <th style={{ padding: "12px" }}>الاسم</th>
                      <th style={{ padding: "12px" }}>الجوال</th>
                      <th style={{ padding: "12px" }}>الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.length === 0 ? (
                      <tr><td colSpan="3" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد نتائج</td></tr>
                    ) : filteredTenants.map(t => (
                      <tr key={t.id} onClick={() => setSelectedTenant(t)} style={rowStyle}
                        onMouseEnter={e => e.currentTarget.style.background = "#f0f4f8"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "12px" }}>{tenantBadge(t.name)}</td>
                        <td style={{ padding: "12px" }}>{t.phone}</td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                            {t._sort.units.length === 0 ? "—" : t._sort.units.map((u, i) => <span key={i}>{unitTypeBadge(u.unit_type, u.unit_number)}</span>)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activePage === "leases" && (
              <div>
                {searchInput(searchLeases, setSearchLeases, "بحث بالعقار أو المستأجر...")}
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                  <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                    <tr>
                      <th style={{ padding: "12px" }}>العقار</th>
                      <th style={{ padding: "12px" }}>الوحدة</th>
                      <th style={{ padding: "12px" }}>تاريخ البداية</th>
                      <th style={{ padding: "12px" }}>مبلغ العقد</th>
                      <th style={{ padding: "12px" }}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeases.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد نتائج</td></tr>
                    ) : filteredLeases.map(l => {
                      const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
                      return (
                        <tr key={l.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                          <td style={{ padding: "12px" }}>{propertyBadge(l.properties?.name)}</td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                              {unitsList.length === 0 ? "—" : unitsList.map((u, i) => <span key={i}>{unitTypeBadge(u.unit_type, u.unit_number)}</span>)}
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>{l.start_date_hijri || l.start_date || "-"}</td>
                          <td style={{ padding: "12px" }}>{Number(l.contract_value || l.rent_amount || 0).toLocaleString()} ر.س</td>
                          <td style={{ padding: "12px" }}>{l.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activePage === "entitlements" && (
              <div>
                <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "20px", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>السنة الهجرية</label>
                    <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", width: "100px", fontFamily: "Tahoma, Arial, sans-serif" }}
                      min="1440" max="1460" />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>الشهر</label>
                    <select value={selectedMonthNum} onChange={(e) => setSelectedMonthNum(e.target.value)}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "160px" }}>
                      {HIJRI_MONTHS.map((name, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1} - {name}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleEntitlementsSearch}
                    style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
                    بحث
                  </button>
                </div>

                {entSearched && (
                  <div style={{ maxWidth: "320px" }}>
                    {searchInput(searchEntitlements, setSearchEntitlements, "بحث بالعقار أو المستأجر...")}
                  </div>
                )}

                {entSearched && filteredEntResults.length > 0 && (
                  <>
                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: "150px", background: "#EAFAF1", border: "1px solid #A9DFBF", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#555" }}>مدفوع</div>
                        <div style={{ fontWeight: "bold", color: "#27ae60", fontSize: "18px" }}>{paidAmount.toLocaleString()} ريال</div>
                      </div>
                      <div style={{ flex: 1, minWidth: "150px", background: "#FEF9E7", border: "1px solid #F9E79F", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#555" }}>جزئي</div>
                        <div style={{ fontWeight: "bold", color: "#f39c12", fontSize: "18px" }}>{partialAmount.toLocaleString()} ريال</div>
                      </div>
                      <div style={{ flex: 1, minWidth: "150px", background: "#FDEDEC", border: "1px solid #F1948A", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#555" }}>لم يُسدَّد</div>
                        <div style={{ fontWeight: "bold", color: "#e74c3c", fontSize: "18px" }}>{unpaidAmount.toLocaleString()} ريال</div>
                      </div>
                      <div style={{ flex: 1, minWidth: "150px", background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الدفعات</div>
                        <div style={{ fontWeight: "bold", color: "#1B4D7A", fontSize: "18px" }}>{totalAmount.toLocaleString()} ريال</div>
                      </div>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                      <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                        <tr>
                          <th style={{ padding: "12px" }}>العقار</th>
                          <th style={{ padding: "12px" }}>المستأجر</th>
                          <th style={{ padding: "12px" }}>النشاط</th>
                          <th style={{ padding: "12px" }}>الوحدة</th>
                          <th style={{ padding: "12px" }}>المبلغ</th>
                          <th style={{ padding: "12px" }}>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntResults.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                            <td style={{ padding: "12px" }}>{propertyBadge(r.property)}</td>
                            <td style={{ padding: "12px" }}>{tenantBadge(r.tenant)}</td>
                            <td style={{ padding: "12px" }}>{r.activity}</td>
                            <td style={{ padding: "12px" }}>{r.unit}</td>
                            <td style={{ padding: "12px" }}>{r.amount.toLocaleString()} ر.س</td>
                            <td style={{ padding: "12px" }}>{statusBadge(r.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {entSearched && filteredEntResults.length === 0 && (
                  <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>
                    لا توجد نتائج مطابقة
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}