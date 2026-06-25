import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const PAYMENT_METHODS = ["تحويل بنكي", "نقدي", "شيك"];
const STATUS_OPTIONS = ["مدفوع", "جزئي", "متأخر"];

const STATUS_STYLE = {
  "مدفوع":  { background: "#dcfce7", color: "#166534" },
  "جزئي":   { background: "#fef9c3", color: "#854d0e" },
  "متأخر":  { background: "#fee2e2", color: "#991b1b" },
};

export default function Payments({ onBack }) {
  const [payments, setPayments]   = useState([]);
  const [leases, setLeases]       = useState([]);
  const [tenants, setTenants]     = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("الكل");

  const [form, setForm] = useState({
    lease_id: "",
    amount: "",
    payment_date: "",
    payment_method: "تحويل بنكي",
    status: "مدفوع",
    notes: "",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [pay, lea, ten, pro] = await Promise.all([
      supabase.from("payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("leases").select("id, tenant_id, property_id, rent_amount, payment_type"),
      supabase.from("tenants").select("id, name"),
      supabase.from("properties").select("id, name"),
    ]);
    setPayments(pay.data || []);
    setLeases(lea.data || []);
    setTenants(ten.data || []);
    setProperties(pro.data || []);
    setLoading(false);
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ lease_id: "", amount: "", payment_date: "", payment_method: "تحويل بنكي", status: "مدفوع", notes: "" });
    setShowForm(true);
  }

  function openEditForm(p) {
    setEditingId(p.id);
    setForm({
      lease_id:       p.lease_id       || "",
      amount:         p.amount         || "",
      payment_date:   p.payment_date   || "",
      payment_method: p.payment_method || "تحويل بنكي",
      status:         p.status         || "مدفوع",
      notes:          p.notes          || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.lease_id || !form.amount || !form.payment_date) return;
    setSaving(true);
    const payload = {
      lease_id:       form.lease_id,
      amount:         Number(form.amount),
      payment_date:   form.payment_date,
      payment_method: form.payment_method,
      status:         form.status,
      notes:          form.notes || null,
    };
    if (editingId) {
      await supabase.from("payments").update(payload).eq("id", editingId);
    } else {
      await supabase.from("payments").insert([payload]);
    }
    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("حذف الدفعة؟")) return;
    setDeletingId(id);
    await supabase.from("payments").delete().eq("id", id);
    setDeletingId(null);
    fetchAll();
  }

  const totalPaid    = payments.filter(p => p.status === "مدفوع").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === "جزئي").reduce((s, p) => s + Number(p.amount), 0);
  const totalLate    = payments.filter(p => p.status === "متأخر").reduce((s, p) => s + Number(p.amount), 0);

  const filtered = filterStatus === "الكل" ? payments : payments.filter(p => p.status === filterStatus);

  function getTenantName(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return "—";
    const tenant = tenants.find(t => t.id === lease.tenant_id);
    return tenant?.name || "—";
  }

  function getPropertyName(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return "—";
    const prop = properties.find(p => p.id === lease.property_id);
    return prop?.name || "—";
  }

  function getLeaseName(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) return "—";
    const tenant = tenants.find(t => t.id === lease.tenant_id);
    const prop   = properties.find(p => p.id === lease.property_id);
    return `${tenant?.name || "؟"} — ${prop?.name || "؟"}`;
  }

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif", padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ padding: "8px 16px", marginBottom: "20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        ← رجوع للوحة التحكم
      </button>

      <h1 style={{ margin: "0 0 4px" }}>الدفعات</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>تتبع وتسجيل دفعات الإيجار</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "إجمالي المدفوع",  value: totalPaid,    bg: "#dcfce7", color: "#166534", border: "#86efac" },
          { label: "إجمالي الجزئي",   value: totalPending, bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
          { label: "إجمالي المتأخر",  value: totalLate,    bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ color: card.color, fontSize: 13, marginBottom: 6 }}>{card.label}</div>
            <div style={{ color: card.color, fontWeight: 700, fontSize: 22 }}>{card.value.toLocaleString()} ريال</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + تسجيل دفعة جديدة
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
        <div style={{ marginRight: "auto", display: "flex", gap: 6 }}>
          {["الكل", "مدفوع", "جزئي", "متأخر"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                border: filterStatus === s ? "2px solid #1B4D7A" : "1px solid #e5e7eb",
                background: filterStatus === s ? "#eff6ff" : "#fff",
                color: filterStatus === s ? "#1B4D7A" : "#6b7280",
                fontWeight: filterStatus === s ? 600 : 400,
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
          لا توجد دفعات مسجّلة
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "right" }}>
              {["المستأجر", "العقار", "المبلغ", "تاريخ الدفع", "طريقة الدفع", "الحالة", "ملاحظات", ""].map(h => (
                <th key={h} style={{ padding: "12px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{getTenantName(p.lease_id)}</td>
                <td style={{ padding: "12px", color: "#6b7280" }}>{getPropertyName(p.lease_id)}</td>
                <td style={{ padding: "12px", fontWeight: 600 }}>{Number(p.amount).toLocaleString()} ريال</td>
                <td style={{ padding: "12px", color: "#6b7280" }}>{p.payment_date || "—"}</td>
                <td style={{ padding: "12px", color: "#6b7280" }}>{p.payment_method || "—"}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ ...STATUS_STYLE[p.status], padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    {p.status || "—"}
                  </span>
                </td>
                <td style={{ padding: "12px", color: "#9ca3af", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.notes || "—"}
                </td>
                <td style={{ padding: "12px" }}>
                  <button onClick={() => openEditForm(p)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer", marginLeft: 6 }}>تعديل</button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                    {deletingId === p.id ? "..." : "حذف"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 520, maxWidth: "95%", direction: "rtl", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1rem" }}>{editingId ? "تعديل الدفعة" : "تسجيل دفعة جديدة"}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>العقد (المستأجر — العقار)</label>
                <select value={form.lease_id} onChange={e => setForm({ ...form, lease_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">اختر العقد</option>
                  {leases.map(l => (
                    <option key={l.id} value={l.id}>{getLeaseName(l.id)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>المبلغ (ريال)</label>
                <input type="text" inputMode="numeric" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="مثال: 5000"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>تاريخ الدفع</label>
                <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>طريقة الدفع</label>
                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>الحالة</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>ملاحظات (اختياري)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} disabled={saving}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
                إلغاء
              </button>
              <button onClick={handleSave} disabled={saving || !form.lease_id || !form.amount || !form.payment_date}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer", opacity: (!form.lease_id || !form.amount || !form.payment_date) ? 0.5 : 1 }}>
                {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "تسجيل الدفعة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}