import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const PAYMENT_TYPES = [
  { label: "\u0634\u0647\u0631\u064a", multiplier: 12 },
  { label: "\u0631\u0628\u0639 \u0633\u0646\u0648\u064a", multiplier: 4 },
  { label: "\u0646\u0635\u0641 \u0633\u0646\u0648\u064a", multiplier: 2 },
  { label: "\u0633\u0646\u0648\u064a", multiplier: 1 },
];

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

function hijriInputToGregorian(hijriStr) {
  const parts = hijriStr.replace(/-/g, "/").split("/");
  if (parts.length !== 3) return null;
  const hy = parseInt(parts[0]);
  const hm = parseInt(parts[1]);
  const hd = parseInt(parts[2]);
  if (isNaN(hy) || isNaN(hm) || isNaN(hd)) return null;
  if (hy < 1400 || hy > 1500 || hm < 1 || hm > 12 || hd < 1 || hd > 30) return null;
  const g = hijriToGregorian(hy, hm, hd);
  if (!g) return null;
  const mm = String(g.month).padStart(2, "0");
  const dd = String(g.day).padStart(2, "0");
  return `${g.year}-${mm}-${dd}`;
}

function gregorianToDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "numeric", day: "numeric" });
}

function getUnitSortKey(unit) {
  const num = Number(unit.unit_number);
  const typeOffset = ["\u0634\u0642\u0629", "\u0648\u0631\u0634\u0629"].includes(unit.unit_type) ? 1000 : 0;
  return num + typeOffset;
}

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
  const [filterProperty, setFilterProperty] = useState("\u0627\u0644\u0643\u0644");
  const [form, setForm] = useState({
    property_id: "", selected_unit_ids: [], tenant_id: "",
    start_hijri: "", end_hijri: "",
    start_date: "", end_date: "",
    rent_amount: "", payment_type: "\u0633\u0646\u0648\u064a", notes: "",
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
    setLoading(false);
  }

  function getLeaseUnitIds(leaseId) {
    return leaseUnits.filter(lu => lu.lease_id === leaseId).map(lu => lu.unit_id);
  }

  function getLeaseUnitsDisplay(leaseId) {
    const lease = leases.find(l => l.id === leaseId);
    const luIds = getLeaseUnitIds(leaseId);
    const allIds = lease?.unit_id ? [...new Set([lease.unit_id, ...luIds])] : luIds;
    return allIds.map(id => units.find(u => u.id === id)).filter(Boolean)
      .sort((a, b) => getUnitSortKey(a) - getUnitSortKey(b))
      .map(u => u.unit_number + " " + u.unit_type).join(" + ") || "\u2014";
  }

  function openAddForm() {
    setEditingId(null);
    setForm({ property_id: "", selected_unit_ids: [], tenant_id: "", start_hijri: "", end_hijri: "", start_date: "", end_date: "", rent_amount: "", payment_type: "\u0633\u0646\u0648\u064a", notes: "" });
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
      start_hijri: "", end_hijri: "",
      start_date: lease.start_date || "",
      end_date: lease.end_date || "",
      rent_amount: lease.rent_amount || "",
      payment_type: lease.payment_type || "\u0633\u0646\u0648\u064a",
      notes: lease.notes || "",
    });
    setFilteredUnits(
      units.filter(u => u.property_id === lease.property_id && (u.status === "\u0634\u0627\u063a\u0631\u0629" || currentUnitIds.includes(u.id)))
        .sort((a, b) => Number(a.unit_number) - Number(b.unit_number))
    );
    setShowForm(true);
  }

  function handlePropertyChange(propertyId) {
    setForm(prev => ({ ...prev, property_id: propertyId, selected_unit_ids: [] }));
    setFilteredUnits(
      units.filter(u => u.property_id === propertyId && u.status === "\u0634\u0627\u063a\u0631\u0629")
        .sort((a, b) => Number(a.unit_number) - Number(b.unit_number))
    );
  }

  function handleHijriChange(field, value) {
    const gregorian = hijriInputToGregorian(value);
    if (field === "start") {
      setForm(prev => ({ ...prev, start_hijri: value, start_date: gregorian || "" }));
    } else {
      setForm(prev => ({ ...prev, end_hijri: value, end_date: gregorian || "" }));
    }
  }

  function toggleUnit(unitId) {
    setForm(prev => {
      const ids = prev.selected_unit_ids;
      return ids.includes(unitId)
        ? { ...prev, selected_unit_ids: ids.filter(id => id !== unitId) }
        : { ...prev, selected_unit_ids: [...ids, unitId] };
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
      const { data: oldLU } = await supabase.from("lease_units").select("unit_id").eq("lease_id", editingId);
      const oldUnitIds = (oldLU || []).map(r => r.unit_id);
      for (const uid of oldUnitIds) await supabase.from("units").update({ status: "\u0634\u0627\u063a\u0631\u0629" }).eq("id", uid);
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
    for (const uid of form.selected_unit_ids) await supabase.from("units").update({ status: "\u0645\u0624\u062c\u0631\u0629" }).eq("id", uid);
    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(lease) {
    if (!window.confirm("\u062d\u0630\u0641 \u0627\u0644\u0639\u0642\u062f\u061f")) return;
    setDeletingId(lease.id);
    const { data: luData } = await supabase.from("lease_units").select("unit_id").eq("lease_id", lease.id);
    const unitIds = (luData || []).map(r => r.unit_id);
    for (const uid of unitIds) await supabase.from("units").update({ status: "\u0634\u0627\u063a\u0631\u0629" }).eq("id", uid);
    await supabase.from("lease_units").delete().eq("lease_id", lease.id);
    await supabase.from("leases").delete().eq("id", lease.id);
    setDeletingId(null);
    fetchAll();
  }

  const filteredLeases = filterProperty === "\u0627\u0644\u0643\u0644"
    ? leases
    : leases.filter(l => l.property_id === filterProperty);

  const total = getTotal();
  const startGregorian = form.start_hijri ? hijriInputToGregorian(form.start_hijri) : null;
  const endGregorian = form.end_hijri ? hijriInputToGregorian(form.end_hijri) : null;

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif", padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <button onClick={onBack} style={{ padding: "8px 16px", marginBottom: "20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        {"\u2190 \u0631\u062c\u0648\u0639 \u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645"}
      </button>
      <h1 style={{ margin: "0 0 4px" }}>{"\u0627\u0644\u0639\u0642\u0648\u062f"}</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>{"\u0625\u062f\u0627\u0631\u0629 \u0639\u0642\u0648\u062f \u0627\u0644\u0625\u064a\u062c\u0627\u0631"}</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          {"+ \u0625\u0636\u0627\u0641\u0629 \u0639\u0642\u062f \u062c\u062f\u064a\u062f"}
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          {"\u062a\u062d\u062f\u064a\u062b"}
        </button>
        <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, fontFamily: "Cairo, sans-serif", marginRight: "auto" }}>
          <option value="\u0627\u0644\u0643\u0644">{"\u0643\u0644 \u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062a"}</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading && <p>{"\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644..."}</p>}

      {!loading && filteredLeases.length === 0 && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
          {"\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0642\u0648\u062f"}
        </div>
      )}

      {!loading && filteredLeases.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#1B4D7A", textAlign: "right" }}>
                {["\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631", "\u0627\u0644\u0639\u0642\u0627\u0631", "\u0627\u0644\u0648\u062d\u062f\u0627\u062a", "\u0646\u0648\u0639 \u0627\u0644\u062f\u0641\u0639", "\u0627\u0644\u0645\u0628\u0644\u063a", "\u0627\u0644\u0628\u062f\u0627\u064a\u0629", "\u0627\u0644\u0646\u0647\u0627\u064a\u0629", "\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a", ""].map(h => (
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
                    <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{tenant?.name || "\u2014"}</td>
                    <td style={{ padding: "12px", color: "#6b7280" }}>{property?.name || "\u2014"}</td>
                    <td style={{ padding: "12px", color: "#6b7280" }}>{getLeaseUnitsDisplay(l.id)}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>
                        {l.payment_type || "\u2014"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + " \u0631\u064a\u0627\u0644" : "\u2014"}</td>
                    <td style={{ padding: "12px", color: "#6b7280", fontSize: 12 }}>
                      {l.start_date ? <div><div>{gregorianToDisplay(l.start_date)}</div><div style={{ color: "#9ca3af", fontSize: 11 }}>{l.start_date}</div></div> : "\u2014"}
                    </td>
                    <td style={{ padding: "12px", color: "#6b7280", fontSize: 12 }}>
                      {l.end_date ? <div><div>{gregorianToDisplay(l.end_date)}</div><div style={{ color: "#9ca3af", fontSize: 11 }}>{l.end_date}</div></div> : "\u2014"}
                    </td>
                    <td style={{ padding: "12px", color: "#6b7280", maxWidth: "160px", whiteSpace: "normal", wordBreak: "break-word" }}>{l.notes || "\u2014"}</td>
                    <td style={{ padding: "12px" }}>
                      <button onClick={() => openEditForm(l)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer", marginLeft: 6 }}>{"\u062a\u0639\u062f\u064a\u0644"}</button>
                      <button onClick={() => handleDelete(l)} disabled={deletingId === l.id} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                        {deletingId === l.id ? "..." : "\u062d\u0630\u0641"}
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
            <h3 style={{ margin: "0 0 1rem" }}>{editingId ? "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0639\u0642\u062f" : "\u0625\u0636\u0627\u0641\u0629 \u0639\u0642\u062f \u062c\u062f\u064a\u062f"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{"\u0627\u0644\u0639\u0642\u0627\u0631"}</label>
                <select value={form.property_id} onChange={e => handlePropertyChange(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">{"\u0627\u062e\u062a\u0631 \u0627\u0644\u0639\u0642\u0627\u0631"}</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {form.property_id && (
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 8 }}>{"\u0627\u0644\u0648\u062d\u062f\u0627\u062a (\u0627\u062e\u062a\u0631 \u0648\u0627\u062d\u062f\u0629 \u0623\u0648 \u0623\u0643\u062b\u0631)"}</label>
                  {filteredUnits.length === 0 ? (
                    <div style={{ color: "#9ca3af", fontSize: 13 }}>{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0648\u062d\u062f\u0627\u062a \u0634\u0627\u063a\u0631\u0629"}</div>
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
                      {"\u0627\u0644\u0645\u062d\u062f\u062f: "}{form.selected_unit_ids.map(id => units.find(u => u.id === id)?.unit_number).join(" + ")}
                    </div>
                  )}
                </div>
              )}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{"\u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631"}</label>
                <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">{"\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u062a\u0623\u062c\u0631"}</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0628\u062f\u0627\u064a\u0629 (\u0647\u062c\u0631\u064a)"}</label>
                <input type="text" value={form.start_hijri} onChange={e => handleHijriChange("start", e.target.value)}
                  placeholder="\u0645\u062b\u0627\u0644: 1448/1/1"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${form.start_hijri && !startGregorian ? "#f87171" : "#e5e7eb"}`, fontSize: 14, boxSizing: "border-box" }} />
                {startGregorian && <div style={{ fontSize: 11, color: "#059669", marginTop: 3 }}>{"\u2190 "}{startGregorian}</div>}
                {form.start_hijri && !startGregorian && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{"\u062a\u0627\u0631\u064a\u062e \u063a\u064a\u0631 \u0635\u062d\u064a\u062d"}</div>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0646\u0647\u0627\u064a\u0629 (\u0647\u062c\u0631\u064a)"}</label>
                <input type="text" value={form.end_hijri} onChange={e => handleHijriChange("end", e.target.value)}
                  placeholder="\u0645\u062b\u0627\u0644: 1449/1/1"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${form.end_hijri && !endGregorian ? "#f87171" : "#e5e7eb"}`, fontSize: 14, boxSizing: "border-box" }} />
                {endGregorian && <div style={{ fontSize: 11, color: "#059669", marginTop: 3 }}>{"\u2190 "}{endGregorian}</div>}
                {form.end_hijri && !endGregorian && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{"\u062a\u0627\u0631\u064a\u062e \u063a\u064a\u0631 \u0635\u062d\u064a\u062d"}</div>}
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{"\u0646\u0648\u0639 \u0627\u0644\u062f\u0641\u0639"}</label>
                <select value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {PAYMENT_TYPES.map(p => <option key={p.label}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{"\u0627\u0644\u0645\u0628\u0644\u063a (\u0631\u064a\u0627\u0644)"}</label>
                <input type="text" value={form.rent_amount} onChange={e => setForm({ ...form, rent_amount: e.target.value })}
                  placeholder="\u0623\u062f\u062e\u0644 \u0627\u0644\u0645\u0628\u0644\u063a"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            {total && (
              <div style={{ margin: "12px 0", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between" }}>
                <div><span style={{ color: "#6b7280", fontSize: 13 }}>{"\u0627\u0644\u0625\u064a\u062c\u0627\u0631 \u0627\u0644\u0633\u0646\u0648\u064a: "}</span><span style={{ fontWeight: 700, fontSize: 16, color: "#1d4ed8" }}>{total.annual.toLocaleString()} {"\u0631\u064a\u0627\u0644"}</span></div>
                <div><span style={{ color: "#6b7280", fontSize: 13 }}>{"\u0643\u0644 \u062f\u0641\u0639\u0629: "}</span><span style={{ fontWeight: 700, fontSize: 16, color: "#059669" }}>{total.installment.toLocaleString()} {"\u0631\u064a\u0627\u0644 \u00d7 "}{total.count}</span></div>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{"\u0645\u0644\u0627\u062d\u0638\u0627\u062a (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)"}</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>{"\u0625\u0644\u063a\u0627\u0621"}</button>
              <button onClick={handleSave} disabled={saving || form.selected_unit_ids.length === 0}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer", opacity: form.selected_unit_ids.length === 0 ? 0.5 : 1 }}>
                {saving ? "\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..." : editingId ? "\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644" : "\u0625\u0636\u0627\u0641\u0629"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}