import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function PropertyDetail({ id, onBack }) {
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUnit, setEditUnit] = useState(null);
  const [form, setForm] = useState({
    unit_number: "", unit_type: "شقة", floor: "",
    area_sqm: "", monthly_rent: "", status: "شاغرة", notes: ""
  });

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    setLoading(true);
    const { data: prop } = await supabase.from("properties").select("*").eq("id", id).single();
    const { data: u } = await supabase.from("units").select("*").eq("property_id", id).order("created_at");
    setProperty(prop);
    setUnits(u || []);
    setLoading(false);
  }

  function openAdd() {
    setEditUnit(null);
    setForm({ unit_number: "", unit_type: "شقة", floor: "", area_sqm: "", monthly_rent: "", status: "شاغرة", notes: "" });
    setShowForm(true);
  }

  function openEdit(unit) {
    setEditUnit(unit);
    setForm({ unit_number: unit.unit_number, unit_type: unit.unit_type, floor: unit.floor || "",
      area_sqm: unit.area_sqm || "", monthly_rent: unit.monthly_rent || "", status: unit.status, notes: unit.notes || "" });
    setShowForm(true);
  }

  async function saveUnit() {
    const data = { ...form, property_id: id,
      area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null };
    if (editUnit) {
      await supabase.from("units").update(data).eq("id", editUnit.id).select();
    } else {
      await supabase.from("units").insert(data);
    }
    setShowForm(false);
    fetchAll();
  }

  async function deleteUnit(uid) {
    if (!confirm("تأكيد حذف الوحدة؟")) return;
    await supabase.from("units").delete().eq("id", uid);
    fetchAll();
  }

  const statusColor = { "مشغولة": "#16a34a", "شاغرة": "#6b7280", "تحت الصيانة": "#d97706" };
  const statusBg = { "مشغولة": "#dcfce7", "شاغرة": "#f3f4f6", "تحت الصيانة": "#fef3c7" };

  const occupied = units.filter(u => u.status === "مشغولة").length;
  const vacant = units.filter(u => u.status === "شاغرة").length;

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>جاري التحميل...</div>;
  if (!property) return <div style={{ padding: "2rem" }}>العقار غير موجود</div>;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>{property.name}</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>{property.address}</p>
        </div>
        <button onClick={onBack} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
          ← رجوع للعقارات
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
        {[["إجمالي الوحدات", units.length, "#111"], ["مشغولة", occupied, "#16a34a"], ["شاغرة", vacant, "#6b7280"]].map(([label, val, color]) => (
          <div key={label} style={{ background: "#f9fafb", borderRadius: 10, padding: "1rem", border: "1px solid #e5e7eb" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 600, color }}>{val}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem", marginBottom: "1.5rem" }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>مخطط الوحدات</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {units.map(u => (
            <div key={u.id} onClick={() => openEdit(u)}
              style={{ background: statusBg[u.status], border: `1px solid ${statusColor[u.status]}33`, borderRadius: 8, padding: "10px 4px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: statusColor[u.status] }}>{u.unit_number}</div>
            </div>
          ))}
          {units.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13, gridColumn: "span 6" }}>لا توجد وحدات بعد</p>}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "#6b7280" }}>
          {[["مشغولة", "#16a34a", "#dcfce7"], ["شاغرة", "#6b7280", "#f3f4f6"], ["تحت الصيانة", "#d97706", "#fef3c7"]].map(([l, c, bg]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${c}44`, display: "inline-block" }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>الوحدات</h3>
        <button onClick={openAdd} style={{ padding: "8px 16px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>
          + إضافة وحدة
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              {["الوحدة", "النوع", "الدور", "المساحة", "الإيجار الشهري", "الحالة", ""].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 500, color: "#6b7280" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 12px" }}>{u.unit_number}</td>
                <td style={{ padding: "10px 12px", color: "#6b7280" }}>{u.unit_type}</td>
                <td style={{ padding: "10px 12px", color: "#6b7280" }}>{u.floor || "—"}</td>
                <td style={{ padding: "10px 12px", color: "#6b7280" }}>{u.area_sqm ? `${u.area_sqm} م²` : "—"}</td>
                <td style={{ padding: "10px 12px" }}>{u.monthly_rent ? `${Number(u.monthly_rent).toLocaleString()} ريال` : "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ background: statusBg[u.status], color: statusColor[u.status], padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>{u.status}</span>
                </td>
                <td style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
                  <button onClick={() => openEdit(u)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>تعديل</button>
                  <button onClick={() => deleteUnit(u.id)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", color: "#dc2626", cursor: "pointer" }}>حذف</button>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>لا توجد وحدات — اضغط "إضافة وحدة" للبدء</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 480, direction: "rtl" }}>
            <h3 style={{ margin: "0 0 1rem" }}>{editUnit ? "تعديل الوحدة" : "إضافة وحدة جديدة"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["unit_number", "رقم/اسم الوحدة"], ["floor", "الدور"], ["area_sqm", "المساحة (م²)"], ["monthly_rent", "الإيجار الشهري (ريال)"]].map(([key, label]) => (
                <div key={key}>
                  <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>النوع</label>
                <select value={form.unit_type} onChange={e => setForm({ ...form, unit_type: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {["شقة", "محل", "مكتب", "استوديو", "أخرى"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>الحالة</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  {["شاغرة", "مشغولة", "تحت الصيانة"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>ملاحظات</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>إلغاء</button>
              <button onClick={saveUnit} style={{ padding: "8px 20px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>
                {editUnit ? "حفظ التعديل" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}