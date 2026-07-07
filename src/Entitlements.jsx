import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import ExportToolbar from "./components/ExportToolbar";
import { getUnitTypeColor } from "./theme";

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

const UNIT_TYPE_ORDER = { "محل": 1, "شقة": 2, "ورشة": 3 };

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

export default function Entitlements() {
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedYear, setSelectedYear] = useState("1448");
  const [selectedMonthNum, setSelectedMonthNum] = useState("1");
  const [selectedProperties, setSelectedProperties] = useState([]); // فاضي = كل العقارات
  const [showPropDropdown, setShowPropDropdown] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: propsData } = await supabase.from("properties").select("id, name, priority").order("priority");
    const { data: paymentsData } = await supabase.from("payments").select(`
      id, lease_id, amount_due, amount_paid, installment_number, total_installments,
      leases (
        id, property_id, start_date_hijri,
        properties ( name, priority ),
        tenants ( name, notes ),
        lease_units ( units ( unit_number, unit_type ) )
      )
    `);
    setProperties(propsData || []);
    setPayments((paymentsData || []).filter((p) => p.leases));
    setLoading(false);
  }

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
    const filterYear = parseInt(selectedYear);
    const filterMonth = parseInt(selectedMonthNum);
    const found = [];

    for (const row of payments) {
      const lease = row.leases;
      if (selectedProperties.length > 0 && !selectedProperties.includes(lease.property_id)) continue;

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
        activity: lease.tenants?.notes || "—",
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
  const paidAmount = results.filter(r => r.status === "paid").reduce((sum, r) => sum + (r.amount || 0), 0);
  const partialAmount = results.filter(r => r.status === "partial").reduce((sum, r) => sum + (r.amount || 0), 0);
  const unpaidAmount = results.filter(r => r.status === "unpaid").reduce((sum, r) => sum + (r.amount || 0), 0);

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

  function amountColor(status) {
    if (status === "paid") return "#27ae60";
    if (status === "partial") return "#f39c12";
    return "#e74c3c";
  }

  function amountDisplay(r) {
    if (!r.amount) return "-";
    if (r.status === "partial" && r.paidAmount > 0) {
      return (
        <span>
          <span style={{ color: "#f39c12", fontWeight: "bold" }}>{r.paidAmount.toLocaleString()}</span>
          <span style={{ color: "#999", fontSize: "12px" }}> / {r.amount.toLocaleString()} ريال</span>
        </span>
      );
    }
    return <span style={{ color: amountColor(r.status), fontWeight: "bold" }}>{r.amount.toLocaleString()} ريال</span>;
  }

  if (loading) return <div style={{ padding: "32px", textAlign: "center" }}>جاري التحميل...</div>;

  return (
    <div style={{ padding: "32px", fontFamily: "Cairo, sans-serif", direction: "rtl", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "24px" }}>جدول الاستحقاقات</h1>

      <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "20px", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }} className="no-print">
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
            onClick={() => setShowPropDropdown(!showPropDropdown)}
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
            title="تقرير جدول الاستحقاقات"
            printTargetId="entitlements-table"
          />

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, background: "#EAFAF1", border: "1px solid #A9DFBF", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>مدفوع</div>
              <div style={{ fontWeight: "bold", color: "#27ae60", fontSize: "18px" }}>{paidAmount.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, background: "#FEF9E7", border: "1px solid #F9E79F", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>جزئي</div>
              <div style={{ fontWeight: "bold", color: "#f39c12", fontSize: "18px" }}>{partialAmount.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, background: "#FDEDEC", border: "1px solid #F1948A", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>لم يُسدَّد</div>
              <div style={{ fontWeight: "bold", color: "#e74c3c", fontSize: "18px" }}>{unpaidAmount.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الدفعات</div>
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
                    <td style={{ padding: "12px 16px", color: "#444" }}>{r.property}</td>
                    <td style={{ padding: "12px 16px", fontWeight: "500" }}>{r.tenant}</td>
                    <td style={{ padding: "12px 16px", color: "#777" }}>{r.activity}</td>
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