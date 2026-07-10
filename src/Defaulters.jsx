import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import ExportToolbar from "./components/ExportToolbar";

export default function Defaulters({ onBack }) {
  const [defaulters, setDefaulters] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedDefaulter, setSelectedDefaulter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({ tenant_id: "", total_amount: "", notes: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_date: "", notes: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [d, t, p] = await Promise.all([
      supabase.from("defaulters").select("*").order("created_at", { ascending: false }),
      supabase.from("tenants").select("id, name, phone"),
      supabase.from("defaulter_payments").select("*").order("payment_date", { ascending: false }),
    ]);
    setDefaulters(d.data || []);
    setTenants(t.data || []);
    setPayments(p.data || []);
    setLoading(false);
  }

  function getTenant(tenantId) {
    return tenants.find(t => t.id === tenantId);
  }

  function getPaymentsForDefaulter(defaulterId) {
    return payments.filter(p => p.defaulter_id === defaulterId);
  }

  function getTotalPaid(defaulterId) {
    return getPaymentsForDefaulter(defaulterId).reduce((s, p) => s + Number(p.amount), 0);
  }

  function getRemaining(defaulter) {
    return Number(defaulter.total_amount) - getTotalPaid(defaulter.id);
  }

  // إحصائيات
  const totalDebt = defaulters.reduce((s, d) => s + Number(d.total_amount), 0);
  const totalCollected = defaulters.reduce((s, d) => s + getTotalPaid(d.id), 0);
  const totalRemaining = totalDebt - totalCollected;

  function openAddForm() {
    setEditingId(null);
    setForm({ tenant_id: "", total_amount: "", notes: "" });
    setShowForm(true);
  }

  function openEditForm(d) {
    setEditingId(d.id);
    setForm({ tenant_id: d.tenant_id || "", total_amount: d.total_amount || "", notes: d.notes || "" });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.tenant_id || !form.total_amount) return;
    setSaving(true);
    const payload = {
      tenant_id: form.tenant_id,
      total_amount: Number(form.total_amount),
      notes: form.notes || null,
    };
    if (editingId) {
      await supabase.from("defaulters").update(payload).eq("id", editingId);
    } else {
      await supabase.from("defaulters").insert([payload]);
    }
    setSaving(false);
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("حذف المتعثر؟")) return;
    setDeletingId(id);
    await supabase.from("defaulters").delete().eq("id", id);
    setDeletingId(null);
    if (selectedDefaulter?.id === id) setSelectedDefaulter(null);
    fetchAll();
  }

  async function handleAddPayment() {
    if (!paymentForm.amount || !paymentForm.payment_date) return;
    setSaving(true);
    await supabase.from("defaulter_payments").insert([{
      defaulter_id: selectedDefaulter.id,
      amount: Number(paymentForm.amount),
      payment_date: paymentForm.payment_date,
      notes: paymentForm.notes || null,
    }]);
    setSaving(false);
    setShowPaymentForm(false);
    setPaymentForm({ amount: "", payment_date: "", notes: "" });
    fetchAll();
  }

  async function handleDeletePayment(id) {
    if (!window.confirm("حذف الدفعة؟")) return;
    await supabase.from("defaulter_payments").delete().eq("id", id);
    fetchAll();
  }

  const exportData = defaulters.map((d) => {
    const tenant = getTenant(d.tenant_id);
    const paid = getTotalPaid(d.id);
    const remaining = getRemaining(d);
    return {
      tenant: tenant?.name || "—",
      phone: tenant?.phone || "—",
      total: `${Number(d.total_amount).toLocaleString()} ر.س`,
      paid: `${paid.toLocaleString()} ر.س`,
      remaining: `${remaining.toLocaleString()} ر.س`,
      notes: d.notes || "—",
    };
  });

  const exportStats = [
    { label: "إجمالي المتعثر", value: `${totalDebt.toLocaleString()} ريال`, color: "#991b1b" },
    { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#166534" },
    { label: "إجمالي الباقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#854d0e" },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "Cairo, sans-serif", padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      <button onClick={onBack} className="no-print" style={{ padding: "8px 16px", marginBottom: "20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
        ← رجوع للوحة التحكم
      </button>

      <h1 style={{ margin: "0 0 4px" }}>المتعثرون</h1>
      <p style={{ color: "#6b7280", margin: "0 0 24px" }}>متابعة الديون والمبالغ المتعثرة</p>

      {/* إحصائيات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "إجمالي المتعثر", value: totalDebt, bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
          { label: "إجمالي المحصّل", value: totalCollected, bg: "#dcfce7", color: "#166534", border: "#86efac" },
          { label: "إجمالي الباقي", value: totalRemaining, bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ color: card.color, fontSize: 13, marginBottom: 6 }}>{card.label}</div>
            <div style={{ color: card.color, fontWeight: 700, fontSize: 22 }}>{card.value.toLocaleString()} ريال</div>
          </div>
        ))}
      </div>

      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + إضافة متعثر
        </button>
        <button onClick={fetchAll} style={{ padding: "10px 20px", cursor: "pointer", borderRadius: 8, border: "1px solid #e5e7eb" }}>
          تحديث
        </button>
      </div>

      {loading && <p>جاري التحميل...</p>}

      {!loading && defaulters.length === 0 && (
        <div style={{ background: "#f9fafb", padding: 20, borderRadius: 10, color: "#6b7280", textAlign: "center" }}>
          لا يوجد متعثرون مسجّلون
        </div>
      )}

      {/* قائمة المتعثرين */}
      {!loading && defaulters.length > 0 && (
        <div id="defaulters-table">
          <ExportToolbar
            data={exportData}
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
            stats={exportStats}
          />

          <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
            {defaulters.map(d => {
              const tenant = getTenant(d.tenant_id);
              const paid = getTotalPaid(d.id);
              const remaining = getRemaining(d);
              const isSelected = selectedDefaulter?.id === d.id;
              return (
                <div key={d.id} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden", border: isSelected ? "2px solid #1B4D7A" : "2px solid transparent" }}>
                  <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                    onClick={() => setSelectedDefaulter(isSelected ? null : d)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#1B4D7A", fontSize: 16 }}>{tenant?.name || "—"}</div>
                      <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{tenant?.phone || "—"}</div>
                      {d.notes && <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>{d.notes}</div>}
                    </div>
                    <div style={{ textAlign: "center", minWidth: 100 }}>
                      <div style={{ fontSize: 12, color: "#991b1b" }}>المتعثر</div>
                      <div style={{ fontWeight: 700, color: "#991b1b" }}>{Number(d.total_amount).toLocaleString()} ر.س</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 100 }}>
                      <div style={{ fontSize: 12, color: "#166534" }}>المحصّل</div>
                      <div style={{ fontWeight: 700, color: "#166534" }}>{paid.toLocaleString()} ر.س</div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 100 }}>
                      <div style={{ fontSize: 12, color: "#854d0e" }}>الباقي</div>
                      <div style={{ fontWeight: 700, color: "#854d0e" }}>{remaining.toLocaleString()} ر.س</div>
                    </div>
                    <div className="no-print" style={{ display: "flex", gap: 6 }}>
                      <button onClick={e => { e.stopPropagation(); openEditForm(d); }}
                        style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer" }}>تعديل</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(d.id); }} disabled={deletingId === d.id}
                        style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                        {deletingId === d.id ? "..." : "حذف"}
                      </button>
                    </div>
                  </div>

                  {/* مدفوعات المتعثر */}
                  {isSelected && (
                    <div className="no-print" style={{ borderTop: "1px solid #f3f4f6", padding: "16px 20px", background: "#f9fafb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h4 style={{ margin: 0, color: "#1B4D7A" }}>سجل المدفوعات</h4>
                        <button onClick={() => { setShowPaymentForm(true); }}
                          style={{ padding: "6px 14px", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                          + إضافة دفعة
                        </button>
                      </div>
                      {getPaymentsForDefaulter(d.id).length === 0 ? (
                        <p style={{ color: "#9ca3af", fontSize: 13 }}>لا توجد مدفوعات بعد</p>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ textAlign: "right" }}>
                              {["المبلغ", "التاريخ", "ملاحظات", ""].map(h => (
                                <th key={h} style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontWeight: 500 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {getPaymentsForDefaulter(d.id).map(p => (
                              <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#166534" }}>{Number(p.amount).toLocaleString()} ر.س</td>
                                <td style={{ padding: "8px 12px", color: "#6b7280" }}>{p.payment_date || "—"}</td>
                                <td style={{ padding: "8px 12px", color: "#9ca3af" }}>{p.notes || "—"}</td>
                                <td style={{ padding: "8px 12px" }}>
                                  <button onClick={() => handleDeletePayment(p.id)}
                                    style={{ padding: "3px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>حذف</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل متعثر */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 480, maxWidth: "95%", direction: "rtl" }}>
            <h3 style={{ margin: "0 0 1rem" }}>{editingId ? "تعديل متعثر" : "إضافة متعثر جديد"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>المستأجر</label>
                <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14 }}>
                  <option value="">اختر المستأجر</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name} — {t.phone}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>المبلغ المتعثر (ريال)</label>
                <input type="text" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })}
                  placeholder="مثال: 15000"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>ملاحظات (اختياري)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>إلغاء</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer" }}>
                {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نموذج إضافة دفعة */}
      {showPaymentForm && selectedDefaulter && (
        <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 400, maxWidth: "95%", direction: "rtl" }}>
            <h3 style={{ margin: "0 0 1rem" }}>إضافة دفعة</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>المبلغ (ريال)</label>
                <input type="text" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="مثال: 5000"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>التاريخ</label>
                <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>ملاحظات (اختياري)</label>
                <textarea value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowPaymentForm(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>إلغاء</button>
              <button onClick={handleAddPayment} disabled={saving}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer" }}>
                {saving ? "جاري الحفظ..." : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}