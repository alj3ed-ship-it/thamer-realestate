import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";
import ExportToolbar from "./components/ExportToolbar";
import { getUnitTypeColor } from "./theme";

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

const UNIT_TYPE_ORDER = { "محل": 1, "شقة": 2, "ورشة": 3 };

// نفس ألوان صفحة الوالد بالضبط: العقار كحلي، المستأجر خردلي ذهبي، النشاط تركوازي
const PROPERTY_BADGE_COLOR = { bg: "#EAF2F8", color: "#1B4D7A", border: "#AED6F1" };
const TENANT_BADGE_COLOR = { bg: "#FEF9E7", color: "#9A7D0A", border: "#F7DC6F" };
const ACTIVITY_BADGE_COLOR = { bg: "#E8F6F3", color: "#148F77", border: "#A2D9CE" };

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

function activityBadge(text) {
  if (!text || text === "—") return "—";
  return (
    <span style={{
      background: ACTIVITY_BADGE_COLOR.bg, color: ACTIVITY_BADGE_COLOR.color,
      border: `1px solid ${ACTIVITY_BADGE_COLOR.border}`,
      padding: "4px 12px", borderRadius: "12px", fontSize: "13px", fontWeight: "bold", whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map((p) => parseInt(p));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  if (parts[0] >= 1300) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  if (parts[2] >= 1300) {
    return { day: parts[0], month: parts[1], year: parts[2] };
  }
  return null;
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

export default function Entitlements() {
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedYear, setSelectedYear] = useState("1448");
  const [selectedMonthNum, setSelectedMonthNum] = useState("1");
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [showPropDropdown, setShowPropDropdown] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [tenantSearchText, setTenantSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const filterBoxRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterBoxRef.current && !filterBoxRef.current.contains(e.target)) {
        setShowPropDropdown(false);
        setShowTenantDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: propsData } = await supabase.from("properties").select("id, name, priority").order("priority");
    const { data: paymentsData } = await supabase.from("payments").select(`
      id, lease_id, amount_due, amount_paid, installment_number, total_installments,
      leases (
        id, property_id, start_date_hijri,
        properties ( name, priority ),
        tenants ( name, note ),
        lease_units ( units ( unit_number, unit_type ) )
      )
    `);
    setProperties(propsData || []);
    setPayments((paymentsData || []).filter((p) => p.leases));
    setLoading(false);
  }

  const uniqueTenants = useMemo(() => {
    const names = new Set();
    payments.forEach((p) => {
      const name = p.leases?.tenants?.name;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ar"));
  }, [payments]);

  const filteredTenantOptions = uniqueTenants.filter((name) =>
    name.toLowerCase().includes(tenantSearchText.toLowerCase())
  );

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

  function handleSearch() {
    setShowPropDropdown(false);
    setShowTenantDropdown(false);
    const filterYear = parseInt(selectedYear);
    const filterMonth = parseInt(selectedMonthNum);
    const found = [];

    for (const row of payments) {
      const lease = row.leases;
      if (selectedProperties.length > 0 && !selectedProperties.includes(lease.property_id)) continue;
      if (selectedTenants.length > 0 && !selectedTenants.includes(lease.tenants?.name)) continue;

      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
      if (!hijri || hijri.year !== filterYear || hijri.month !== filterMonth) continue;

      const units = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      let sortType = 99;
      let sortNum = 999;
      units.forEach((u) => {
        const t = UNIT_TYPE_ORDER[u.unit_type] || 4;
        const n = parseInt(u.unit_number) || 999;
        if (t < sortType || (t === sortType && n < sortNum)) {
          sortType = t;
          sortNum = n;
        }
      });

      const status = computeStatus(row);

      found.push({
        tenant: lease.tenants?.name || "",
        activity: lease.tenants?.note || "—",
        property: lease.properties?.name || "",
        propertyPriority: lease.properties?.priority ?? 99,
        unit: units.map((u) => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—",
        units,
        sortType, sortNum,
        amount: Number(row.amount_due || 0),
        paidAmount: Number(row.amount_paid || 0),
        status,
        statusLabel: statusToArabic(status),
      });
    }

    found.sort((a, b) => {
      if (a.propertyPriority !== b.propertyPriority) return a.propertyPriority - b.propertyPriority;
      if (a.sortType !== b.sortType) return a.sortType - b.sortType;
      return a.sortNum - b.sortNum;
    });

    setResults(found);
    setSearched(true);
  }

  const totalAmount = results.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalCollected = results.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const totalRemaining = Math.max(totalAmount - totalCollected, 0);

  function statusBadge(status) {
    if (status === "paid") return <span style={{ background: "#EAFAF1", color: "#27ae60", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>مدفوع ✓</span>;
    if (status === "partial") return <span style={{ background: "#FEF9E7", color: "#f39c12", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>جزئي ⚠</span>;
    return <span style={{ background: "#FDEDEC", color: "#e74c3c", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>لم يُسدَّد ✗</span>;
  }

  function unitBadges(units) {
    if (!units || units.length === 0) return "—";
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {units.map((u, idx) => {
          const c = getUnitTypeColor(u.unit_type);
          return (
            <span key={idx} style={{
              background: c.bg, color: c.color, border: `1px solid ${c.border}`,
              padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap",
            }}>
              {u.unit_type} {u.unit_number}
            </span>
          );
        })}
      </div>
    );
  }

  function amountDisplay(r) {
    if (r.status === "partial") {
      const remaining = Math.max((r.amount || 0) - (r.paidAmount || 0), 0);
      return (
        <div style={{ whiteSpace: "nowrap", fontSize: "13px" }}>
          <span style={{ color: "#e74c3c", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ color: "#27ae60", fontWeight: "bold" }}>{r.paidAmount.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ color: "#f39c12", fontWeight: "bold" }}>{remaining.toLocaleString()}</span>
        </div>
      );
    }
    if (r.status === "paid") {
      return <span style={{ color: "#27ae60", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>;
    }
    return <span style={{ color: "#e74c3c", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>;
  }

  if (loading) return <div style={{ padding: "32px", textAlign: "center" }}>جاري التحميل...</div>;

  return (
    <div style={{ padding: "32px", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h1 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "24px" }}>جدول الاستحقاقات</h1>

      <div ref={filterBoxRef} style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "20px", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }} className="no-print">
        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>السنة الهجرية</label>
          <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", width: "100px", fontFamily: "Cairo, sans-serif" }}
            min="1440" max="1460" />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>الشهر</label>
          <select value={selectedMonthNum} onChange={(e) => setSelectedMonthNum(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "160px" }}>
            {HIJRI_MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} - {name}</option>
            ))}
          </select>
        </div>

        <div style={{ position: "relative" }}>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>العقار</label>
          <button
            type="button"
            onClick={() => { setShowPropDropdown(!showPropDropdown); setShowTenantDropdown(false); }}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {selectedProperties.length === 0
                ? "كل العقارات"
                : selectedProperties.length === 1
                  ? (properties.find((p) => p.id === selectedProperties[0])?.name || "عقار واحد")
                  : `${selectedProperties.length} عقارات محددة`}
            </span>
            <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
          </button>

          {showPropDropdown && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "220px", maxHeight: "280px", overflowY: "auto" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                <button type="button" onClick={() => setSelectedProperties(properties.map((p) => p.id))}
                  style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  تحديد الكل
                </button>
                <button type="button" onClick={() => setSelectedProperties([])}
                  style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  إلغاء الكل
                </button>
              </div>
              {properties.map((p) => (
                <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(p.id)}
                    onChange={() => {
                      setSelectedProperties((prev) =>
                        prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                      );
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>المستأجر</label>
          <button
            type="button"
            onClick={() => { setShowTenantDropdown(!showTenantDropdown); setShowPropDropdown(false); }}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {selectedTenants.length === 0
                ? "كل المستأجرين"
                : selectedTenants.length === 1
                  ? selectedTenants[0]
                  : `${selectedTenants.length} مستأجرين محددين`}
            </span>
            <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
          </button>

          {showTenantDropdown && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "240px", maxHeight: "320px", overflowY: "auto" }}>
              <input
                type="text"
                placeholder="اكتب اسم المستأجر..."
                value={tenantSearchText}
                onChange={(e) => setTenantSearchText(e.target.value)}
                autoFocus
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 10px", fontSize: "13px", fontFamily: "Cairo, sans-serif", marginBottom: "8px" }}
              />
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                <button type="button" onClick={() => setSelectedTenants(filteredTenantOptions)}
                  style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  تحديد الكل
                </button>
                <button type="button" onClick={() => setSelectedTenants([])}
                  style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  إلغاء الكل
                </button>
              </div>
              {filteredTenantOptions.length === 0 && (
                <div style={{ fontSize: "13px", color: "#999", padding: "6px 4px" }}>لا يوجد مستأجر بهذا الاسم</div>
              )}
              {filteredTenantOptions.map((name) => (
                <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedTenants.includes(name)}
                    onChange={() => {
                      setSelectedTenants((prev) =>
                        prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
                      );
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleSearch}
          style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
          بحث
        </button>
      </div>

      {searched && results.length > 0 && (
        <div id="entitlements-table">
          <ExportToolbar
            data={results}
            columns={[
              { key: "property", label: "العقار" },
              { key: "tenant", label: "المستأجر" },
              { key: "activity", label: "النشاط" },
              { key: "unit", label: "الوحدة" },
              { key: "amount", label: "المبلغ المستحق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },
              { key: "statusLabel", label: "الحالة" },
            ]}
            filename={`entitlements_${selectedYear}_${selectedMonthNum}`}
            stats={[
              { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#27ae60" },
              { label: "إجمالي المتبقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#e74c3c" },
              { label: "إجمالي المستحق", value: `${totalAmount.toLocaleString()} ريال`, color: "#1B4D7A" },
            ]}
          />

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, background: "#EAFAF1", border: "1px solid #A9DFBF", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المحصّل</div>
              <div style={{ fontWeight: "bold", color: "#27ae60", fontSize: "18px" }}>{totalCollected.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, background: "#FDEDEC", border: "1px solid #F1948A", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المتبقي</div>
              <div style={{ fontWeight: "bold", color: "#e74c3c", fontSize: "18px" }}>{totalRemaining.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المستحق</div>
              <div style={{ fontWeight: "bold", color: "#1B4D7A", fontSize: "18px" }}>{totalAmount.toLocaleString()} ريال</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>العقار</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>المستأجر</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>النشاط</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>الوحدة</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>المبلغ</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 16px" }}>{propertyBadge(r.property)}</td>
                    <td style={{ padding: "12px 16px" }}>{tenantBadge(r.tenant)}</td>
                    <td style={{ padding: "12px 16px" }}>{activityBadge(r.activity)}</td>
                    <td style={{ padding: "12px 16px" }}>{unitBadges(r.units)}</td>
                    <td style={{ padding: "12px 16px" }}>{amountDisplay(r)}</td>
                    <td style={{ padding: "12px 16px" }}>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {searched && results.length === 0 && (
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>
          لا توجد دفعات مستحقة في هذا الشهر
        </div>
      )}
    </div>
  );
}