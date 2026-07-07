import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

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

export default function ViewerLayout() {
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activePage, setActivePage] = useState("properties");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  // فلترة الاستحقاقات
  const [selectedYear, setSelectedYear] = useState("1448");
  const [selectedMonthNum, setSelectedMonthNum] = useState("1");
  const [entResults, setEntResults] = useState([]);
  const [entSearched, setEntSearched] = useState(false);

  useEffect(() => {
    supabase.from("properties").select("*").then(({ data }) => setProperties(data || []));
    supabase.from("units").select("*").then(({ data }) => setUnits(data || []));
    supabase.from("tenants").select("*").then(({ data }) => setTenants(data || []));
    supabase.from("leases").select("*").then(({ data }) => setLeases(data || []));
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

  const totalAmount = entResults.reduce((s, r) => s + (r.amount || 0), 0);
  const paidAmount = entResults.filter(r => r.status === "paid").reduce((s, r) => s + (r.amount || 0), 0);
  const partialAmount = entResults.filter(r => r.status === "partial").reduce((s, r) => s + (r.amount || 0), 0);
  const unpaidAmount = entResults.filter(r => r.status === "unpaid").reduce((s, r) => s + (r.amount || 0), 0);

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

                {entSearched && entResults.length > 0 && (
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
                        {entResults.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                            <td style={{ padding: "12px" }}>{r.property}</td>
                            <td style={{ padding: "12px" }}>{r.tenant}</td>
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

                {entSearched && entResults.length === 0 && (
                  <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>
                    لا توجد دفعات مستحقة في هذا الشهر
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