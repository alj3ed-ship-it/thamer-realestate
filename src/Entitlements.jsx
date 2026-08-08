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
const TAX_RATE = 0.15;

function computeTaxAmount(lease, amountDue) {
  const amt = Number(amountDue || 0);
  if (lease?.amount_includes_vat) {
    return Math.round(amt - (amt / 1.15));
  }
  return Math.round(amt * TAX_RATE);
}

const PROPERTY_BADGE_COLOR = { bg: "#EAF2F8", color: "#1B4D7A", border: "#AED6F1" };
const TENANT_BADGE_COLOR = { bg: "#FEF9E7", color: "#9A7D0A", border: "#F7DC6F" };
const ACTIVITY_BADGE_COLOR = { bg: "#E8F6F3", color: "#148F77", border: "#A2D9CE" };

// خيارات فلتر الحالة
const STATUS_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "paid", label: "مدفوع" },
  { key: "overdue", label: "متأخر" },
  { key: "partial", label: "جزئي" },
  { key: "not_due", label: "غير مستحق بعد" },
];

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

// تحويل هجري إلى ميلادي باستخدام تقويم "أم القرى" الرسمي (بحث تكراري عبر Intl، نفس الأسلوب في VatReturns.jsx)
function hijriToGregorian(hy, hm, hd) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' });
    function getHijriParts(d) {
      const parts = fmt.formatToParts(d);
      return {
        y: parseInt(parts.find(p => p.type === 'year').value),
        m: parseInt(parts.find(p => p.type === 'month').value),
        d: parseInt(parts.find(p => p.type === 'day').value),
      };
    }
    const epoch = new Date(Date.UTC(622, 6, 19));
    const approxDays = Math.round((hy - 1) * 354.36667 + (hm - 1) * 29.53 + hd);
    let guess = new Date(epoch.getTime() + approxDays * 86400000);

    for (let i = 0; i < 30; i++) {
      const cur = getHijriParts(guess);
      if (cur.y === hy && cur.m === hm && cur.d === hd) {
        return new Date(guess.getFullYear(), guess.getMonth(), guess.getDate());
      }
      const diffMonths = (hy - cur.y) * 12 + (hm - cur.m);
      const diffDays = Math.round(diffMonths * 29.53 + (hd - cur.d));
      const step = diffDays !== 0 ? diffDays : (hd > cur.d ? 1 : -1);
      guess = new Date(guess.getTime() + step * 86400000);
    }
    return null;
  } catch { return null; }
}

// تحويل ميلادي إلى هجري باستخدام تقويم "أم القرى" الرسمي (عبر Intl، نفس الأسلوب في VatReturns.jsx)
function gregorianToHijri(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const parts = fmt.formatToParts(d);
    const hy = parts.find(p => p.type === 'year').value;
    const hm = parts.find(p => p.type === 'month').value;
    const hd = parts.find(p => p.type === 'day').value;
    return `${hy}/${String(hm).padStart(2, "0")}/${String(hd).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

// مفتاح ترتيب رقمي لمقارنة تاريخين هجريين نصيين (يُستخدم لتحديد سريان الضريبة)
function hijriSortKey(hijriText) {
  if (!hijriText || hijriText === "—") return -1;
  const parts = hijriText.split("/");
  if (parts.length !== 3) return -1;
  const y = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const d = parseInt(parts[2]) || 0;
  return y * 10000 + m * 100 + d;
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
  const [selectedUnitType, setSelectedUnitType] = useState("");
  const [results, setResults] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all"); // فلتر الحالة الجديد
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
      id, lease_id, amount_due, amount_paid, payment_date_hijri, payment_date, installment_number, total_installments,
    leases (
      id, property_id, start_date_hijri, tax_enabled, tax_effective_hijri, amount_includes_vat,
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

  const filteredTenantOptions = uniqueTenants
    .filter((name) => {
      if (selectedProperties.length === 0) return true;
      return payments.some(
        (p) => p.leases?.tenants?.name === name && selectedProperties.includes(p.leases?.property_id)
      );
    })
    .filter((name) => name.toLowerCase().includes(tenantSearchText.toLowerCase()));

  const uniqueUnitTypes = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      (p.leases?.lease_units || []).forEach((lu) => {
        const t = lu.units?.unit_type;
        if (t) set.add(t.trim());
      });
    });
    const known = ["محل", "شقة", "ورشة"];
    const knownPresent = known.filter((k) => set.has(k));
    const others = Array.from(set).filter((t) => !known.includes(t)).sort((a, b) => a.localeCompare(b, "ar"));
    return [...knownPresent, ...others];
  }, [payments]);

  // status الآن: "paid" | "partial" | "overdue" (متأخر) | "not_due" (غير مستحق بعد)
  function computeStatus(row, hijri) {
    const due = Number(row.amount_due || 0);
    const paid = Number(row.amount_paid || 0);
    if (paid > 0 && paid >= due && due > 0) return "paid";
    if (paid > 0) return "partial";

    // لم يُدفع شيء بعد — نحدد إذا كان متأخراً أو لسا ما جاء وقته
    if (hijri) {
      const dueDate = hijriToGregorian(hijri.year, hijri.month, hijri.day);
      if (dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        // يوم الاستحقاق نفسه يُعتبر مستحقاً (متأخر) وليس "غير مستحق بعد"
        return dueDate <= today ? "overdue" : "not_due";
      }
    }
    return "overdue"; // احتياطي إذا تعذر حساب التاريخ
  }

  function statusToArabic(status) {
    if (status === "paid") return "مدفوع";
    if (status === "partial") return "جزئي";
    if (status === "not_due") return "غير مستحق بعد";
    return "متأخر";
  }

  // هل الضريبة تسري على هذه الدفعة، حسب إعداد العقد وتاريخ استحقاق الدفعة
  function isTaxApplicable(lease, dueDateHijri) {
    if (!lease?.tax_enabled) return false;
    if (!dueDateHijri || dueDateHijri === "—") return false;
    if (!lease.tax_effective_hijri) return true;
    return hijriSortKey(dueDateHijri) >= hijriSortKey(lease.tax_effective_hijri);
  }

  function handleSearch() {
    setShowPropDropdown(false);
    setShowTenantDropdown(false);
    setStatusFilter("all"); // إعادة ضبط فلتر الحالة عند كل بحث جديد
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
      if (selectedUnitType && !units.some((u) => (u.unit_type || "").trim() === selectedUnitType)) continue;
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

      const status = computeStatus(row, hijri);
      const dueDateHijri = hijri
        ? `${hijri.year}/${String(hijri.month).padStart(2, "0")}/${String(hijri.day).padStart(2, "0")}`
        : "—";

      const taxApplies = isTaxApplicable(lease, dueDateHijri);
      const includesVat = !!lease.amount_includes_vat;
      const taxAmount = taxApplies ? computeTaxAmount(lease, row.amount_due) : 0;
      const grossTotal = taxApplies && includesVat ? Number(row.amount_due || 0) : Number(row.amount_due || 0) + taxAmount;

      // إذا الحقل الهجري فاضي، نحوّل التاريخ الميلادي المخزَّن (payment_date) إلى هجري تلقائياً
      const paymentDateHijri = row.payment_date_hijri || gregorianToHijri(row.payment_date) || null;

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
        dueDateHijri,
        paymentDateHijri,
        taxApplies,
        taxAmount,
        includesVat,
        grossTotal,
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

  // عدد كل حالة (لعرضه كعداد بجانب زر الفلتر)
  const statusCounts = useMemo(() => {
    const counts = { all: results.length, paid: 0, overdue: 0, partial: 0, not_due: 0 };
    results.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    return counts;
  }, [results]);

  // النتائج بعد تطبيق فلتر الحالة — هذه هي التي تُعرض وتُطبع وتُصدَّر
  const filteredResults = useMemo(() => {
    if (statusFilter === "all") return results;
    return results.filter((r) => r.status === statusFilter);
  }, [results, statusFilter]);

  const totalAmount = filteredResults.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalCollected = filteredResults.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
  const totalRemaining = Math.max(totalAmount - totalCollected, 0);
  const totalTax = filteredResults.reduce((sum, r) => sum + (r.taxAmount || 0), 0);
  const totalWithTax = filteredResults.reduce((sum, r) => sum + (r.grossTotal ?? ((r.amount || 0) + (r.taxAmount || 0))), 0);
  const totalNet = totalAmount - filteredResults.reduce((sum, r) => sum + (r.taxApplies && r.includesVat ? (r.taxAmount || 0) : 0), 0);

  function statusBadge(status) {
    if (status === "paid") return <span style={{ background: "#EAFAF1", color: "#27ae60", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>مدفوع ✓</span>;
    if (status === "partial") return <span style={{ background: "#FEF9E7", color: "#f39c12", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>جزئي ⚠</span>;
    if (status === "not_due") return <span style={{ background: "#F4F6F7", color: "#7f8c8d", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>غير مستحق بعد ⏳</span>;
    return <span style={{ background: "#FDEDEC", color: "#e74c3c", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>متأخر ⏰</span>;
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
    let base;
    if (r.status === "partial") {
      const remaining = Math.max((r.amount || 0) - (r.paidAmount || 0), 0);
      base = (
        <div style={{ whiteSpace: "nowrap", fontSize: "13px" }}>
          <span style={{ color: "#27ae60", fontWeight: "bold" }}>{r.paidAmount.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ color: "#e74c3c", fontWeight: "bold" }}>{remaining.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ color: "#1B4D7A", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>
        </div>
      );
    } else if (r.status === "paid") {
      base = <span style={{ color: "#27ae60", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>;
    } else if (r.status === "not_due") {
      base = <span style={{ color: "#7f8c8d", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>;
    } else {
      base = <span style={{ color: "#e74c3c", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>;
    }
    return (
      <div>
        {base}
        {r.taxApplies && (
          <div style={{ fontSize: 11, color: "#8e44ad", marginTop: 2, fontWeight: "bold" }}>
            {r.includesVat
              ? `شامل ضريبة 15%: ${r.taxAmount.toLocaleString()} ريال (ضمن المبلغ أعلاه)`
              : `+ ضريبة 15%: ${r.taxAmount.toLocaleString()} = ${(r.amount + r.taxAmount).toLocaleString()} ريال`}
          </div>
        )}
      </div>
    );
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

        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>نوع الوحدة</label>
          <select value={selectedUnitType} onChange={(e) => setSelectedUnitType(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "140px" }}>
            <option value="">كل الأنواع</option>
            {uniqueUnitTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <button onClick={handleSearch}
          style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
          بحث
        </button>
      </div>

      {searched && results.length > 0 && (
        <div id="entitlements-table">
          {/* شريط فلتر الحالة */}
          <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "20px",
                    border: active ? "2px solid #1B4D7A" : "1px solid #ddd",
                    background: active ? "#1B4D7A" : "#fff",
                    color: active ? "#fff" : "#333",
                    fontSize: "13px",
                    fontWeight: "bold",
                    fontFamily: "Cairo, sans-serif",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {f.label} ({statusCounts[f.key] ?? 0})
                </button>
              );
            })}
          </div>

          <ExportToolbar
            data={filteredResults.map(r => {
      const amountColor = r.status === "paid" ? "#27ae60" : r.status === "not_due" ? "#7f8c8d" : "#e74c3c";
      return {
        ...r,
        dueDateHijri: {
          value: `${r.dueDateHijri} هـ`,
          color: "#e74c3c",
          subtext: r.paymentDateHijri ? `✓ ${r.paymentDateHijri} هـ` : null,
          subtextColor: "#27ae60",
        },
        amount: { value: `${r.amount.toLocaleString()} ريال`, color: amountColor },
        statusLabel: { value: r.statusLabel, color: r.status === "paid" ? "#27ae60" : r.status === "overdue" ? "#e74c3c" : r.status === "partial" ? "#f39c12" : "#7f8c8d" },
        taxLabel: r.taxApplies ? `${r.taxAmount.toLocaleString()} ريال` : "—",
        totalWithTax: r.taxApplies ? `${(r.grossTotal ?? (r.amount + r.taxAmount)).toLocaleString()} ريال` : `${r.amount.toLocaleString()} ريال`,
      };
    })}
            columns={[
              { key: "property", label: "العقار", group: true },
              { key: "tenant", label: "المستأجر" },
              { key: "activity", label: "النشاط" },
              { key: "unit", label: "الوحدة" },
              { key: "dueDateHijri", label: "تاريخ الاستحقاق" },
              { key: "amount", label: "المبلغ المستحق" },
              { key: "paidAmount", label: "المبلغ المدفوع" },
              { key: "taxLabel", label: "الضريبة" },
              { key: "totalWithTax", label: "الإجمالي شامل الضريبة" },
              { key: "statusLabel", label: "الحالة" },
            ]}
            filename={`entitlements_${selectedYear}_${selectedMonthNum}${statusFilter !== "all" ? "_" + statusFilter : ""}`}
            title={`جدول الاستحقاقات - ${HIJRI_MONTHS[parseInt(selectedMonthNum) - 1]} ${selectedYear} هـ${statusFilter !== "all" ? " - " + (STATUS_FILTERS.find((f) => f.key === statusFilter)?.label || "") : ""}`}
            stats={[
              { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#27ae60" },
              { label: "إجمالي المتبقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#e74c3c" },
              { label: "إجمالي المستحق", value: `${totalAmount.toLocaleString()} ريال`, color: "#1B4D7A" },
              { label: "إجمالي الضريبة", value: `${totalTax.toLocaleString()} ريال`, color: "#8e44ad" },
              { label: "الإجمالي شامل الضريبة", value: `${totalWithTax.toLocaleString()} ريال`, color: "#1B4D7A" },
              { label: "الصافي بدون ضريبة", value: `${totalNet.toLocaleString()} ريال`, color: "#16a085" },
            ]}
          />

          <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150, background: "#EAFAF1", border: "1px solid #A9DFBF", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المحصّل</div>
              <div style={{ fontWeight: "bold", color: "#27ae60", fontSize: "18px" }}>{totalCollected.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, background: "#FDEDEC", border: "1px solid #F1948A", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المتبقي</div>
              <div style={{ fontWeight: "bold", color: "#e74c3c", fontSize: "18px" }}>{totalRemaining.toLocaleString()} ريال</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المستحق</div>
              <div style={{ fontWeight: "bold", color: "#1B4D7A", fontSize: "18px" }}>{totalAmount.toLocaleString()} ريال</div>
            </div>
            {totalTax > 0 && (
              <div style={{ flex: 1, minWidth: 150, background: "#F4ECF7", border: "1px solid #E1C6ED", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الضريبة</div>
                <div style={{ fontWeight: "bold", color: "#8e44ad", fontSize: "18px" }}>{totalTax.toLocaleString()} ريال</div>
              </div>
            )}
            {totalTax > 0 && (
              <div style={{ flex: 1, minWidth: 150, background: "#EAF7F1", border: "1px solid #A3E4D7", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#555" }}>الصافي بدون ضريبة</div>
                <div style={{ fontWeight: "bold", color: "#16a085", fontSize: "18px" }}>{totalNet.toLocaleString()} ريال</div>
              </div>
            )}
          </div>

          {filteredResults.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>
              لا توجد نتائج لهذه الحالة
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>العقار</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>المستأجر</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>النشاط</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>الوحدة</th>
                               <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>تاريخ الاستحقاق</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>المبلغ</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "12px 16px" }}>{propertyBadge(r.property)}</td>
                      <td style={{ padding: "12px 16px" }}>{tenantBadge(r.tenant)}</td>
                      <td style={{ padding: "12px 16px" }}>{activityBadge(r.activity)}</td>
                      <td style={{ padding: "12px 16px" }}>{unitBadges(r.units)}</td>
                                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                                    <div style={{ color: "#e74c3c", fontWeight: "bold" }}>{r.dueDateHijri} هـ</div>
                                    {r.paymentDateHijri && (
                                      <div style={{ color: "#27ae60", fontWeight: "bold", marginTop: 3 }}>✓ {r.paymentDateHijri} هـ</div>
                                    )}
                                  </td>
                    <td style={{ padding: "12px 16px" }}>{amountDisplay(r)}</td>
                    <td style={{ padding: "12px 16px" }}>{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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