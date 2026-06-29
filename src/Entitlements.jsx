import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const FREQUENCY_MONTHS = {
  "شهري": 1,
  "ربع سنوي": 3,
  "نصف سنوي": 6,
  "سنوي": 12,
  "كل 4 أشهر": 4,
};

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) };
}

function addHijriMonths(date, months) {
  let totalMonths = date.year * 12 + (date.month - 1) + months;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1, day: date.day };
}

function formatHijri(date) {
  return `${date.year}/${String(date.month).padStart(2, "0")}/${String(date.day).padStart(2, "0")}`;
}

function getPaymentDates(startDateStr, endDateStr, frequency) {
  const start = parseHijri(startDateStr);
  const end = parseHijri(endDateStr);
  if (!start || !end) return [];
  const intervalMonths = FREQUENCY_MONTHS[frequency];
  if (!intervalMonths) return [];
  const dates = [];
  let current = { ...start };
  const endTotal = end.year * 12 + (end.month - 1);
  while (true) {
    const currentTotal = current.year * 12 + (current.month - 1);
    if (currentTotal > endTotal) break;
    dates.push(formatHijri(current));
    current = addHijriMonths(current, intervalMonths);
  }
  return dates;
}

export default function Entitlements() {
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedYear, setSelectedYear] = useState("1448");
  const [selectedMonthNum, setSelectedMonthNum] = useState("1");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const { data: propsData } = await supabase.from("properties").select("id, name, priority").order("priority");
    const { data: leasesData } = await supabase.from("leases").select(`
      id, start_date_hijri, end_date_hijri, contract_value, payment_frequency, unit_id,
      tenants (name),
      units (unit_number, unit_type, property_id, properties (id, name, priority)),
      lease_units (units (unit_number, unit_type, property_id, properties (id, name, priority)))
    `);
    const { data: paymentsData } = await supabase.from("payments").select("lease_id, amount, amount_paid, status, payment_date_hijri");
    setProperties(propsData || []);
    setLeases(leasesData || []);
    setPayments(paymentsData || []);
    setLoading(false);
  }

  // إصلاح: مقارنة المبلغ المدفوع بالمستحق لتحديد الحالة بدقة
  function getPaymentInfo(leaseId, filterYear, filterMonth, expectedAmount) {
    const leasePayments = payments.filter(p => p.lease_id === leaseId);
    
    // ابحث عن دفعات لهذا الشهر
    const monthPayments = leasePayments.filter(p => {
      const dateStr = p.payment_date_hijri;
      if (!dateStr) return false;
      const d = parseHijri(dateStr);
      return d && d.year === filterYear && d.month === filterMonth;
    });

    if (monthPayments.length === 0) return { status: "unpaid", paidAmount: 0 };

    // احسب مجموع المدفوع (amount_paid إن وجد، وإلا amount)
    const totalPaid = monthPayments.reduce((sum, p) => {
      const val = p.amount_paid != null ? Number(p.amount_paid) : Number(p.amount || 0);
      return sum + val;
    }, 0);

    // تحقق من status صريح أولاً
    const hasExplicitPaid = monthPayments.some(p => p.status === "مدفوع" || p.status === "paid");
    const hasExplicitPartial = monthPayments.some(p => p.status === "جزئي" || p.status === "partial");

    if (hasExplicitPaid) return { status: "paid", paidAmount: totalPaid };
    if (hasExplicitPartial) return { status: "partial", paidAmount: totalPaid };

    // إذا ما في status صريح، قارن المبلغ
    if (expectedAmount && totalPaid > 0) {
      if (totalPaid >= expectedAmount) return { status: "paid", paidAmount: totalPaid };
      return { status: "partial", paidAmount: totalPaid };
    }

    // أي دفعة بدون status = مدفوع كامل
    return { status: "paid", paidAmount: totalPaid };
  }

  function handleSearch() {
    const filterYear = parseInt(selectedYear);
    const filterMonth = parseInt(selectedMonthNum);
    const found = [];

    for (const lease of leases) {
      if (!lease.start_date_hijri || !lease.payment_frequency) continue;
      const paymentDates = getPaymentDates(lease.start_date_hijri, lease.end_date_hijri, lease.payment_frequency);
      const hasPayment = paymentDates.some((d) => {
        const p = parseHijri(d);
        return p && p.year === filterYear && p.month === filterMonth;
      });
      if (!hasPayment) continue;

      let leaseUnitsList = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      // إذا ما في lease_units، استخدم الوحدة المباشرة من العقد
      if (leaseUnitsList.length === 0 && lease.units) {
        leaseUnitsList = [lease.units];
      }
      const intervalMonths = FREQUENCY_MONTHS[lease.payment_frequency] || 1;
      const amountPerPayment = lease.contract_value
        ? Math.round(lease.contract_value / (12 / intervalMonths))
        : null;

      const { status, paidAmount } = getPaymentInfo(lease.id, filterYear, filterMonth, amountPerPayment);

      const addedKeys = new Set();
      for (const unit of leaseUnitsList) {
        const propertyId = unit.property_id;
        const propertyName = unit.properties?.name || "";
        const propertyPriority = unit.properties?.priority ?? 99;
        if (selectedProperty !== "all" && propertyId !== selectedProperty) continue;
        const key = lease.id + "-" + propertyId;
        if (addedKeys.has(key)) continue;
        addedKeys.add(key);

        found.push({
          tenant: lease.tenants?.name || "",
          property: propertyName,
          propertyId: propertyId,
          propertyPriority: propertyPriority,
          unit: unit.unit_number,
          amount: amountPerPayment,
          paidAmount: paidAmount,
          frequency: lease.payment_frequency,
          status: status,
        });
      }
    }

    found.sort((a, b) => {
      if (a.propertyPriority !== b.propertyPriority)
        return (a.propertyPriority ?? 99) - (b.propertyPriority ?? 99);
      return parseInt(a.unit) - parseInt(b.unit);
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

  function amountColor(status) {
    if (status === "paid") return "#27ae60";
    if (status === "partial") return "#f39c12";
    return "#e74c3c";
  }

  // عرض المبلغ: جزئي يظهر مدفوع/مستحق
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

      <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "20px", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
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

        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>العقار</label>
          <select value={selectedProperty} onChange={(e) => setSelectedProperty(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "180px" }}>
            <option value="all">كل العقارات</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button onClick={handleSearch}
          style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
          بحث
        </button>
      </div>

      {searched && results.length > 0 && (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الدفعات</div>
              <div style={{ fontWeight: "bold", color: "#1B4D7A", fontSize: "18px" }}>{totalAmount.toLocaleString()} ريال</div>
            </div>
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
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>المستأجر</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>العقار</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>الوحدة</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>المبلغ</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>نوع الدفع</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500" }}>{r.tenant}</td>
                    <td style={{ padding: "12px 16px", color: "#444" }}>{r.property}</td>
                    <td style={{ padding: "12px 16px", color: "#444" }}>{r.unit}</td>
                    <td style={{ padding: "12px 16px" }}>{amountDisplay(r)}</td>
                    <td style={{ padding: "12px 16px", color: "#666" }}>{r.frequency}</td>
                    <td style={{ padding: "12px 16px" }}>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {searched && results.length === 0 && (
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>
          لا توجد دفعات مستحقة في هذا الشهر
        </div>
      )}
    </div>
  );
}