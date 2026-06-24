import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function Properties({ onBack }) {
  const [properties, setProperties] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", total_units: "", owner_note: "" });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const { data } = await supabase.from("properties").select("*").order("created_at");
    setProperties(data || []);
  }

  function handleEdit(p) {
    setForm({ name: p.name, address: p.address, total_units: p.total_units, owner_note: p.owner_note || "" });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = { name: form.name, address: form.address, total_units: Number(form.total_units), owner_note: form.owner_note };
    if (editingId) {
      await supabase.from("properties").update(payload).eq("id", editingId);
    } else {
      await supabase.from("properties").insert([payload]);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", address: "", total_units: "", owner_note: "" });
    fetchAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("حذف العقار؟")) return;
    await supabase.from("properties").delete().eq("id", id);
    fetchAll();
  }

  const inputStyle = { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccd6e0", fontSize: "15px", fontFamily: "Tahoma, Arial, sans-serif", boxSizing: "border-box", marginBottom: "12px" };

  return (
    <div style={{ padding: "32px", fontFamily: "Tahoma, Arial, sans-serif", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <h2 style={{ color: "#1B4D7A", margin: 0 }}>العقارات</h2>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: "", address: "", total_units: "", owner_note: "" }); }} style={{ padding: "8px 20px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}>+ اضافة عقار</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", padding: "24px", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ color: "#1B4D7A", marginBottom: "16px" }}>{editingId ? "تعديل عقار" : "عقار جديد"}</h3>
          <input style={inputStyle} placeholder="اسم العقار" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={inputStyle} placeholder="العنوان" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <input style={inputStyle} placeholder="عدد الوحدات" type="number" value={form.total_units} onChange={e => setForm({ ...form, total_units: e.target.value })} />
          <input style={inputStyle} placeholder="ملاحظات" value={form.owner_note} onChange={e => setForm({ ...form, owner_note: e.target.value })} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}>{saving ? "جاري الحفظ..." : "حفظ"}</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "10px 24px", background: "#e0e7ef", color: "#1B4D7A", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}>الغاء</button>
          </div>
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
        <thead style={{ background: "#1B4D7A", color: "#fff" }}>
          <tr>
            <th style={{ padding: "12px" }}>اسم العقار</th>
            <th style={{ padding: "12px" }}>العنوان</th>
            <th style={{ padding: "12px" }}>عدد الوحدات</th>
            <th style={{ padding: "12px" }}>ملاحظات</th>
            <th style={{ padding: "12px" }}>اجراءات</th>
          </tr>
        </thead>
        <tbody>
          {properties.map(p => (
            <tr key={p.id} style={{ borderBottom: "1px solid #e0e7ef", textAlign: "center" }}>
              <td style={{ padding: "12px" }}>{p.name}</td>
              <td style={{ padding: "12px" }}>{p.address}</td>
              <td style={{ padding: "12px" }}>{p.total_units}</td>
              <td style={{ padding: "12px" }}>{p.owner_note}</td>
              <td style={{ padding: "12px" }}>
                <button onClick={() => handleEdit(p)} style={{ marginLeft: "8px", padding: "6px 14px", background: "#e67e22", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}>تعديل</button>
                <button onClick={() => handleDelete(p.id)} style={{ padding: "6px 14px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "Tahoma, Arial, sans-serif" }}>حذف</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


