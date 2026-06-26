import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const PAYMENT_METHODS = ["\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a", "\u0646\u0642\u062f\u064a", "\u0634\u064a\u0643"];
const STATUS_OPTIONS = ["\u0645\u062f\u0641\u0648\u0639", "\u062c\u0632\u0626\u064a", "\u0645\u062a\u0623\u062e\u0631"];

const STATUS_STYLE = {
  "\u0645\u062f\u0641\u0648\u0639":  { background: "#dcfce7", color: "#166534" },
  "\u062c\u0632\u0626\u064a":   { background: "#fef9c3", color: "#854d0e" },
  "\u0645\u062a\u0623\u062e\u0631":  { background: "#fee2e2", color: "#991b1b" },
};

const FREQUENCY_MAP = {
  "\u0634\u0647\u0631\u064a": 12,
  "\u0631\u0628\u0639 \u0633\u0646\u0648\u064a": 4,
  "\u0646\u0635\u0641 \u0633\u0646\u0648\u064a": 2,
  "\u0633\u0646\u0648\u064a": 1,
};

function calcDueInfo(lease, allPayments) {
  if (!lease || !lease.start_date || !lease.rent_amount || !lease.payment_type) return null;

  const freq = FREQUENCY_MAP[lease.payment_type] || 1;
  const annualAmount = Number(lease.rent_amount);
  const installmentAmount = annualAmount / freq;
  const monthsInterval = 12 / freq;

  const start = new Date(lease.start_date);
  const today = new Date();

  // كم دفعة استحقت حتى اليوم
  let dueCount = 0;
  const dueDate = new Date(start);
  while (dueDate <= today) {
    dueCount++;
    dueDate.setMonth(dueDate.getMonth() + monthsInterval);
  }

  const totalDue = dueCount * installmentAmount;

  // مجموع المدفوع على هذا العقد
  const totalPaid = allPayments
    .filter(p => p.lease_id === lease.id && p.status !== "\u0645\u062a\u0623\u062e\u0631")
    .reduce((s, p) => s + Number(p.amount), 0);

  const remaining = totalDue - totalPaid;

  // تاريخ الدفعة القادمة
  const nextDue = new Date(start);
  while (nextDue <= today) {
    nextDue.setMonth(nextDue.getMonth() + monthsInterval);
  }

  return {
    freq,
    installmentAmount,
    dueCount,
    totalDue,
    totalPaid,
    remaining,
    nextDue: nextDue.toLocaleDateString("ar-SA"),
  };
}

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
  const [filterStatus, setFilterStatus] = useState("\u0627\u0644\u0643\u0644");

  const [form, setForm] = useState({
    lease_id: "", amount: "", payment_date: "",
    payment_method: "\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a", status: "\u0645\u062f\u0641\u0648\u0639", notes: "",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [pay, lea, ten, pro] = await Promise.all([
      supabase.from("payments").select("*").order("payment_date", { ascending: false }),
      supabase.from("leases").select("id, tenant_id, property_id, rent_amount, payment_type, start_date"),
      supabase.from("tenants").select("id, name"),
      supabase.from("properties").select("id, name"),
    ]);
    setPayments(pay.data || []);
    setLeases(lea.data || []);
    setTenants(ten.data || []);
    setProperties(pro.data || []);
    setLoading(false);
  }

  function getSelectedLease() {
    return leases.find(l => l.id === form.lease_id) || null;
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ lease_id: "", amount: "", payment_date: "", payment_method: "\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a", status: "\u0645\u062f\u0641\u0648\u0639", notes: "" });
    setShowForm(true);
  }

  function openEditForm(p) {
    setEditingId(p.id);
    setForm({
      lease_id: p.lease_id || "", amount: p.amount || "",
      payment_date: p.payment_date || "", payment_method: p.payment_method || "\u062a\u062d\u0648\u064a\u0644 \u0628\u0646\u0643\u064a",
      status: p.status || "\u0645\u062f\u0641\u0648\u0639", notes: p.notes || "",
    });
    setShowForm(true);
  }

  function handleLeaseChange(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    if (!lease) { setForm(prev => ({ ...prev, lease_id: leaseId, amount: "" })); return; }

    const freq = FREQUENCY_MAP[lease.payment_type] || 1;
    const installment = Math.round(Number(lease.rent_amount) / freq);

    const info = calcDueInfo(lease, payments);
    let autoStatus = "\u0645\u062f\u0641\u0648\u0639";
    if (info && info.remaining > 0) autoStatus = "\u062c\u0632\u0626\u064a";

    setForm(prev => ({
      ...prev,
      lease_id: leaseId,
      amount: String(installment),
      payment_date: new Date().toISOString().split("T")[0],
      status: autoStatus,
    }));
  }

  async function handleSave() {
    if (!form.lease_id || !form.amount || !form.payment_date) return;
    setSaving(true);
    const payload = {
      lease_id: form.lease_id, amount: Number(form.amount),
      payment_date: form.payment_date, payment_method: form.payment_method,
      status: form.status, notes: form.notes || null,
    };
    if (editingId) await supabase.from("payments").update(payload).eq("id", editingId);
    else await supabase.from("payments").insert([payload]);
    setSaving(false); setShowForm(false); fetchAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("\u062d\u0630\u0641 \u0627\u0644\u062f\u0641\u0639\u0629\u061f")) return;
    setDeletingId(id);
    await supabase.from("payments").delete().eq("id", id);
    setDeletingId(null); fetchAll();
  }

  const totalPaid    = payments.filter(p => p.status === "\u0645\u062f\u0641\u0648\u0639").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === "\u062c\u0632\u0626\u064a").reduce((s, p) => s + Number(p.amount), 0);
  const totalLate    = payments.filter(p => p.status === "\u0645\u062a\u0623\u062e\u0631").reduce((s, p) => s + Number(p.amount), 0);

  const filtered = filterStatus === "\u0627\u0644\u0643\u0644" ? payments : payments.filter(p => p.status === filterStatus);

  function getTenantName(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    const tenant = tenants.find(t => t.id === lease?.tenant_id);
    return tenant?.name || "\u2014";
  }

  function getPropertyName(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    const prop = properties.find(p => p.id === lease?.property_id);
    return prop?.name || "\u2014";
  }

  function getLeaseName(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    const tenant = tenants.find(t => t.id === lease?.tenant_id);
    const prop = properties.find(p => p.id === lease?.property_id);
    return `${tenant?.name || "\u061f"} \u2014 ${prop?.name || "\u061f"}`;
  }

  const cards = [
    { label: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0641\u0648\u0639", value: totalPaid, status: "\u0645\u062f\u0641\u0648\u0639", bg: "#dcfce7", color: "#166534", border: "#86efac" },
    { label: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062c\u0632\u0626\u064a",  value: totalPending, status: "\u062c\u0632\u0626\u064a", bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    { label: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062a\u0623\u062e\u0631", value: totalLate, status: "\u0645\u062a\u0623\u062e\u0631", bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  ];

  // تنبيهات المتأخرين
  const alerts = leases.map(lease => {
    const info = calcDueInfo(lease, payments);
    if (!info || info.remaining <= 0) return null;
    const tenant = tenants.find(t => t.id === lease.tenant_id);
    return { lease, info, tenantName: tenant?.name || "\u2014" };
  }).filter(Boolean);

  const selectedLease = getSelectedLease();
  const dueInfo = selectedLease ? calcDueInfo(selectedLease, payments) : null;

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif", padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ padding: "8px 16px", marginBottom: "20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        \u2190 \u0631\u062c\u0648\u0639 \u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645
      </button>
      <h1 style={{ margin: "0 0 4px" }}>\u0627\u0644\u062f\u0641\u0639\u0627\u062a</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>\u062a\u062a\u0628\u0639 \u0648\u062a\u0633\u062c\u064a\u0644 \u062f\u0641\u0639\u0627\u062a \u0627\u0644\u0625\u064a\u062c\u0627\u0631</p>

      {/* تنبيهات التأخر */}
      {alerts.length > 0 && (
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: "#9a3412", marginBottom: 10, fontSize: 15 }}>
            \u26a0\ufe0f \u062a\u0646\u0628\u064a\u0647 — \u064a\u0648\u062c\u062f {alerts.length} \u0645\u0633\u062a\u0623\u062c\u0631 \u0644\u062f\u064a\u0647 \u0645\u0628\u0627\u0644\u063a \u0645\u0633\u062a\u062d\u0642\u0629 \u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639\u0629:
          </div>
          {alerts.map(({ lease, info, tenantName }) => (
            <div key={lease.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid #fed7aa" }}>
              <span style={{ fontWeight: 600, color: "#7c2d12" }}>{tenantName}</span>
              <span style={{ color: "#9a3412", fontSize: 13 }}>
                \u0645\u0633\u062a\u062d\u0642 {info.totalDue.toLocaleString()} \u0631 | \u0645\u062f\u0641\u0648\u0639 {info.totalPaid.toLocaleString()} \u0631 |{" "}
                <strong>\u0645\u062a\u0623\u062e\u0631 {info.remaining.toLocaleString()} \u0631</strong>
              </span>
              <span style={{ fontSize: 12, color: "#9a3412" }}>\u0627\u0644\u062f\u0641\u0639\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629: {info.nextDue}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {cards.map(card => (
          <div
            key={card.label}
            onClick={() => setFilterStatus(filterStatus === card.status ? "\u0627\u0644\u0643\u0644" : card.status)}
            style={{
              background: card.bg,
              border: `2px solid ${filterStatus === card.status ? card.color : card.border}`,
              borderRadius: 10, padding: "16px 20px", cursor: "pointer",
              transform: filterStatus === card.status ? "scale(1.02)" : "scale(1)",
              transition: "all 0.15s",
              boxShadow: filterStatus === card.status ? `0 4px 12px ${card.border}` : "none",
            }}
          >
            <div style={{ color: card.color, fontSize: 13, marginBottom: 6 }}>
              {card.label} {filterStatus === card.status && "\u2713"}
            </div>
            <div style={{ color: card.color, fontWeight: 700, fontSize: 22 }}>
              {card.value.toLocaleString()} \u0631\u064a\u0627\u0644
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + \u062a\u0633\u062c\u064a\u0644 \u062f\u0641\u0639\u0629 \u062c\u062f\u064a\u062f\u0629
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          \u062a\u062d\u062f\u064a\u062b
        </button>
        <div style={{ marginRight: "auto", display: "flex", gap: 6 }}>
          {["\u0627\u0644\u0643\u0644", "\u0645\u062f\u0641\u0648\u0639", "\u062c\u0632\u0626\u064a", "\u0645\u062a\u0623\u062e\u0631"].map(s => (
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

      {loading && <p>\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
          \u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a \u0645\u0633\u062c\u0651\u0644\u0629
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "right" }}>
              {["\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631", "\u0627\u0644\u0639\u0642\u0627\u0631", "\u0627\u0644\u0645\u0628\u0644\u063a", "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u0641\u0639", "\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639", "\u0627\u0644\u062d\u0627\u0644\u0629", "\u0645\u0644\u0627\u062d\u0638\u0627\u062a", ""].map(h => (
                <th key={h} style={{ padding: "12px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{getTenantName(p.lease_id)}</td>
                <td style={{ padding: "12px", color: "#6b7280" }}>{getPropertyName(p.lease_id)}</td>
                <td style={{ padding: "12px", fontWeight: 600 }}>{Number(p.amount).toLocaleString()} \u0631\u064a\u0627\u0644</td>
                <td style={{ padding: "12px", color: "#6b7280" }}>{p.payment_date || "\u2014"}</td>
                <td style={{ padding: "12px", color: "#6b7280" }}>{p.payment_method || "\u2014"}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ ...STATUS_STYLE[p.status], padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    {p.status || "\u2014"}
                  </span>
                </td>
                <td style={{ padding: "12px", color: "#9ca3af", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.notes || "\u2014"}
                </td>
                <td style={{ padding: "12px" }}>
                  <button onClick={() => openEditForm(p)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer", marginLeft: 6 }}>\u062a\u0639\u062f\u064a\u0644</button>
                  <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                    {deletingId === p.id ? "..." : "\u062d\u0630\u0641"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 540, maxWidth: "95%", direction: "rtl", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1rem" }}>{editingId ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062f\u0641\u0639\u0629" : "\u062a\u0633\u062c\u064a\u0644 \u062f\u0641\u0639\u0629 \u062c\u062f\u064a\u062f\u0629"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0627\u0644\u0639\u0642\u062f (\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631 \u2014 \u0627\u0644\u0639\u0642\u0627\u0631)</label>
                <select value={form.lease_id} onChange={e => handleLeaseChange(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">\u0627\u062e\u062a\u0631 \u0627\u0644\u0639\u0642\u062f</option>
                  {leases.map(l => <option key={l.id} value={l.id}>{getLeaseName(l.id)}</option>)}
                </select>
              </div>

              {/* ملخص الاستحقاق */}
              {dueInfo && (
                <div style={{ gridColumn: "span 2", borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  <div style={{ background: "#1B4D7A", color: "#fff", padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
                    \u0645\u0644\u062e\u0635 \u0627\u0644\u0627\u0633\u062a\u062d\u0642\u0627\u0642
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                    <div style={{ padding: "10px 14px", borderLeft: "1px solid #e5e7eb" }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>\u0627\u0644\u0645\u0633\u062a\u062d\u0642 \u062d\u062a\u0649 \u0627\u0644\u064a\u0648\u0645</div>
                      <div style={{ fontWeight: 700, color: "#1B4D7A", fontSize: 15 }}>{dueInfo.totalDue.toLocaleString()} \u0631</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{dueInfo.dueCount} \u062f\u0641\u0639\u0629 × {dueInfo.installmentAmount.toLocaleString()} \u0631</div>
                    </div>
                    <div style={{ padding: "10px 14px", borderLeft: "1px solid #e5e7eb" }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>\u0627\u0644\u0645\u062f\u0641\u0648\u0639 \u0641\u0639\u0644\u0627\u064b</div>
                      <div style={{ fontWeight: 700, color: "#166534", fontSize: 15 }}>{dueInfo.totalPaid.toLocaleString()} \u0631</div>
                    </div>
                    <div style={{ padding: "10px 14px", background: dueInfo.remaining > 0 ? "#fff7ed" : "#f0fdf4" }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>\u0627\u0644\u0645\u062a\u0623\u062e\u0631</div>
                      <div style={{ fontWeight: 700, color: dueInfo.remaining > 0 ? "#9a3412" : "#166534", fontSize: 15 }}>
                        {dueInfo.remaining > 0 ? dueInfo.remaining.toLocaleString() + " \u0631" : "\u0644\u0627 \u064a\u0648\u062c\u062f \u062a\u0623\u062e\u0631 \u2713"}
                      </div>
                      {dueInfo.remaining > 0 && (
                        <div style={{ fontSize: 11, color: "#9a3412" }}>\u0627\u0644\u062f\u0641\u0639\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629: {dueInfo.nextDue}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0627\u0644\u0645\u0628\u0644\u063a (\u0631\u064a\u0627\u0644)</label>
                <input type="text" inputMode="numeric" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })}
                  placeholder="\u0645\u062b\u0627\u0644: 5000"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u0641\u0639</label>
                <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639</label>
                <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0627\u0644\u062d\u0627\u0644\u0629</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0645\u0644\u0627\u062d\u0638\u0627\u062a (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} disabled={saving}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
                \u0625\u0644\u063a\u0627\u0621
              </button>
              <button onClick={handleSave} disabled={saving || !form.lease_id || !form.amount || !form.payment_date}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer", opacity: (!form.lease_id || !form.amount || !form.payment_date) ? 0.5 : 1 }}>
                {saving ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : editingId ? "\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644" : "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u0641\u0639\u0629"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}