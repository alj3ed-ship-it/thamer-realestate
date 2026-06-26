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
  const [leaseUnits, setLeaseUnits] = useState([]);
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
    property_id: "", selected_unit_ids: [], tenant_id: "",
    start_date: "", end_date: "", rent_amount: "",
    payment_type: "سنوي", notes: "",
  });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [l, lu, p, u, t] = await Promise.all([
      supabase.from("leases").select("*").order("created_at", { ascending: false }),
      supabase.from("lease_units").select("*"),
      supabase.from("properties").select("id, name").order("name"),
      supabase.from("units").select("id, unit_number, unit_type, property_id, status"),
      supabase.from("tenants").select("id, name"),
    ]);
    setLeases(l.data || []);
    setLeaseUnits(lu.data || []);
    setProperties(p.data || []);
    setUnits(u.data || []);
    setTenants(t.data || []);
    setLoading(false);
  }

  function getLeaseUnitIds(leaseId) {
    return leaseUnits.filter(lu => lu.lease_id === leaseId).map(lu => lu.unit_id);
  }

  function getLeaseUnitsDisplay(leaseId) {
    const ids = getLeaseUnitIds(leaseId);
    return ids.map(id => units.find(u => u.id === id)).filter(Boolean)
      .map(u => u.unit_number).join(" + ") || "—";
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ property_id: "", selected_unit_ids: [], tenant_id: "", start_date: "", end_date: "", rent_amount: "", payment_type: "سنوي", notes: "" });
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
      start_date: lease.start_date || "",
      end_date: lease.end_date || "",
      rent_amount: lease.rent_amount || "",
      payment_type: lease.payment_type || "سنوي",
      notes: lease.notes || "",
    });
    setFilteredUnits(
      units.filter(u =>
        u.property_id === lease.property_id &&
        (u.status === "شاغرة" || currentUnitIds.includes(u.id))
      )
    );
    setShowForm(true);
  }

  function handlePropertyChange(propertyId) {
    setForm(prev => ({ ...prev, property_id: propertyId, selected_unit_ids: [] }));
    setFilteredUnits(
      units.filter(u =>
        u.property_id === propertyId &&
        (u.status === "شاغرة")
      )
    );
  }

  function toggleUnit(unitId) {
    setForm(prev => {
      const ids = prev.selected_unit_ids;
      if (ids.includes(unitId)) {
        return { ...prev, selected_unit_ids: ids.filter(id => id !== unitId) };
      } else {
        return { ...prev, selected_unit_ids: [...ids, unitId] };
      }
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
      rent_amount: Number(form.rent_amount),
      payment_type: form.payment_type,
      notes: form.notes || null,
    };

    let leaseId = editingId;

    if (editingId) {
      // جيب الوحدات من Supabase مباشرة
      const { data: oldLU } = await supabase.from("lease_units").select("unit_id").eq("lease_id", editingId);
      const oldUnitIds = (oldLU || []).map(r => r.unit_id);
      for (const uid of oldUnitIds) {
        await supabase.from("units").update({ status: "شاغرة" }).eq("id", uid);
      }
      await supabase.from("lease_units").delete().eq("lease_id", editingId);
      await supabase.from("leases").update(payload).eq("id", editingId);
    } else {
      const { data } = await supabase.from("leases").insert([payload]).select("id");
      leaseId = data?.[0]?.id;
    }

    if (leaseId) {
      const luRows = form.selected_unit_ids.map(uid => ({ lease_id: leaseId, unit_id: uid }));
      await supabase.from("lease_units").insert(luRows);
    }

    for (const uid of form.selected_unit_ids) {
      await supabase.from("units").update({ status: "مؤجرة" }).eq("id", uid);
    }

    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(lease) {
    if (!window.confirm("حذف العقد؟")) return;
    setDeletingId(lease.id);

    // جيب الوحدات من Supabase مباشرة — مو من الـ state
    const { data: luData } = await supabase.from("lease_units").select("unit_id").eq("lease_id", lease.id);
    const unitIds = (luData || []).map(r => r.unit_id);

    for (const uid of unitIds) {
      await supabase.from("units").update({ status: "شاغرة" }).eq("id", uid);
    }
    await supabase.from("lease_units").delete().eq("lease_id", lease.id);
    await supabase.from("leases").delete().eq("id", lease.id);
    setDeletingId(null);
    fetchAll();
  }

  const total = getTotal();

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif", padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ padding: "8px 16px", marginBottom: "20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        ← رجوع للوحة التحكم
      </button>

      <h1 style={{ margin: "0 0 4px" }}>العقود</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>إدارة عقود الإيجار</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + إضافة عقد جديد
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && leases.length === 0 && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
          لا توجد عقود مسجّلة حالياً
        </div>
      )}

      {!loading && leases.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "right" }}>
              {["المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "البداية", "النهاية", "الملاحظات", ""].map(h => (
                <th key={h} style={{ padding: "12px", borderBottom: "2px solid #e5e7eb", color: "#6b7280", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leases.map(l => {
              const tenant = tenants.find(t => t.id === l.tenant_id);
              const property = properties.find(p => p.id === l.property_id);
              return (
                <tr key={l.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{tenant?.name || "—"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{property?.name || "—"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{getLeaseUnitsDisplay(l.id)}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>
                      {l.payment_type || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + " ريال" : "—"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{l.start_date || "—"}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{l.end_date || "—"}</td>
                  <td style={{ padding: "12px", color: "#6b7280", maxWidth: "180px", whiteSpace: "normal", wordBreak: "break-word" }}>{l.notes || "—"}</td>
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
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 540, maxWidth: "95%", direction: "rtl", maxHeight: "90vh", overflowY: "auto" }}>
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
                  <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 8 }}>
                    الوحدات (اختر واحدة أو أكثر)
                  </label>
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
                            {u.status === "صيانة" ? " (صيانة)" : ""}
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

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>تاريخ البداية</label>
                <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>تاريخ النهاية</label>
                <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>نوع الدفع</label>
                <select value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {PAYMENT_TYPES.map(p => <option key={p.label}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>المبلغ (ريال)</label>
                <input type="text" value={form.rent_amount} onChange={e => setForm({ ...form, rent_amount: e.target.value })}
                  placeholder="أدخل المبلغ"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>

            {total && (
              <div style={{ margin: "12px 0", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
                <div><span style={{ color: "#6b7280", fontSize: 13 }}>الإيجار السنوي: </span><span style={{ fontWeight: 700, fontSize: 16, color: "#1d4ed8" }}>{total.annual.toLocaleString()} ريال</span></div>
                <div><span style={{ color: "#6b7280", fontSize: 13 }}>كل دفعة: </span><span style={{ fontWeight: 700, fontSize: 16, color: "#059669" }}>{total.installment.toLocaleString()} ريال � {total.count}</span></div>
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