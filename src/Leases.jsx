import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const PAYMENT_TYPES = [
  { label: "شهري", multiplier: 12 },
  { label: "ربع سنوي", multiplier: 4 },
  { label: "نصف سنوي", multiplier: 2 },
  { label: "سنوي", multiplier: 1 },
  { label: "كل 4 أشهر", multiplier: 3 },
];

const HIJRI_MONTHS = [
  "محرم","صفر","ربيع الأول","ربيع الثاني",
  "جمادى الأولى","جمادى الثانية","رجب","شعبان",
  "رمضان","شوال","ذو القعدة","ذو الحجة"
];

const HIJRI_YEARS = Array.from({ length: 21 }, (_, i) => 1445 + i);
const HIJRI_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

function hijriToGregorian(hy, hm, hd) {
  try {
    const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
      Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
    let l = jd + 68569;
    const n = Math.floor((4 * l) / 146097);
    l = l - Math.floor((146097 * n + 3) / 4);
    const i = Math.floor((4000 * (l + 1)) / 1461001);
    l = l - Math.floor((1461 * i) / 4) + 31;
    const j = Math.floor((80 * l) / 2447);
    const day = l - Math.floor((2447 * j) / 80);
    l = Math.floor(j / 11);
    const month = j + 2 - 12 * l;
    const year = 100 * (n - 49) + i + l;
    return { year, month, day };
  } catch { return null; }
}

function hijriPartsToGregorian(hy, hm, hd) {
  if (!hy || !hm || !hd) return null;
  const g = hijriToGregorian(hy, hm, hd);
  if (!g) return null;
  const mm = String(g.month).padStart(2, "0");
  const dd = String(g.day).padStart(2, "0");
  return `${g.year}-${mm}-${dd}`;
}

function hijriPartsToText(hy, hm, hd) {
  if (!hy || !hm || !hd) return null;
  return `${hy}/${String(hm).padStart(2,'0')}/${String(hd).padStart(2,'0')}`;
}

// إضافة عدد أشهر هجرية على تاريخ هجري (لتوليد تواريخ الدفعات المقترحة)
function addHijriMonths(hijri, monthsToAdd) {
  if (!hijri.year || !hijri.month || !hijri.day) return { year: "", month: "", day: "" };
  const totalMonths = (hijri.month - 1) + monthsToAdd;
  const yearAdd = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return { year: hijri.year + yearAdd, month: newMonth, day: hijri.day };
}

// عدد الدفعات والفاصل الهجري بالأشهر حسب نوع الدفع
function getInstallmentPlan(paymentType) {
  const map = {
    "شهري": { count: 12, stepMonths: 1 },
    "ربع سنوي": { count: 4, stepMonths: 3 },
    "نصف سنوي": { count: 2, stepMonths: 6 },
    "سنوي": { count: 1, stepMonths: 12 },
    "كل 4 أشهر": { count: 3, stepMonths: 4 },
    "دفعتين": { count: 2, stepMonths: 6 },
  };
  return map[paymentType] || { count: 1, stepMonths: 12 };
}

// قائمة مستأجرين قابلة للبحث بالكتابة (بدل قائمة منسدلة طويلة)
function TenantSearchSelect({ tenants, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedTenant = tenants.find(t => t.id === value);
  const displayValue = open ? query : (selectedTenant ? selectedTenant.name : (value === "الكل" ? "كل المستأجرين" : ""));

  const filtered = query.trim() === ""
    ? tenants
    : tenants.filter(t => (t.name || "").includes(query.trim()));

  function pick(id) {
    onChange(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", minWidth: 200 }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setOpen(false); setQuery(""); } }}>
      <input
        type="text"
        value={displayValue}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        placeholder="اكتب اسم المستأجر..."
        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, fontFamily: "Cairo, sans-serif", boxSizing: "border-box" }}
      />
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, left: 0, zIndex: 30,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, marginTop: 4,
          maxHeight: 260, overflowY: "auto", boxShadow: "0 6px 16px rgba(0,0,0,0.12)"
        }}>
          <div
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick("الكل")}
            style={{ padding: "8px 12px", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#1B4D7A", borderBottom: "1px solid #f0f0f0" }}
          >
            كل المستأجرين
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 13 }}>لا يوجد مستأجر مطابق</div>
          ) : (
            filtered.map(t => (
              <div
                key={t.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(t.id)}
                style={{ padding: "8px 12px", cursor: "pointer", fontSize: 14, background: value === t.id ? "#eff6ff" : "#fff" }}
              >
                {t.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function getUnitSortKey(unit) {
  const num = Number(unit.unit_number);
  const typeOffset = ["شقة", "ورشة"].includes(unit.unit_type) ? 1000 : 0;
  return num + typeOffset;
}

function HijriPicker({ label, value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        <select value={value.year || ""} onChange={e => onChange({ ...value, year: Number(e.target.value) })}
          style={{ flex: 2, padding: "8px 6px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "Cairo, sans-serif" }}>
          <option value="">السنة</option>
          {HIJRI_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={value.month || ""} onChange={e => onChange({ ...value, month: Number(e.target.value) })}
          style={{ flex: 3, padding: "8px 6px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "Cairo, sans-serif" }}>
          <option value="">الشهر</option>
          {HIJRI_MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={value.day || ""} onChange={e => onChange({ ...value, day: Number(e.target.value) })}
          style={{ flex: 2, padding: "8px 6px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, fontFamily: "Cairo, sans-serif" }}>
          <option value="">اليوم</option>
          {HIJRI_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      {value.year && value.month && value.day && (
        <div style={{ fontSize: 11, color: "#059669", marginTop: 3 }}>
          هجري: {hijriPartsToText(value.year, value.month, value.day)} ← ميلادي: {hijriPartsToGregorian(value.year, value.month, value.day)}
        </div>
      )}
    </div>
  );
}

export default function Leases({ onBack }) {
  const [leases, setLeases] = useState([]);
  const [leaseUnits, setLeaseUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterProperty, setFilterProperty] = useState("الكل");
  const [filterTenant, setFilterTenant] = useState("الكل");
  const [form, setForm] = useState({
    property_id: "", selected_unit_ids: [], tenant_id: "",
    start_hijri: { year: "", month: "", day: "" },
    end_hijri: { year: "", month: "", day: "" },
    start_date: "", end_date: "",
    start_date_hijri: "", end_date_hijri: "",
    rent_amount: "", payment_type: "سنوي", notes: "",
    installments: [],
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [l, lu, p, u, t, pay] = await Promise.all([
      supabase.from("leases").select("*").order("created_at", { ascending: false }),
      supabase.from("lease_units").select("*"),
      supabase.from("properties").select("id, name").order("name"),
      supabase.from("units").select("id, unit_number, unit_type, property_id, status"),
      supabase.from("tenants").select("id, name"),
      supabase.from("payments").select("lease_id, installment_number, total_installments, due_date_hijri, due_date_gregorian, status").order("installment_number"),
    ]);
    const leasesData = l.data || [];
    const luData = lu.data || [];
    const unitsData = u.data || [];

    const sorted = leasesData.sort((a, b) => {
      const getAllUnitObjs = (lease) => {
        const luIds = luData.filter(x => x.lease_id === lease.id).map(x => x.unit_id);
        const allIds = lease.unit_id ? [...new Set([lease.unit_id, ...luIds])] : luIds;
        return allIds.map(id => unitsData.find(u => u.id === id)).filter(Boolean);
      };
      const aUnits = getAllUnitObjs(a);
      const bUnits = getAllUnitObjs(b);
      const aMin = aUnits.length ? Math.min(...aUnits.map(getUnitSortKey)) : 9999;
      const bMin = bUnits.length ? Math.min(...bUnits.map(getUnitSortKey)) : 9999;
      return aMin - bMin;
    });

    setLeases(sorted);
    setLeaseUnits(luData);
    setProperties(p.data || []);
    setUnits(unitsData);
    setTenants(t.data || []);
    setPayments(pay.data || []);
    setLoading(false);
  }

  function getLeaseUnitIds(leaseId) {
    return leaseUnits.filter(lu => lu.lease_id === leaseId).map(lu => lu.unit_id);
  }

  function getInstallmentDate(leaseId, num) {
    const row = payments.find(p => p.lease_id === leaseId && p.installment_number === num);
    if (!row) return "—";
    return row.due_date_hijri || row.due_date_gregorian || "—";
  }

  function getExtraInstallmentsCount(leaseId) {
    return payments.filter(p => p.lease_id === leaseId && p.installment_number > 4).length;
  }

  function getLeaseUnitsDisplay(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    const luIds = getLeaseUnitIds(leaseId);
    const allIds = lease?.unit_id ? [...new Set([lease.unit_id, ...luIds])] : luIds;
    return allIds.map(id => units.find(u => u.id === id)).filter(Boolean)
      .sort((a, b) => getUnitSortKey(a) - getUnitSortKey(b))
      .map(u => u.unit_number + " " + u.unit_type).join(" + ") || "—";
  }

  function openAddForm() {
    setEditingId(null);
    setForm({
      property_id: "", selected_unit_ids: [], tenant_id: "",
      start_hijri: { year: "", month: "", day: "" },
      end_hijri: { year: "", month: "", day: "" },
      start_date: "", end_date: "",
      start_date_hijri: "", end_date_hijri: "",
      rent_amount: "", payment_type: "سنوي", notes: "",
      installments: [],
    });
    setFilteredUnits([]);
    setShowForm(true);
  }

  function openEditForm(lease) {
    setEditingId(lease.id);
    const currentUnitIds = getLeaseUnitIds(lease.id);
    setForm({
      property_id: lease.property_id || "",
      selected_unit_ids: currentUnitIds,
      tenant_id: lease.tenant_id || "",
      start_hijri: { year: "", month: "", day: "" },
      end_hijri: { year: "", month: "", day: "" },
      start_date: lease.start_date || "",
      end_date: lease.end_date || "",
      start_date_hijri: lease.start_date_hijri || "",
      end_date_hijri: lease.end_date_hijri || "",
      rent_amount: lease.rent_amount || "",
      payment_type: lease.payment_type || "سنوي",
      notes: lease.notes || "",
      installments: [],
    });
    setFilteredUnits(
      units.filter(u => u.property_id === lease.property_id && (u.status === "شاغرة" || currentUnitIds.includes(u.id)))
        .sort((a, b) => Number(a.unit_number) - Number(b.unit_number))
    );
    setShowForm(true);
  }

  function handlePropertyChange(propertyId) {
    setForm(prev => ({ ...prev, property_id: propertyId, selected_unit_ids: [] }));
    setFilteredUnits(
      units.filter(u => u.property_id === propertyId && u.status === "شاغرة")
        .sort((a, b) => Number(a.unit_number) - Number(b.unit_number))
    );
  }

  function handleStartHijri(val) {
    const g = hijriPartsToGregorian(val.year, val.month, val.day);
    const h = hijriPartsToText(val.year, val.month, val.day);
    setForm(prev => ({ ...prev, start_hijri: val, start_date: g || "", start_date_hijri: h || "" }));
    if (!editingId) regenerateInstallments({ start_hijri: val });
  }

  function handleEndHijri(val) {
    const g = hijriPartsToGregorian(val.year, val.month, val.day);
    const h = hijriPartsToText(val.year, val.month, val.day);
    setForm(prev => ({ ...prev, end_hijri: val, end_date: g || "", end_date_hijri: h || "" }));
  }

  function handlePaymentTypeChange(paymentType) {
    setForm(prev => ({ ...prev, payment_type: paymentType }));
    if (!editingId) regenerateInstallments({ payment_type: paymentType });
  }

  function toggleUnit(unitId) {
    setForm(prev => {
      const ids = prev.selected_unit_ids;
      return ids.includes(unitId)
        ? { ...prev, selected_unit_ids: ids.filter(id => id !== unitId) }
        : { ...prev, selected_unit_ids: [...ids, unitId] };
    });
  }

  // يولّد جدول الدفعات تلقائياً (مبلغ متساوٍ + تواريخ مقترحة بفاصل منتظم) - قابل للتعديل بالكامل بعدها
  function regenerateInstallments(overrides = {}) {
    const paymentType = overrides.payment_type ?? form.payment_type;
    const rentAmount = Number(overrides.rent_amount ?? form.rent_amount) || 0;
    const startHijri = overrides.start_hijri ?? form.start_hijri;

    const { count, stepMonths } = getInstallmentPlan(paymentType);
    if (!rentAmount || !startHijri.year || !startHijri.month || !startHijri.day) {
      setForm(prev => ({ ...prev, installments: [] }));
      return;
    }
    const amountPer = Math.round(rentAmount / count);
    const newInstallments = Array.from({ length: count }, (_, i) => ({
      amount: amountPer,
      hijri: addHijriMonths(startHijri, i * stepMonths),
    }));
    setForm(prev => ({ ...prev, installments: newInstallments }));
  }

  function updateInstallmentAmount(index, value) {
    setForm(prev => {
      const list = [...prev.installments];
      list[index] = { ...list[index], amount: value };
      return { ...prev, installments: list };
    });
  }

  function updateInstallmentHijri(index, value) {
    setForm(prev => {
      const list = [...prev.installments];
      list[index] = { ...list[index], hijri: value };
      return { ...prev, installments: list };
    });
  }

  function getTotal() {
    const amount = Number(form.rent_amount);
    if (!amount) return null;
    const type = PAYMENT_TYPES.find(p => p.label === form.payment_type);
    const installment = Math.round(amount / (type?.multiplier || 1));
    return { annual: amount, installment, count: type?.multiplier || 1 };
  }

  async function handleSave() {
    if (!form.tenant_id || !form.rent_amount || form.selected_unit_ids.length === 0) return;
    setSaving(true);
    const payload = {
      property_id: form.property_id || null,
      unit_id: form.selected_unit_ids[0] || null,
      tenant_id: form.tenant_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_date_hijri: form.start_date_hijri || null,
      end_date_hijri: form.end_date_hijri || null,
      rent_amount: Number(form.rent_amount),
      payment_type: form.payment_type,
      notes: form.notes || null,
    };
    let leaseId = editingId;
    if (editingId) {
      const { data: oldLU } = await supabase.from("lease_units").select("unit_id").eq("lease_id", editingId);
      const oldUnitIds = (oldLU || []).map(r => r.unit_id);
      for (const uid of oldUnitIds) await supabase.from("units").update({ status: "شاغرة" }).eq("id", uid);
      await supabase.from("lease_units").delete().eq("lease_id", editingId);
      await supabase.from("leases").update(payload).eq("id", editingId);
    } else {
      const { data } = await supabase.from("leases").insert([payload]).select("id");
      leaseId = data?.[0]?.id;
      // كتابة جدول الدفعات الثابت (المدخل يدوياً بالنموذج) - فقط عند إنشاء عقد جديد
      if (leaseId && form.installments.length > 0) {
        const paymentRows = form.installments.map((inst, i) => {
          const dueHijriText = hijriPartsToText(inst.hijri.year, inst.hijri.month, inst.hijri.day);
          const dueGregorian = hijriPartsToGregorian(inst.hijri.year, inst.hijri.month, inst.hijri.day);
          return {
            lease_id: leaseId,
            installment_number: i + 1,
            total_installments: form.installments.length,
            amount_due: Number(inst.amount) || 0,
            amount_paid: 0,
            due_date_hijri: dueHijriText,
            due_date_gregorian: dueGregorian,
            status: "لم يُسدَّد",
          };
        });
        await supabase.from("payments").insert(paymentRows);
      }
    }
    if (leaseId) {
      const luRows = form.selected_unit_ids.map(uid => ({ lease_id: leaseId, unit_id: uid }));
      await supabase.from("lease_units").insert(luRows);
    }
    for (const uid of form.selected_unit_ids) await supabase.from("units").update({ status: "مؤجرة" }).eq("id", uid);
    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(lease) {
    if (!window.confirm("حذف العقد؟")) return;
    setDeletingId(lease.id);
    const { data: luData } = await supabase.from("lease_units").select("unit_id").eq("lease_id", lease.id);
    const unitIds = (luData || []).map(r => r.unit_id);
    for (const uid of unitIds) await supabase.from("units").update({ status: "شاغرة" }).eq("id", uid);
    await supabase.from("lease_units").delete().eq("lease_id", lease.id);
    await supabase.from("leases").delete().eq("id", lease.id);
    setDeletingId(null);
    fetchAll();
  }

  // فلترة بالعقار + المستأجر مع بعض
  const filteredLeases = leases.filter(l => {
    const matchProperty = filterProperty === "الكل" || l.property_id === filterProperty;
    const matchTenant = filterTenant === "الكل" || l.tenant_id === filterTenant;
    return matchProperty && matchTenant;
  });

  // قائمة المستأجرين مرتبطين فعلياً بالعقار المختار فقط (أو الكل لو ما فيه فلتر عقار)
  const tenantIdsInProperty = filterProperty === "الكل"
    ? null
    : new Set(leases.filter(l => l.property_id === filterProperty).map(l => l.tenant_id));
  const availableTenants = (tenantIdsInProperty ? tenants.filter(t => tenantIdsInProperty.has(t.id)) : tenants);
  const sortedTenants = [...availableTenants].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

  // لو غيّرنا العقار وصار المستأجر المختار مو تابع له، نرجّع الفلتر لـ"الكل" تلقائياً
  useEffect(() => {
    if (filterTenant !== "الكل" && tenantIdsInProperty && !tenantIdsInProperty.has(filterTenant)) {
      setFilterTenant("الكل");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProperty]);

  // إجمالي مبلغ العقود الظاهرة حالياً (يتغيّر تلقائياً حسب الفلاتر)
  const totalAmount = filteredLeases.reduce((sum, l) => sum + Number(l.rent_amount || 0), 0);

  const total = getTotal();

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif", padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ padding: "8px 16px", marginBottom: "20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: "0 0 4px" }}>العقود</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>إدارة عقود الإيجار</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + إضافة عقد جديد
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
        <TenantSearchSelect tenants={sortedTenants} value={filterTenant} onChange={setFilterTenant} />
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, fontFamily: "Cairo, sans-serif", marginRight: "auto" }}>
          <option value="الكل">كل العقارات</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {!loading && (
        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
          padding: "14px 20px", marginBottom: 20, display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
        }}>
          <span style={{ color: "#374151", fontSize: 14 }}>
            عدد العقود الظاهرة: <strong>{filteredLeases.length}</strong>
          </span>
          <span style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 18 }}>
            الإجمالي: {totalAmount.toLocaleString()} ريال
          </span>
        </div>
      )}

      {loading && <p>جاري التحميل...</p>}

      {!loading && filteredLeases.length === 0 && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
          لا توجد عقود
        </div>
      )}

      {!loading && filteredLeases.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#1B4D7A", textAlign: "right" }}>
                {["المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الملاحظات", ""].map(h => (
                  <th key={h} style={{ padding: "12px", color: "#fff", fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeases.map((l, idx) => {
                const tenant = tenants.find(t => t.id === l.tenant_id);
                const property = properties.find(p => p.id === l.property_id);
                return (
                  <tr key={l.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{tenant?.name || "—"}</td>
                    <td style={{ padding: "12px", color: "#0e7490", fontWeight: 600 }}>{property?.name || "—"}</td>
                    <td style={{ padding: "12px", color: "#7c3aed", fontWeight: 600 }}>{getLeaseUnitsDisplay(l.id)}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 6, fontSize: 12, whiteSpace: "nowrap", display: "inline-block" }}>
                        {l.payment_type || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + " ريال" : "—"}</td>
                    <td style={{ padding: "12px", color: "#059669", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{getInstallmentDate(l.id, 1)}</td>
                    <td style={{ padding: "12px", color: "#059669", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{getInstallmentDate(l.id, 2)}</td>
                    <td style={{ padding: "12px", color: "#059669", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{getInstallmentDate(l.id, 3)}</td>
                    <td style={{ padding: "12px", color: "#059669", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {getInstallmentDate(l.id, 4)}
                      {getExtraInstallmentsCount(l.id) > 0 && (
                        <div style={{ color: "#9ca3af", fontSize: 10, fontWeight: 400 }}>
                          +{getExtraInstallmentsCount(l.id)} دفعة أخرى (بصفحة الدفعات)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px", color: "#6b7280", maxWidth: "160px", whiteSpace: "normal", wordBreak: "break-word" }}>{l.notes || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      <button onClick={() => openEditForm(l)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer", marginLeft: 6 }}>تعديل</button>
                      <button onClick={() => handleDelete(l)} disabled={deletingId === l.id} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                        {deletingId === l.id ? "..." : "حذف"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 560, maxWidth: "95%", direction: "rtl", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1rem" }}>{editingId ? "تعديل العقد" : "إضافة عقد جديد"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>العقار</label>
                <select value={form.property_id} onChange={e => handlePropertyChange(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">اختر العقار</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {form.property_id && (
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 8 }}>الوحدات (اختر واحدة أو أكثر)</label>
                  {filteredUnits.length === 0 ? (
                    <div style={{ color: "#9ca3af", fontSize: 13 }}>لا توجد وحدات شاغرة</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {filteredUnits.map(u => {
                        const selected = form.selected_unit_ids.includes(u.id);
                        return (
                          <button key={u.id} onClick={() => toggleUnit(u.id)} style={{
                            padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                            border: selected ? "2px solid #1B4D7A" : "1px solid #e5e7eb",
                            background: selected ? "#eff6ff" : "#fff",
                            color: selected ? "#1B4D7A" : "#374151",
                            fontFamily: "Cairo, sans-serif", fontWeight: selected ? 700 : 400
                          }}>
                            {u.unit_number} - {u.unit_type}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {form.selected_unit_ids.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#1B4D7A" }}>
                      المحدد: {form.selected_unit_ids.map(id => units.find(u => u.id === id)?.unit_number).join(" + ")}
                    </div>
                  )}
                </div>
              )}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>المستأجر</label>
                <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">اختر المستأجر</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <HijriPicker label="تاريخ البداية (هجري)" value={form.start_hijri} onChange={handleStartHijri} />
              <HijriPicker label="تاريخ النهاية (هجري)" value={form.end_hijri} onChange={handleEndHijri} />
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>نوع الدفع</label>
                <select value={form.payment_type} onChange={e => handlePaymentTypeChange(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {PAYMENT_TYPES.map(p => <option key={p.label}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>المبلغ (ريال)</label>
                <input type="text" value={form.rent_amount} onChange={e => setForm({ ...form, rent_amount: e.target.value })}
                  onBlur={() => { if (!editingId) regenerateInstallments(); }}
                  placeholder="أدخل المبلغ"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            {total && (
              <div style={{ margin: "12px 0", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
                <div><span style={{ color: "#6b7280", fontSize: 13 }}>الإيجار السنوي: </span><span style={{ fontWeight: 700, fontSize: 16, color: "#1d4ed8" }}>{total.annual.toLocaleString()} ريال</span></div>
                <div><span style={{ color: "#6b7280", fontSize: 13 }}>كل دفعة: </span><span style={{ fontWeight: 700, fontSize: 16, color: "#059669" }}>{total.installment.toLocaleString()} ريال × {total.count}</span></div>
              </div>
            )}

            {!editingId && form.installments.length > 0 && (
              <div style={{ margin: "12px 0", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label style={{ fontSize: 13, color: "#374151", fontWeight: 700 }}>جدول الدفعات (قابل للتعديل)</label>
                  <button type="button" onClick={() => regenerateInstallments()}
                    style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer" }}>
                    إعادة توزيع تلقائي
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {form.installments.map((inst, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#f9fafb", padding: 8, borderRadius: 8 }}>
                      <div style={{ width: 70, fontSize: 12, color: "#6b7280", paddingBottom: 8 }}>الدفعة {i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <HijriPicker label="التاريخ" value={inst.hijri} onChange={(v) => updateInstallmentHijri(i, v)} />
                      </div>
                      <div style={{ width: 110 }}>
                        <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>المبلغ</label>
                        <input type="number" value={inst.amount}
                          onChange={(e) => updateInstallmentAmount(i, e.target.value)}
                          style={{ width: "100%", padding: "8px 6px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editingId && (
              <div style={{ margin: "12px 0", fontSize: 12, color: "#9ca3af", background: "#f9fafb", padding: 10, borderRadius: 8 }}>
                ملاحظة: تعديل العقد هنا لا يغيّر جدول الدفعات المسجّل مسبقاً — لتعديل دفعة معينة استخدم صفحة "الدفعات".
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>ملاحظات (اختياري)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>إلغاء</button>
              <button onClick={handleSave} disabled={saving || form.selected_unit_ids.length === 0}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer", opacity: form.selected_unit_ids.length === 0 ? 0.5 : 1 }}>
                {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}