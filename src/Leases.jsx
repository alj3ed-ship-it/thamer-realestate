import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const PAYMENT_TYPES = [
  { label: "شهري", multiplier: 12 },
  { label: "ربع سنوي", multiplier: 4 },
  { label: "نصف سنوي", multiplier: 2 },
  { label: "سنوي", multiplier: 1 },
];

export default function Leases({ onBack }) {
  const [leases, setLeases] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    property_id: "", unit_id: "", tenant_id: "",
    start_date: "", end_date: "", rent_amount: "",
    payment_type: "\u0634\u0647\u0631\u064a", notes: "",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [l, p, u, t] = await Promise.all([
      supabase.from("leases").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("id, name").order("name"),
      supabase.from("units").select("id, unit_number, unit_type, property_id, status"),
      supabase.from("tenants").select("id, name"),
    ]);
    setLeases(l.data || []);
    setProperties(p.data || []);
    setUnits(u.data || []);
    setTenants(t.data || []);
    setLoading(false);
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ property_id: "", unit_id: "", tenant_id: "", start_date: "", end_date: "", rent_amount: "", payment_type: "\u0634\u0647\u0631\u064a", notes: "" });
    setFilteredUnits([]);
    setShowForm(true);
  }

  function openEditForm(lease) {
    setEditingId(lease.id);
    setForm({
      property_id: lease.property_id || "",
      unit_id: lease.unit_id || "",
      tenant_id: lease.tenant_id || "",
      start_date: lease.start_date || "",
      end_date: lease.end_date || "",
      rent_amount: lease.rent_amount || "",
      payment_type: lease.payment_type || "\u0634\u0647\u0631\u064a",
      notes: lease.notes || "",
    });
    setFilteredUnits(units.filter(u => u.property_id === lease.property_id));
    setShowForm(true);
  }

  function handlePropertyChange(propertyId) {
    setForm(prev => ({ ...prev, property_id: propertyId, unit_id: "" }));
    setFilteredUnits(units.filter(u => u.property_id === propertyId));
  }

  function getTotal() {
    const amount = Number(form.rent_amount);
    if (!amount) return null;
    const type = PAYMENT_TYPES.find(p => p.label === form.payment_type);
    return amount * (type?.multiplier || 1);
  }

  async function handleSave() {
    if (!form.tenant_id || !form.rent_amount) return;
    setSaving(true);
    const payload = {
      property_id: form.property_id || null,
      unit_id: form.unit_id || null,
      tenant_id: form.tenant_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      rent_amount: Number(form.rent_amount),
      payment_type: form.payment_type,
      notes: form.notes || null,
    };

    if (editingId) {
      // لو غيرنا الوحدة — نرجع القديمة لشاغرة
      const oldLease = leases.find(l => l.id === editingId);
      if (oldLease?.unit_id && oldLease.unit_id !== form.unit_id) {
        await supabase.from("units").update({ status: "\u0634\u0627\u063a\u0631\u0629" }).eq("id", oldLease.unit_id);
      }
      await supabase.from("leases").update(payload).eq("id", editingId);
    } else {
      await supabase.from("leases").insert([payload]);
    }

    // تحديث حالة الوحدة الجديدة لمؤجرة
    if (form.unit_id) {
      await supabase.from("units").update({ status: "\u0645\u0624\u062c\u0631\u0629" }).eq("id", form.unit_id);
    }

    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(lease) {
    if (!window.confirm("\u062d\u0630\u0641 \u0627\u0644\u0639\u0642\u062f\u061f")) return;
    setDeletingId(lease.id);
    await supabase.from("leases").delete().eq("id", lease.id);
    // ترجع الوحدة لشاغرة
    if (lease.unit_id) {
      await supabase.from("units").update({ status: "\u0634\u0627\u063a\u0631\u0629" }).eq("id", lease.unit_id);
    }
    setDeletingId(null);
    fetchAll();
  }

  const total = getTotal();

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif", padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ padding: "8px 16px", marginBottom: "20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        \u2190 \u0631\u062c\u0648\u0639 \u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645
      </button>

      <h1 style={{ margin: "0 0 4px" }}>\u0627\u0644\u0639\u0642\u0648\u062f</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>\u0625\u062f\u0627\u0631\u0629 \u0639\u0642\u0648\u062f \u0627\u0644\u0625\u064a\u062c\u0627\u0631</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + \u0625\u0636\u0627\u0641\u0629 \u0639\u0642\u062f \u062c\u062f\u064a\u062f
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          \u062a\u062d\u062f\u064a\u062b
        </button>
      </div>

      {loading && <p>\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...</p>}

      {!loading && leases.length === 0 && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
          \u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0642\u0648\u062f \u0645\u0633\u062c\u0651\u0644\u0629 \u062d\u0627\u0644\u064a\u0627\u064b
        </div>
      )}

      {!loading && leases.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "right" }}>
              {["\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631", "\u0627\u0644\u0639\u0642\u0627\u0631", "\u0631\u0642\u0645 \u0627\u0644\u0648\u062d\u062f\u0629", "\u0646\u0648\u0639 \u0627\u0644\u0648\u062d\u062f\u0629", "\u0646\u0648\u0639 \u0627\u0644\u062f\u0641\u0639", "\u0627\u0644\u0645\u0628\u0644\u063a", "\u0627\u0644\u0628\u062f\u0627\u064a\u0629", "\u0627\u0644\u0646\u0647\u0627\u064a\u0629", "\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a", ""].map(h => (
                <th key={h} style={{ padding: "12px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leases.map(l => {
              const tenant = tenants.find(t => t.id === l.tenant_id);
              const property = properties.find(p => p.id === l.property_id);
              const unit = units.find(u => u.id === l.unit_id);
              return (
                <tr key={l.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{tenant?.name || "\u2014"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{property?.name || "\u2014"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{unit?.unit_number || "\u2014"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{unit?.unit_type || "\u2014"}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>
                      {l.payment_type || "\u2014"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + " \u0631\u064a\u0627\u0644" : "\u2014"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{l.start_date || "\u2014"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{l.end_date || "\u2014"}</td>
                  <td style={{ padding: "12px", color: "#6b7280", maxWidth: "200px", whiteSpace: "normal", wordBreak: "break-word" }}>{l.notes || "\u2014"}</td>
                  <td style={{ padding: "12px" }}>
                    <button onClick={() => openEditForm(l)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer", marginLeft: 6 }}>\u062a\u0639\u062f\u064a\u0644</button>
                    <button onClick={() => handleDelete(l)} disabled={deletingId === l.id} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                      {deletingId === l.id ? "..." : "\u062d\u0630\u0641"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 520, maxWidth: "95%", direction: "rtl", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1rem" }}>{editingId ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0639\u0642\u062f" : "\u0625\u0636\u0627\u0641\u0629 \u0639\u0642\u062f \u062c\u062f\u064a\u062f"}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0627\u0644\u0639\u0642\u0627\u0631</label>
                <select value={form.property_id} onChange={e => handlePropertyChange(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">\u0627\u062e\u062a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0627\u0644\u0648\u062d\u062f\u0629</label>
                <select value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">\u0627\u062e\u062a\u0631 \u0627\u0644\u0648\u062d\u062f\u0629</option>
                  {filteredUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unit_number} {u.status === "\u0634\u0627\u063a\u0631\u0629" ? "(\u0634\u0627\u063a\u0631\u0629)" : u.status === "\u0635\u064a\u0627\u0646\u0629" ? "(\u0635\u064a\u0627\u0646\u0629)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631</label>
                <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0647\u0627\u064a\u0629</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0646\u0648\u0639 \u0627\u0644\u062f\u0641\u0639</label>
                <select value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {PAYMENT_TYPES.map(p => <option key={p.label}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0627\u0644\u0645\u0628\u0644\u063a (\u0631\u064a\u0627\u0644)</label>
                <input type="text" value={form.rent_amount} onChange={e => setForm({ ...form, rent_amount: e.target.value })}
                  placeholder="\u0623\u062f\u062e\u0644 \u0627\u0644\u0645\u0628\u0644\u063a"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>

            {total && (
              <div style={{ margin: "12px 0", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 16px" }}>
                <span style={{ color: "#6b7280", fontSize: 13 }}>\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0633\u0646\u0648\u064a: </span>
                <span style={{ fontWeight: 700, fontSize: 18, color: "#1d4ed8" }}>{total.toLocaleString()} \u0631\u064a\u0627\u0644</span>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>\u0645\u0644\u0627\u062d\u0638\u0627\u062a (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>\u0625\u0644\u063a\u0627\u0621</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer" }}>
                {saving ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : editingId ? "\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644" : "\u0625\u0636\u0627\u0641\u0629"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}