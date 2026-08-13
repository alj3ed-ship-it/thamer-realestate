import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { LeaseStatusBadge } from "./leaseStatus";

export default function LeaseDetailsModal({ leaseId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!leaseId) return;
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaseId]);

  async function fetchDetails() {
    setLoading(true);
    const { data: lease } = await supabase
      .from("leases")
      .select(`
        *,
        properties ( name ),
        tenants ( name, note ),
        lease_units ( units ( unit_number, unit_type ) )
      `)
      .eq("id", leaseId)
      .single();

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("lease_id", leaseId)
      .order("installment_number");

    setData({ lease, payments: payments || [] });
    setLoading(false);
  }

  if (!leaseId) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
      onClick={onClose}>
      <div dir="rtl" style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: 560, maxWidth: "95%", maxHeight: "88vh", overflowY: "auto", fontFamily: "Cairo, sans-serif" }}
        onClick={(e) => e.stopPropagation()}>
        {loading && <p>جاري التحميل...</p>}
        {!loading && !data?.lease && <p style={{ color: "#e74c3c" }}>تعذر تحميل بيانات العقد.</p>}
        {!loading && data?.lease && (() => {
          const l = data.lease;
          const units = (l.lease_units || []).map(lu => lu.units).filter(Boolean);
          return (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: "0 0 6px" }}>
                    {l.lease_number ? `عقد رقم ${l.lease_number}` : "تفاصيل العقد"}
                  </h3>
                  <LeaseStatusBadge endDate={l.end_date} />
                </div>
                <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16, fontSize: 14 }}>
                <div><span style={{ color: "#6b7280" }}>المستأجر: </span><strong>{l.tenants?.name || "—"}</strong></div>
                <div><span style={{ color: "#6b7280" }}>النشاط: </span><strong>{l.tenants?.note || "—"}</strong></div>
                <div><span style={{ color: "#6b7280" }}>العقار: </span><strong>{l.properties?.name || "—"}</strong></div>
                <div><span style={{ color: "#6b7280" }}>الوحدات: </span><strong>{units.map(u => `${u.unit_type} ${u.unit_number}`).join(" + ") || "—"}</strong></div>
                <div><span style={{ color: "#6b7280" }}>تاريخ البداية: </span><strong>{l.start_date || "—"}{l.start_date_hijri ? ` (${l.start_date_hijri} هـ)` : ""}</strong></div>
                <div><span style={{ color: "#6b7280" }}>تاريخ النهاية: </span><strong>{l.end_date || "—"}{l.end_date_hijri ? ` (${l.end_date_hijri} هـ)` : ""}</strong></div>
                <div><span style={{ color: "#6b7280" }}>الإجمالي: </span><strong>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + " ريال" : "—"}</strong></div>
                <div><span style={{ color: "#6b7280" }}>نوع الدفع: </span><strong>{l.payment_type || "—"}</strong></div>
              </div>

              <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#374151" }}>جدول الدفعات</h4>
              {data.payments.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>لا توجد دفعات مسجلة</div>
              ) : (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: 8, textAlign: "right" }}>#</th>
                        <th style={{ padding: 8, textAlign: "right" }}>المبلغ</th>
                        <th style={{ padding: 8, textAlign: "right" }}>التاريخ</th>
                        <th style={{ padding: 8, textAlign: "right" }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p, i) => (
                        <tr key={p.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                          <td style={{ padding: 8 }}>{p.installment_number || i + 1}</td>
                          <td style={{ padding: 8, fontWeight: 700 }}>{Number(p.amount_due ?? p.amount ?? 0).toLocaleString()} ريال</td>
                          <td style={{ padding: 8 }}>{p.due_date_hijri || p.payment_date_hijri || p.payment_date || "—"}</td>
                          <td style={{ padding: 8 }}>{p.status || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
