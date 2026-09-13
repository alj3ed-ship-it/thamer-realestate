import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const T = { back: "⬅ رجوع", print: "🖨 طباعة", title: "تفاصيل العقد" };

export default function LeaseContractView({ leaseId, onBack }) {
  const [lease, setLease] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [leaseId]);

  async function load() {
    setLoading(true);
    const { data: leaseData } = await supabase
      .from("leases")
      .select(`
        id, lease_number, start_date_hijri, end_date_hijri, start_date, end_date,
        payment_type, payment_frequency, rent_amount, contract_value, status, notes,
        amount_includes_vat, tax_enabled,
        tenants ( full_name, name ),
        properties ( name ),
        lease_units ( units ( unit_number, unit_type ) )
      `)
      .eq("id", leaseId)
      .single();

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("id, installment_number, due_date_hijri, due_date_gregorian, amount_due, amount_paid, status, payment_date_hijri")
      .eq("lease_id", leaseId)
      .order("due_date_gregorian", { ascending: true });

    setLease(leaseData);
    setPayments(paymentsData || []);
    setLoading(false);
  }

  if (loading) return <div style={{ padding: "22px", fontFamily: "Cairo, sans-serif" }}>جاري التحميل...</div>;
  if (!lease) return <div style={{ padding: "22px", fontFamily: "Cairo, sans-serif" }}>تعذر إيجاد العقد</div>;

  const tenantName = lease.tenants?.full_name || lease.tenants?.name || "—";
  const propertyName = lease.properties?.name || "—";
  const unitsText = (lease.lease_units || []).map((lu) => lu.units?.unit_number).filter(Boolean).join("، ") || "—";
  const totalDue = payments.reduce((s, p) => s + (Number(p.amount_due) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);

  return (
    <div style={{ padding: "18px 22px", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
        <button onClick={onBack} style={{
          padding: "8px 16px", background: "#eee", border: "none", borderRadius: "8px",
          cursor: "pointer", fontFamily: "Cairo, sans-serif"
        }}>{T.back}</button>
        <button onClick={() => window.print()} style={{
          padding: "8px 16px", background: "#1B4D7A", color: "#fff", border: "none",
          borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif"
        }}>{T.print}</button>
      </div>

      <div style={{ background: "#fff", borderRadius: "12px", padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <h2 style={{ color: "#1B4D7A", marginTop: 0 }}>{T.title}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginBottom: "20px", fontSize: "14px" }}>
          <div><b>المستأجر:</b> {tenantName}</div>
          <div><b>العقار:</b> {propertyName}</div>
          <div><b>الوحدة/الوحدات:</b> {unitsText}</div>
          <div><b>رقم العقد:</b> {lease.lease_number || "—"}</div>
          <div><b>تاريخ البداية (هجري):</b> {lease.start_date_hijri || "—"}</div>
          <div><b>تاريخ النهاية (هجري):</b> {lease.end_date_hijri || "—"}</div>
          <div><b>تاريخ البداية (ميلادي):</b> {lease.start_date || "—"}</div>
          <div><b>تاريخ النهاية (ميلادي):</b> {lease.end_date || "—"}</div>
          <div><b>نوع الدفع:</b> {lease.payment_type || lease.payment_frequency || "—"}</div>
          <div><b>قيمة العقد:</b> {(lease.contract_value || lease.rent_amount || 0).toLocaleString()} ريال</div>
          <div><b>الحالة:</b> {lease.status === "active" ? "نشط" : lease.status === "منتهي" ? "ملغي" : lease.status}</div>
          <div><b>خاضع للضريبة:</b> {lease.tax_enabled ? (lease.amount_includes_vat ? "نعم — شامل الضريبة" : "نعم — غير شامل الضريبة") : "لا"}</div>
        </div>

        <h3 style={{ color: "#1B4D7A", fontSize: "16px", marginBottom: "10px" }}>جدول الدفعات ({payments.length})</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f0f4f8" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>تاريخ الاستحقاق (هجري)</th>
              <th style={thStyle}>تاريخ الاستحقاق (ميلادي)</th>
              <th style={thStyle}>المبلغ المستحق</th>
              <th style={thStyle}>المبلغ المدفوع</th>
              <th style={thStyle}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{p.installment_number || idx + 1}</td>
                <td style={tdStyle}>{p.due_date_hijri || "—"}</td>
                <td style={tdStyle}>{p.due_date_gregorian || "—"}</td>
                <td style={tdStyle}>{Number(p.amount_due || 0).toLocaleString()} ريال</td>
                <td style={tdStyle}>{Number(p.amount_paid || 0).toLocaleString()} ريال</td>
                <td style={tdStyle}>{p.status}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: "bold", background: "#f7faff" }}>
              <td style={tdStyle} colSpan={3}>الإجمالي</td>
              <td style={tdStyle}>{totalDue.toLocaleString()} ريال</td>
              <td style={tdStyle}>{totalPaid.toLocaleString()} ريال</td>
              <td style={tdStyle}></td>
            </tr>
          </tfoot>
        </table>

        {lease.notes && (
          <div style={{ marginTop: "18px", fontSize: "13px", color: "#555" }}>
            <b>ملاحظات:</b> {lease.notes}
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: "8px 10px", textAlign: "right", border: "1px solid #e0e0e0" };
const tdStyle = { padding: "8px 10px", textAlign: "right", border: "1px solid #e0e0e0" };