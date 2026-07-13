import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { getUnitTypeColor } from "./theme";
import ExportToolbar from "./components/ExportToolbar";

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

const UNIT_TYPE_ORDER = { "محل": 1, "شقة": 2, "ورشة": 3 };

// ألوان ثابتة: لون واحد لكل "عقار" ولون واحد لكل "مستأجر" بكل الصفحات
const PROPERTY_BADGE_COLOR = { bg: "#EAF2F8", color: "#1B4D7A", border: "#AED6F1" };
const TENANT_BADGE_COLOR = { bg: "#FEF9E7", color: "#9A7D0A", border: "#F7DC6F" };
const ACTIVITY_BADGE_COLOR = { bg: "#E8F6F3", color: "#148F77", border: "#A2D9CE" };

function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map((p) => parseInt(p));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  // يدعم صيغتين: يوم/شهر/سنة (مثل 1/2/1448) أو سنة/شهر/يوم (مثل 1448/02/01)
  // نحدد أي رقم هو السنة بناءً على كونه أكبر من 1300
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

function leaseStatusBadge(status) {
  const isActive = (status || "").toLowerCase() === "active";
  const label = isActive ? "نشط ✓" : (status || "منتهي");
  return (
    <span style={{
      background: isActive ? "#EAFAF1" : "#FDEDEC",
      color: isActive ? "#27ae60" : "#e74c3c",
      padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function leaseAmountDisplay(amount) {
  return <span style={{ color: "#e74c3c", fontWeight: "bold" }}>{Number(amount || 0).toLocaleString()} ر.س</span>;
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
  const [defaulters, setDefaulters] = useState([]);
  const [defaulterPayments, setDefaulterPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activePage, setActivePage] = useState("properties");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);

  // فلترة الاستحقاقات (شهر/سنة هجري)
  const [selectedYear, setSelectedYear] = useState("1448");
  const [selectedMonthNum, setSelectedMonthNum] = useState("1");
  const [entResults, setEntResults] = useState([]);
  const [entSearched, setEntSearched] = useState(false);

  // فلتر العقار والمستأجر لتبويب الاستحقاقات
  const [entSelectedProperties, setEntSelectedProperties] = useState([]); // فاضي = كل العقارات
  const [showEntPropDropdown, setShowEntPropDropdown] = useState(false);
  const [entSelectedTenants, setEntSelectedTenants] = useState([]); // فاضي = كل المستأجرين
  const [showEntTenantDropdown, setShowEntTenantDropdown] = useState(false);
  const [entTenantSearchText, setEntTenantSearchText] = useState("");

  // فلتر العقار لتبويب الوحدات
  const [unitsSelectedProperties, setUnitsSelectedProperties] = useState([]);
  const [showUnitsPropDropdown, setShowUnitsPropDropdown] = useState(false);

  // فلتر العقار والمستأجر لتبويب المستأجرين
  const [tenantsSelectedProperties, setTenantsSelectedProperties] = useState([]);
  const [showTenantsPropDropdown, setShowTenantsPropDropdown] = useState(false);
  const [tenantsSelectedTenants, setTenantsSelectedTenants] = useState([]);
  const [showTenantsTenantDropdown, setShowTenantsTenantDropdown] = useState(false);
  const [tenantsTenantSearchText, setTenantsTenantSearchText] = useState("");

  // فلتر العقار والمستأجر لتبويب العقود
  const [leasesSelectedProperties, setLeasesSelectedProperties] = useState([]);
  const [showLeasesPropDropdown, setShowLeasesPropDropdown] = useState(false);
  const [leasesSelectedTenants, setLeasesSelectedTenants] = useState([]);
  const [showLeasesTenantDropdown, setShowLeasesTenantDropdown] = useState(false);
  const [leasesTenantSearchText, setLeasesTenantSearchText] = useState("");

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
    supabase.from("defaulters").select("*").order("created_at", { ascending: false }).then(({ data }) => setDefaulters(data || []));
    supabase.from("defaulter_payments").select("*").then(({ data }) => setDefaulterPayments(data || []));
    supabase.from("projects").select("*").order("date_created", { ascending: false }).then(({ data }) => setProjects(data || []));
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
      .sort((a, b) => {
        const ta = UNIT_TYPE_ORDER[(a.unit_type || "").trim()] || 4;
        const tb = UNIT_TYPE_ORDER[(b.unit_type || "").trim()] || 4;
        if (ta !== tb) return ta - tb;
        return (parseInt(a.unit_number) || 999) - (parseInt(b.unit_number) || 999);
      })
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
  const filteredProperties = properties;

  const filteredUnits = sortedUnits.filter(u => {
    if (unitsSelectedProperties.length > 0 && !unitsSelectedProperties.includes(u.property_id)) return false;
    return true;
  });

  // قائمة أسماء كل المستأجرين (لبناء قوائم الفلتر القابلة للكتابة)
  const allTenantNames = useMemo(() => {
    return tenants.map((t) => t.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }, [tenants]);

  const leasesFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(leasesTenantSearchText.toLowerCase())
  );
  const tenantsFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(tenantsTenantSearchText.toLowerCase())
  );

  const filteredTenants = sortedTenants.filter(t => {
    if (tenantsSelectedTenants.length > 0 && !tenantsSelectedTenants.includes(t.name)) return false;
    if (tenantsSelectedProperties.length > 0) {
      const tLeases = leases.filter(l => l.tenant_id === t.id);
      const matches = tLeases.some(l => tenantsSelectedProperties.includes(l.property_id));
      if (!matches) return false;
    }
    return true;
  });

  const filteredLeases = sortedLeases.filter(l => {
    if (leasesSelectedProperties.length > 0 && !leasesSelectedProperties.includes(l.property_id)) return false;
    if (leasesSelectedTenants.length > 0) {
      const tenantName = tenants.find(t => t.id === l.tenant_id)?.name;
      if (!leasesSelectedTenants.includes(tenantName)) return false;
    }
    return true;
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

  // عرض عمود المبلغ: للجزئي نوضح الإجمالي/المدفوع/المتبقي بالكلمة والرقم بسطر واحد بدون أي حساب على القارئ
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

  // قائمة أسماء المستأجرين الفريدة (من الدفعات) لبناء قائمة الفلتر القابلة للكتابة
  const entUniqueTenants = useMemo(() => {
    const names = new Set();
    payments.forEach((p) => {
      const name = p.leases?.tenants?.name;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "ar"));
  }, [payments]);

  const entFilteredTenantOptions = entUniqueTenants.filter((name) =>
    name.toLowerCase().includes(entTenantSearchText.toLowerCase())
  );

  function handleEntitlementsSearch() {
    setShowEntPropDropdown(false);
    setShowEntTenantDropdown(false);
    const filterYear = parseInt(selectedYear);
    const filterMonth = parseInt(selectedMonthNum);
    const found = [];

    for (const row of payments) {
      const lease = row.leases;
      if (entSelectedProperties.length > 0 && !entSelectedProperties.includes(lease.property_id)) continue;
      if (entSelectedTenants.length > 0 && !entSelectedTenants.includes(lease.tenants?.name)) continue;

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
        units: unitsList,
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

  // إجمالي المستحق = كل الأقساط. إجمالي المحصّل = كل الفلوس اللي فعلاً دخلت (سواء من مدفوع بالكامل أو جزء من الجزئي).
  // إجمالي المتبقي = الفرق بينهم. هذا يغني عن تصنيف "جزئي" كرقم مستقل فوق ويمنع اللخبطة.
  const totalAmount = entResults.reduce((s, r) => s + (r.amount || 0), 0);
  const totalCollected = entResults.reduce((s, r) => s + (r.paidAmount || 0), 0);
  const totalRemaining = Math.max(totalAmount - totalCollected, 0);

  // ===== حسابات تبويب المتعثرين =====
  function getDefaulterTenant(tenantId) {
    return tenants.find((t) => t.id === tenantId);
  }
  function getDefaulterPaid(defaulterId) {
    return defaulterPayments.filter((p) => p.defaulter_id === defaulterId).reduce((s, p) => s + Number(p.amount || 0), 0);
  }
  const defaultersTotalDebt = defaulters.reduce((s, d) => s + Number(d.total_amount || 0), 0);
  const defaultersTotalCollected = defaulters.reduce((s, d) => s + getDefaulterPaid(d.id), 0);
  const defaultersTotalRemaining = defaultersTotalDebt - defaultersTotalCollected;

  // ===== بيانات التصدير لكل تبويب =====
  const propertiesExportData = filteredProperties.map(p => ({
    name: p.name || "—",
    address: p.address || "—",
    unitCount: p.total_units || "—",
  }));

  const unitsExportData = filteredUnits.map(u => ({
    property: properties.find(p => p.id === u.property_id)?.name || "—",
    unitNumber: u.unit_number || "—",
    unitType: u.unit_type || "—",
    status: u.status || "—",
  }));

  const tenantsExportData = filteredTenants.map(t => ({
    name: t.name || "—",
    phone: t.phone || "—",
    units: t._sort.units.map(u => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—",
  }));

  const leasesExportData = filteredLeases.map(l => {
    const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
    const tenantInfo = tenants.find(t => t.id === l.tenant_id);
    return {
      property: l.properties?.name || "—",
      tenant: tenantInfo?.name || "—",
      activity: tenantInfo?.note || "—",
      unit: unitsList.map(u => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—",
      startDate: l.start_date_hijri || l.start_date || "—",
      amount: `${Number(l.contract_value || l.rent_amount || 0).toLocaleString()} ر.س`,
      status: (l.status || "").toLowerCase() === "active" ? "نشط" : (l.status || "منتهي"),
    };
  });

  const entExportData = entResults.map(r => ({
    property: r.property || "—",
    tenant: r.tenant || "—",
    activity: r.activity || "—",
    unit: r.unit || "—",
    amount: r.status === "partial"
      ? `${r.amount.toLocaleString()} / ${r.paidAmount.toLocaleString()} / ${Math.max(r.amount - r.paidAmount, 0).toLocaleString()}`
      : `${r.amount.toLocaleString()} ر.س`,
    status: r.statusLabel,
  }));

  const entExportStats = [
    { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#27ae60" },
    { label: "إجمالي المتبقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#e74c3c" },
    { label: "إجمالي المستحق", value: `${totalAmount.toLocaleString()} ريال`, color: "#1B4D7A" },
  ];

  const defaultersExportData = defaulters.map((d) => {
    const tenant = getDefaulterTenant(d.tenant_id);
    const paid = getDefaulterPaid(d.id);
    const remaining = Number(d.total_amount || 0) - paid;
    return {
      tenant: tenant?.name || "—",
      phone: tenant?.phone || "—",
      total: `${Number(d.total_amount || 0).toLocaleString()} ر.س`,
      paid: `${paid.toLocaleString()} ر.س`,
      remaining: `${remaining.toLocaleString()} ر.س`,
      notes: d.notes || "—",
    };
  });

  const defaultersExportStats = [
    { label: "إجمالي المتعثر", value: `${defaultersTotalDebt.toLocaleString()} ريال`, color: "#991b1b" },
    { label: "إجمالي المحصّل", value: `${defaultersTotalCollected.toLocaleString()} ريال`, color: "#166534" },
    { label: "إجمالي الباقي", value: `${defaultersTotalRemaining.toLocaleString()} ريال`, color: "#854d0e" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div className="no-print" style={{ background: "#1B4D7A", padding: "16px 32px", display: "flex", alignItems: "center", gap: "16px" }}>
        <img src="/logo_v6_wide.svg" alt="شعار" style={{ height: "40px" }} />
        <span style={{ color: "#F5D98C", fontSize: "18px", fontWeight: "bold" }}>مكتب ثامر بن سلمان العقاري — عرض</span>
      </div>

      <div className="no-print" style={{ background: "#fff", padding: "12px 32px", display: "flex", gap: "8px", borderBottom: "1px solid #e0e7ef", flexWrap: "wrap" }}>
        <button style={navStyle("properties")} onClick={() => { setActivePage("properties"); setSelectedProperty(null); setSelectedTenant(null); }}>العقارات</button>
        <button style={navStyle("units")} onClick={() => { setActivePage("units"); setSelectedProperty(null); setSelectedTenant(null); }}>الوحدات</button>
        <button style={navStyle("tenants")} onClick={() => { setActivePage("tenants"); setSelectedProperty(null); setSelectedTenant(null); }}>المستأجرون</button>
        <button style={navStyle("leases")} onClick={() => { setActivePage("leases"); setSelectedProperty(null); setSelectedTenant(null); }}>العقود</button>
        <button style={navStyle("entitlements")} onClick={() => { setActivePage("entitlements"); setSelectedProperty(null); setSelectedTenant(null); }}>الاستحقاقات</button>
        <button style={navStyle("defaulters")} onClick={() => { setActivePage("defaulters"); setSelectedProperty(null); setSelectedTenant(null); }}>المتعثرون</button>
        <button style={navStyle("projects")} onClick={() => { setActivePage("projects"); setSelectedProperty(null); setSelectedTenant(null); }}>المشاريع</button>
      </div>

      <div style={{ padding: "32px" }}>

        {/* تفاصيل عقار */}
        {selectedProperty && (
          <div>
            <button onClick={() => setSelectedProperty(null)} className="no-print" style={{
              marginBottom: "16px", padding: "8px 20px", background: "#1B4D7A", color: "#fff",
              border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif"
            }}>← رجوع للعقارات</button>
            <h3 style={{ color: "#1B4D7A", marginBottom: "16px" }}>{selectedProperty.name} — {selectedProperty.address}</h3>
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
            </div>
          </div>
        )}

        {/* تفاصيل مستأجر */}
        {selectedTenant && (
          <div>
            <button onClick={() => setSelectedTenant(null)} className="no-print" style={{
              marginBottom: "16px", padding: "8px 20px", background: "#1B4D7A", color: "#fff",
              border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif"
            }}>← رجوع للمستأجرين</button>
            <h3 style={{ color: "#1B4D7A", marginBottom: "16px" }}>{selectedTenant.name} — {selectedTenant.phone}</h3>
            <div id="tenant-leases-table">
              <ExportToolbar
                data={tenantLeases.map(l => {
                  const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
                  return {
                    property: l.properties?.name || "—",
                    unit: unitsList.map(u => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—",
                    startDate: l.start_date_hijri || l.start_date || "—",
                    amount: `${Number(l.contract_value || l.rent_amount || 0).toLocaleString()} ر.س`,
                    status: (l.status || "").toLowerCase() === "active" ? "نشط" : (l.status || "منتهي"),
                  };
                })}
                columns={[
                  { key: "property", label: "العقار" },
                  { key: "unit", label: "الوحدة" },
                  { key: "startDate", label: "تاريخ البداية" },
                  { key: "amount", label: "مبلغ العقد" },
                  { key: "status", label: "الحالة" },
                ]}
                filename={`tenant_${selectedTenant.name || "leases"}`}
                title={`تقرير عقود ${selectedTenant.name || ""}`}
              />
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
                        <td style={{ padding: "12px" }}>{leaseAmountDisplay(l.contract_value || l.rent_amount)}</td>
                        <td style={{ padding: "12px" }}>{leaseStatusBadge(l.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!selectedProperty && !selectedTenant && (
          <>
            {activePage === "properties" && (
              <div id="properties-table">
                <ExportToolbar
                  data={propertiesExportData}
                  columns={[
                    { key: "name", label: "اسم العقار" },
                    { key: "address", label: "العنوان" },
                    { key: "unitCount", label: "عدد الوحدات" },
                  ]}
                  filename="properties_report"
                  title="تقرير العقارات"
                />
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
                {showUnitsPropDropdown && (
                  <div
                    onClick={() => setShowUnitsPropDropdown(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  />
                )}
                <div className="no-print" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "16px 20px", marginBottom: "16px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>العقار</label>
                    <button
                      type="button"
                      onClick={() => setShowUnitsPropDropdown(!showUnitsPropDropdown)}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        {unitsSelectedProperties.length === 0
                          ? "كل العقارات"
                          : unitsSelectedProperties.length === 1
                            ? (properties.find((p) => p.id === unitsSelectedProperties[0])?.name || "عقار واحد")
                            : `${unitsSelectedProperties.length} عقارات محددة`}
                      </span>
                      <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
                    </button>
                    {showUnitsPropDropdown && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "220px", maxHeight: "280px", overflowY: "auto" }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                          <button type="button" onClick={() => setUnitsSelectedProperties(properties.map((p) => p.id))}
                            style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>تحديد الكل</button>
                          <button type="button" onClick={() => setUnitsSelectedProperties([])}
                            style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>إلغاء الكل</button>
                        </div>
                        {properties.map((p) => (
                          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={unitsSelectedProperties.includes(p.id)}
                              onChange={() => setUnitsSelectedProperties((prev) => prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id])} />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="units-table">
                  <ExportToolbar
                    data={unitsExportData}
                    columns={[
                      { key: "property", label: "العقار" },
                      { key: "unitNumber", label: "رقم الوحدة" },
                      { key: "unitType", label: "النوع" },
                      { key: "status", label: "الحالة" },
                    ]}
                    filename="units_report"
                    title="تقرير الوحدات"
                  />
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                    <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                      <tr>
                        <th style={{ padding: "12px" }}>العقار</th>
                        <th style={{ padding: "12px" }}>رقم الوحدة</th>
                        <th style={{ padding: "12px" }}>النوع</th>
                        <th style={{ padding: "12px" }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnits.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد نتائج</td></tr>
                      ) : filteredUnits.map(u => (
                        <tr key={u.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                          <td style={{ padding: "12px" }}>{propertyBadge(getPropertyNameForUnit ? (properties.find(p => p.id === u.property_id)?.name) : null)}</td>
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
                </div>
              </div>
            )}

            {activePage === "tenants" && (
              <div>
                {(showTenantsPropDropdown || showTenantsTenantDropdown) && (
                  <div
                    onClick={() => { setShowTenantsPropDropdown(false); setShowTenantsTenantDropdown(false); }}
                    style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  />
                )}
                <div className="no-print" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "16px 20px", marginBottom: "16px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>العقار</label>
                    <button
                      type="button"
                      onClick={() => { setShowTenantsPropDropdown(!showTenantsPropDropdown); setShowTenantsTenantDropdown(false); }}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        {tenantsSelectedProperties.length === 0
                          ? "كل العقارات"
                          : tenantsSelectedProperties.length === 1
                            ? (properties.find((p) => p.id === tenantsSelectedProperties[0])?.name || "عقار واحد")
                            : `${tenantsSelectedProperties.length} عقارات محددة`}
                      </span>
                      <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
                    </button>
                    {showTenantsPropDropdown && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "220px", maxHeight: "280px", overflowY: "auto" }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                          <button type="button" onClick={() => setTenantsSelectedProperties(properties.map((p) => p.id))}
                            style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>تحديد الكل</button>
                          <button type="button" onClick={() => setTenantsSelectedProperties([])}
                            style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>إلغاء الكل</button>
                        </div>
                        {properties.map((p) => (
                          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={tenantsSelectedProperties.includes(p.id)}
                              onChange={() => setTenantsSelectedProperties((prev) => prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id])} />
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
                      onClick={() => { setShowTenantsTenantDropdown(!showTenantsTenantDropdown); setShowTenantsPropDropdown(false); }}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        {tenantsSelectedTenants.length === 0
                          ? "كل المستأجرين"
                          : tenantsSelectedTenants.length === 1
                            ? tenantsSelectedTenants[0]
                            : `${tenantsSelectedTenants.length} مستأجرين محددين`}
                      </span>
                      <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
                    </button>
                    {showTenantsTenantDropdown && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "240px", maxHeight: "320px", overflowY: "auto" }}>
                        <input type="text" placeholder="اكتب اسم المستأجر..." value={tenantsTenantSearchText}
                          onChange={(e) => setTenantsTenantSearchText(e.target.value)} autoFocus
                          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 10px", fontSize: "13px", fontFamily: "Tahoma, Arial, sans-serif", marginBottom: "8px" }} />
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                          <button type="button" onClick={() => setTenantsSelectedTenants(tenantsFilteredTenantOptions)}
                            style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>تحديد الكل</button>
                          <button type="button" onClick={() => setTenantsSelectedTenants([])}
                            style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>إلغاء الكل</button>
                        </div>
                        {tenantsFilteredTenantOptions.length === 0 && (
                          <div style={{ fontSize: "13px", color: "#999", padding: "6px 4px" }}>لا يوجد مستأجر بهذا الاسم</div>
                        )}
                        {tenantsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={tenantsSelectedTenants.includes(name)}
                              onChange={() => setTenantsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="tenants-table">
                  <ExportToolbar
                    data={tenantsExportData}
                    columns={[
                      { key: "name", label: "الاسم" },
                      { key: "phone", label: "الجوال" },
                      { key: "units", label: "الوحدة" },
                    ]}
                    filename="tenants_report"
                    title="تقرير المستأجرين"
                  />
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
              </div>
            )}

            {activePage === "leases" && (
              <div>
                {(showLeasesPropDropdown || showLeasesTenantDropdown) && (
                  <div
                    onClick={() => { setShowLeasesPropDropdown(false); setShowLeasesTenantDropdown(false); }}
                    style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  />
                )}
                <div className="no-print" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "16px 20px", marginBottom: "16px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>العقار</label>
                    <button
                      type="button"
                      onClick={() => { setShowLeasesPropDropdown(!showLeasesPropDropdown); setShowLeasesTenantDropdown(false); }}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        {leasesSelectedProperties.length === 0
                          ? "كل العقارات"
                          : leasesSelectedProperties.length === 1
                            ? (properties.find((p) => p.id === leasesSelectedProperties[0])?.name || "عقار واحد")
                            : `${leasesSelectedProperties.length} عقارات محددة`}
                      </span>
                      <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
                    </button>
                    {showLeasesPropDropdown && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "220px", maxHeight: "280px", overflowY: "auto" }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                          <button type="button" onClick={() => setLeasesSelectedProperties(properties.map((p) => p.id))}
                            style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>تحديد الكل</button>
                          <button type="button" onClick={() => setLeasesSelectedProperties([])}
                            style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>إلغاء الكل</button>
                        </div>
                        {properties.map((p) => (
                          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={leasesSelectedProperties.includes(p.id)}
                              onChange={() => setLeasesSelectedProperties((prev) => prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id])} />
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
                      onClick={() => { setShowLeasesTenantDropdown(!showLeasesTenantDropdown); setShowLeasesPropDropdown(false); }}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        {leasesSelectedTenants.length === 0
                          ? "كل المستأجرين"
                          : leasesSelectedTenants.length === 1
                            ? leasesSelectedTenants[0]
                            : `${leasesSelectedTenants.length} مستأجرين محددين`}
                      </span>
                      <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
                    </button>
                    {showLeasesTenantDropdown && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "240px", maxHeight: "320px", overflowY: "auto" }}>
                        <input type="text" placeholder="اكتب اسم المستأجر..." value={leasesTenantSearchText}
                          onChange={(e) => setLeasesTenantSearchText(e.target.value)} autoFocus
                          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 10px", fontSize: "13px", fontFamily: "Tahoma, Arial, sans-serif", marginBottom: "8px" }} />
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                          <button type="button" onClick={() => setLeasesSelectedTenants(leasesFilteredTenantOptions)}
                            style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>تحديد الكل</button>
                          <button type="button" onClick={() => setLeasesSelectedTenants([])}
                            style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>إلغاء الكل</button>
                        </div>
                        {leasesFilteredTenantOptions.length === 0 && (
                          <div style={{ fontSize: "13px", color: "#999", padding: "6px 4px" }}>لا يوجد مستأجر بهذا الاسم</div>
                        )}
                        {leasesFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={leasesSelectedTenants.includes(name)}
                              onChange={() => setLeasesSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="leases-table">
                  <ExportToolbar
                    data={leasesExportData}
                    columns={[
                      { key: "property", label: "العقار" },
                      { key: "tenant", label: "المستأجر" },
                      { key: "activity", label: "النشاط" },
                      { key: "unit", label: "الوحدة" },
                      { key: "startDate", label: "تاريخ البداية" },
                      { key: "amount", label: "مبلغ العقد" },
                      { key: "status", label: "الحالة" },
                    ]}
                    filename="leases_report"
                    title="تقرير العقود"
                  />
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                    <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                      <tr>
                        <th style={{ padding: "12px" }}>العقار</th>
                        <th style={{ padding: "12px" }}>المستأجر</th>
                        <th style={{ padding: "12px" }}>النشاط</th>
                        <th style={{ padding: "12px" }}>الوحدة</th>
                        <th style={{ padding: "12px" }}>تاريخ البداية</th>
                        <th style={{ padding: "12px" }}>مبلغ العقد</th>
                        <th style={{ padding: "12px" }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeases.length === 0 ? (
                        <tr><td colSpan="7" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد نتائج</td></tr>
                      ) : filteredLeases.map(l => {
                        const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
                        const tenantInfo = tenants.find(t => t.id === l.tenant_id);
                        return (
                          <tr key={l.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                            <td style={{ padding: "12px" }}>{propertyBadge(l.properties?.name)}</td>
                            <td style={{ padding: "12px" }}>{tenantBadge(tenantInfo?.name)}</td>
                            <td style={{ padding: "12px" }}>{activityBadge(tenantInfo?.note)}</td>
                            <td style={{ padding: "12px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                                {unitsList.length === 0 ? "—" : unitsList.map((u, i) => <span key={i}>{unitTypeBadge(u.unit_type, u.unit_number)}</span>)}
                              </div>
                            </td>
                            <td style={{ padding: "12px" }}>{l.start_date_hijri || l.start_date || "-"}</td>
                            <td style={{ padding: "12px" }}>{leaseAmountDisplay(l.contract_value || l.rent_amount)}</td>
                            <td style={{ padding: "12px" }}>{leaseStatusBadge(l.status)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePage === "entitlements" && (
              <div>
                {(showEntPropDropdown || showEntTenantDropdown) && (
                  <div
                    onClick={() => { setShowEntPropDropdown(false); setShowEntTenantDropdown(false); }}
                    style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  />
                )}
                <div className="no-print" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "20px", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
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

                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>العقار</label>
                    <button
                      type="button"
                      onClick={() => { setShowEntPropDropdown(!showEntPropDropdown); setShowEntTenantDropdown(false); }}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        {entSelectedProperties.length === 0
                          ? "كل العقارات"
                          : entSelectedProperties.length === 1
                            ? (properties.find((p) => p.id === entSelectedProperties[0])?.name || "عقار واحد")
                            : `${entSelectedProperties.length} عقارات محددة`}
                      </span>
                      <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
                    </button>

                    {showEntPropDropdown && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "220px", maxHeight: "280px", overflowY: "auto" }}>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                          <button type="button" onClick={() => setEntSelectedProperties(properties.map((p) => p.id))}
                            style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                            تحديد الكل
                          </button>
                          <button type="button" onClick={() => setEntSelectedProperties([])}
                            style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                            إلغاء الكل
                          </button>
                        </div>
                        {properties.map((p) => (
                          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={entSelectedProperties.includes(p.id)}
                              onChange={() => {
                                setEntSelectedProperties((prev) =>
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
                      onClick={() => { setShowEntTenantDropdown(!showEntTenantDropdown); setShowEntPropDropdown(false); }}
                      style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "180px", background: "#fff", cursor: "pointer", textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        {entSelectedTenants.length === 0
                          ? "كل المستأجرين"
                          : entSelectedTenants.length === 1
                            ? entSelectedTenants[0]
                            : `${entSelectedTenants.length} مستأجرين محددين`}
                      </span>
                      <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
                    </button>

                    {showEntTenantDropdown && (
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20, minWidth: "240px", maxHeight: "320px", overflowY: "auto" }}>
                        <input
                          type="text"
                          placeholder="اكتب اسم المستأجر..."
                          value={entTenantSearchText}
                          onChange={(e) => setEntTenantSearchText(e.target.value)}
                          autoFocus
                          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 10px", fontSize: "13px", fontFamily: "Tahoma, Arial, sans-serif", marginBottom: "8px" }}
                        />
                        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                          <button type="button" onClick={() => setEntSelectedTenants(entFilteredTenantOptions)}
                            style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                            تحديد الكل
                          </button>
                          <button type="button" onClick={() => setEntSelectedTenants([])}
                            style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                            إلغاء الكل
                          </button>
                        </div>
                        {entFilteredTenantOptions.length === 0 && (
                          <div style={{ fontSize: "13px", color: "#999", padding: "6px 4px" }}>لا يوجد مستأجر بهذا الاسم</div>
                        )}
                        {entFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={entSelectedTenants.includes(name)}
                              onChange={() => {
                                setEntSelectedTenants((prev) =>
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

                  <button onClick={handleEntitlementsSearch}
                    style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
                    بحث
                  </button>
                </div>

                {entSearched && entResults.length > 0 && (
                  <div id="entitlements-table">
                    <ExportToolbar
                      data={entExportData}
                      columns={[
                        { key: "property", label: "العقار" },
                        { key: "tenant", label: "المستأجر" },
                        { key: "activity", label: "النشاط" },
                        { key: "unit", label: "الوحدة" },
                        { key: "amount", label: "المبلغ" },
                        { key: "status", label: "الحالة" },
                      ]}
                      filename="entitlements_report"
                      title="تقرير الاستحقاقات"
                      stats={entExportStats}
                    />

                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: "150px", background: "#EAFAF1", border: "1px solid #A9DFBF", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المحصّل</div>
                        <div style={{ fontWeight: "bold", color: "#27ae60", fontSize: "18px" }}>{totalCollected.toLocaleString()} ريال</div>
                      </div>
                      <div style={{ flex: 1, minWidth: "150px", background: "#FDEDEC", border: "1px solid #F1948A", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المتبقي</div>
                        <div style={{ fontWeight: "bold", color: "#e74c3c", fontSize: "18px" }}>{totalRemaining.toLocaleString()} ريال</div>
                      </div>
                      <div style={{ flex: 1, minWidth: "150px", background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المستحق</div>
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
                            <td style={{ padding: "12px" }}>{propertyBadge(r.property)}</td>
                            <td style={{ padding: "12px" }}>{tenantBadge(r.tenant)}</td>
                            <td style={{ padding: "12px" }}>{activityBadge(r.activity)}</td>
                            <td style={{ padding: "12px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                                {r.units.length === 0 ? "—" : r.units.map((u, i) => <span key={i}>{unitTypeBadge(u.unit_type, u.unit_number)}</span>)}
                              </div>
                            </td>
                            <td style={{ padding: "12px" }}>{amountDisplay(r)}</td>
                            <td style={{ padding: "12px" }}>{statusBadge(r.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {entSearched && entResults.length === 0 && (
                  <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>
                    لا توجد نتائج مطابقة
                  </div>
                )}
              </div>
            )}

            {activePage === "defaulters" && (
              <div id="defaulters-table">
                <ExportToolbar
                  data={defaultersExportData}
                  columns={[
                    { key: "tenant", label: "المستأجر" },
                    { key: "phone", label: "الجوال" },
                    { key: "total", label: "المتعثر" },
                    { key: "paid", label: "المحصّل" },
                    { key: "remaining", label: "الباقي" },
                    { key: "notes", label: "ملاحظات" },
                  ]}
                  filename="defaulters_report"
                  title="تقرير المتعثرين"
                  stats={defaultersExportStats}
                />

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "150px", background: "#FDEDEC", border: "1px solid #F1948A", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المتعثر</div>
                    <div style={{ fontWeight: "bold", color: "#991b1b", fontSize: "18px" }}>{defaultersTotalDebt.toLocaleString()} ريال</div>
                  </div>
                  <div style={{ flex: 1, minWidth: "150px", background: "#EAFAF1", border: "1px solid #A9DFBF", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المحصّل</div>
                    <div style={{ fontWeight: "bold", color: "#166534", fontSize: "18px" }}>{defaultersTotalCollected.toLocaleString()} ريال</div>
                  </div>
                  <div style={{ flex: 1, minWidth: "150px", background: "#FEF9E7", border: "1px solid #F7DC6F", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الباقي</div>
                    <div style={{ fontWeight: "bold", color: "#854d0e", fontSize: "18px" }}>{defaultersTotalRemaining.toLocaleString()} ريال</div>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                  <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                    <tr>
                      <th style={{ padding: "12px" }}>المستأجر</th>
                      <th style={{ padding: "12px" }}>الجوال</th>
                      <th style={{ padding: "12px" }}>المتعثر</th>
                      <th style={{ padding: "12px" }}>المحصّل</th>
                      <th style={{ padding: "12px" }}>الباقي</th>
                      <th style={{ padding: "12px" }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaulters.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا يوجد متعثرون مسجّلون</td></tr>
                    ) : defaulters.map((d) => {
                      const tenant = getDefaulterTenant(d.tenant_id);
                      const paid = getDefaulterPaid(d.id);
                      const remaining = Number(d.total_amount || 0) - paid;
                      return (
                        <tr key={d.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                          <td style={{ padding: "12px" }}>{tenantBadge(tenant?.name)}</td>
                          <td style={{ padding: "12px" }}>{tenant?.phone || "—"}</td>
                          <td style={{ padding: "12px", color: "#991b1b", fontWeight: "bold" }}>{Number(d.total_amount || 0).toLocaleString()} ر.س</td>
                          <td style={{ padding: "12px", color: "#166534", fontWeight: "bold" }}>{paid.toLocaleString()} ر.س</td>
                          <td style={{ padding: "12px", color: "#854d0e", fontWeight: "bold" }}>{remaining.toLocaleString()} ر.س</td>
                          <td style={{ padding: "12px", color: "#9ca3af", fontSize: "13px" }}>{d.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activePage === "projects" && (
              <div id="viewer-projects-table">
                <ExportToolbar
                  data={projects.map(p => ({
                    name: p.name || "—",
                    description: p.description || "—",
                    date: p.date_created || "—",
                    status: p.status || "—",
                    expenses: `${Number(p.expenses || 0).toLocaleString()} ريال`,
                    revenues: `${Number(p.revenues || 0).toLocaleString()} ريال`,
                    balance: `${(Number(p.revenues || 0) - Number(p.expenses || 0)).toLocaleString()} ريال`,
                    notes: p.notes || "—",
                  }))}
                  columns={[
                    { key: "name", label: "اسم المشروع" },
                    { key: "description", label: "الوصف" },
                    { key: "date", label: "التاريخ" },
                    { key: "status", label: "الحالة" },
                    { key: "expenses", label: "المصروفات" },
                    { key: "revenues", label: "الإيرادات" },
                    { key: "balance", label: "الرصيد" },
                    { key: "notes", label: "ملاحظات" },
                  ]}
                  filename="projects_report"
                  title="تقرير المشاريع"
                />

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "150px", background: "#FDEDEC", border: "1px solid #F1948A", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#555" }}>إجمالي المصروفات</div>
                    <div style={{ fontWeight: "bold", color: "#e74c3c", fontSize: "18px" }}>
                      {projects.reduce((s, p) => s + (Number(p.expenses) || 0), 0).toLocaleString()} ريال
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: "150px", background: "#EAFAF1", border: "1px solid #A9DFBF", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الإيرادات</div>
                    <div style={{ fontWeight: "bold", color: "#27ae60", fontSize: "18px" }}>
                      {projects.reduce((s, p) => s + (Number(p.revenues) || 0), 0).toLocaleString()} ريال
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: "150px", background: "#EBF5FB", border: "1px solid #AED6F1", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: "13px", color: "#555" }}>الرصيد الكلي</div>
                    <div style={{ fontWeight: "bold", color: "#1B4D7A", fontSize: "18px" }}>
                      {(projects.reduce((s, p) => s + (Number(p.revenues) || 0), 0) - projects.reduce((s, p) => s + (Number(p.expenses) || 0), 0)).toLocaleString()} ريال
                    </div>
                  </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                  <thead style={{ background: "#1B4D7A", color: "#fff" }}>
                    <tr>
                      <th style={{ padding: "12px" }}>اسم المشروع</th>
                      <th style={{ padding: "12px" }}>الوصف</th>
                      <th style={{ padding: "12px" }}>التاريخ</th>
                      <th style={{ padding: "12px" }}>الحالة</th>
                      <th style={{ padding: "12px" }}>المصروفات</th>
                      <th style={{ padding: "12px" }}>الإيرادات</th>
                      <th style={{ padding: "12px" }}>الرصيد</th>
                      <th style={{ padding: "12px" }}>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr><td colSpan="8" style={{ padding: "24px", textAlign: "center", color: "#999" }}>لا توجد مشاريع مسجّلة</td></tr>
                    ) : projects.map((p) => {
                      const bal = (Number(p.revenues) || 0) - (Number(p.expenses) || 0);
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
                          <td style={{ padding: "12px", fontWeight: "bold", color: "#1B4D7A" }}>{p.name}</td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#6b7280" }}>
                            {p.description ? p.description.substring(0, 50) + (p.description.length > 50 ? "..." : "") : "—"}
                          </td>
                          <td style={{ padding: "12px", color: "#6b7280", whiteSpace: "nowrap" }}>{p.date_created || "—"}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
                              background: p.status === "منتهي" ? "#dcfce7" : "#dbeafe",
                              color: p.status === "منتهي" ? "#15803d" : "#0c4a6e",
                            }}>{p.status}</span>
                          </td>
                          <td style={{ padding: "12px", color: "#e74c3c", fontWeight: "bold" }}>{Number(p.expenses || 0).toLocaleString()} ريال</td>
                          <td style={{ padding: "12px", color: "#27ae60", fontWeight: "bold" }}>{Number(p.revenues || 0).toLocaleString()} ريال</td>
                          <td style={{ padding: "12px", color: bal >= 0 ? "#27ae60" : "#e74c3c", fontWeight: "bold" }}>{bal.toLocaleString()} ريال</td>
                          <td style={{ padding: "12px", fontSize: "13px", color: "#9ca3af" }}>
                            {p.notes ? p.notes.substring(0, 30) + (p.notes.length > 30 ? "..." : "") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}