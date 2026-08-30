import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { LeaseStatusBadge } from "./leaseStatus";

function parseHijriParts(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map((p) => parseInt(p));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function addHijriMonths(date, months) {
  const totalMonths = date.year * 12 + (date.month - 1) + months;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1, day: date.day };
}

function computeInstallmentHijri(startDateHijri, totalInstallments, installmentNumber) {
  const start = parseHijriParts(startDateHijri);
  if (!start || !totalInstallments) return null;
  const intervalMonths = 12 / totalInstallments;
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths;
  return addHijriMonths(start, Math.round(monthsToAdd));
}

function hijriToGregorian(hy, hm, hd) {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { year: "numeric", month: "numeric", day: "numeric" });
    function getHijriParts(d) {
      const parts = fmt.formatToParts(d);
      return {
        y: parseInt(parts.find((p) => p.type === "year").value),
        m: parseInt(parts.find((p) => p.type === "month").value),
        d: parseInt(parts.find((p) => p.type === "day").value),
      };
    }
    const epoch = new Date(Date.UTC(622, 6, 19));
    const approxDays = Math.round((hy - 1) * 354.36667 + (hm - 1) * 29.53 + hd);
    let guess = new Date(epoch.getTime() + approxDays * 86400000);
    for (let i = 0; i < 30; i++) {
      const cur = getHijriParts(guess);
      if (cur.y === hy && cur.m === hm && cur.d === hd) {
        return new Date(guess.getFullYear(), guess.getMonth(), guess.getDate());
      }
      const diffMonths = (hy - cur.y) * 12 + (hm - cur.m);
      const diffDays = Math.round(diffMonths * 29.53 + (hd - cur.d));
      const step = diffDays !== 0 ? diffDays : (hd > cur.d ? 1 : -1);
      guess = new Date(guess.getTime() + step * 86400000);
    }
    return null;
  } catch { return null; }
}

// 'paid' | 'partial' (جزئي متأخر) | 'partial_early' (جزئي مبكر — إيجابي) | 'overdue' | 'not_due'
function computeStatus(p, lease) {
  const due = Number(p.amount ?? p.amount_due ?? 0);
  const paid = Number(p.amount_paid || 0);
  if (paid > 0 && paid >= due && due > 0) return "paid";

  const hijri = computeInstallmentHijri(lease?.start_date_hijri, p.total_installments, p.installment_number);
  let subStatus = "overdue";
  if (hijri) {
    const g = hijriToGregorian(hijri.year, hijri.month, hijri.day);
    if (g) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      g.setHours(0, 0, 0, 0);
      subStatus = g <= today ? "overdue" : "not_due";
    }
  }
  if (paid > 0) return subStatus === "overdue" ? "partial" : "partial_early";
  return subStatus;
}

function statusBadge(computed) {
  const map = {
    paid: { bg: "#EAFAF1", color: "#27ae60", label: "مدفوع ✓" },
    partial: { bg: "#FEF9E7", color: "#f39c12", label: "جزئي ⚠" },
    partial_early: { bg: "#EAF4FB", color: "#2E86C1", label: "مدفوع مقدماً (جزئي) ✓" },
    not_due: { bg: "#FDF6E3", color: "#b7950b", label: "غير مستحق بعد ⏳" },
    overdue: { bg: "#FDEDEC", color: "#e74c3c", label: "متأخر ⏰" },
  };
  const s = map[computed] || map.overdue;
  return <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
}

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

    const paymentIds = (payments || []).map((p) => p.id);
    const { data: history } = paymentIds.length
      ? await supabase.from("payment_installments_history").select("*").in("payment_id", paymentIds).order("created_at", { ascending: true })
      : { data: [] };

    setData({ lease, payments: payments || [], history: history || [] });
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
                  <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: 460, borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={{ padding: 8, textAlign: "right" }}>#</th>
                        <th style={{ padding: 8, textAlign: "right" }}>المبلغ</th>
                        <th style={{ padding: 8, textAlign: "right" }}>التاريخ</th>
                        <th style={{ padding: 8, textAlign: "right" }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((p, i) => {
                        const due = Number(p.amount ?? p.amount_due ?? 0);
                        const paid = Number(p.amount_paid || 0);
                        const computed = computeStatus(p, l);
                        const history = data.history.filter((h) => h.payment_id === p.id);
                        return (
                          <tr key={p.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                            <td style={{ padding: 8 }}>{p.installment_number || i + 1}</td>
                            <td style={{ padding: 8, fontWeight: 700 }}>
                              {computed === "partial" || computed === "partial_early" ? (
                                <div style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>
                                  <span style={{ color: "#27ae60" }}>{paid.toLocaleString()}</span>
                                  <span style={{ color: "#9ca3af", margin: "0 3px" }}>|</span>
                                  <span style={{ color: computed === "partial_early" ? "#2E86C1" : "#d4ac0d" }}>{(due - paid).toLocaleString()}</span>
                                  <span style={{ color: "#9ca3af", margin: "0 3px" }}>|</span>
                                  <span style={{ color: "#e74c3c" }}>{due.toLocaleString()}</span>
                                </div>
                              ) : computed === "paid" && paid > due ? (
                                <div>
                                  <span>{paid.toLocaleString()} ريال</span>
                                  <div style={{ fontSize: 10, fontWeight: 600, color: "#e67e22" }}>زيادة {(paid - due).toLocaleString()} عن المستحق</div>
                                </div>
                              ) : (
                                `${due.toLocaleString()} ريال`
                              )}
                              {history.length > 1 && (
                                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 400, marginTop: 2 }}>
                                  {history.map((h, hi) => (
                                    <div key={h.id || hi}>• {Number(h.amount || 0).toLocaleString()}{h.payment_date_hijri ? ` — ${h.payment_date_hijri} هـ` : ""}</div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: 8 }}>
                              <div>{p.payment_date_hijri || p.payment_date || "—"}</div>
                              {p.first_partial_date_hijri && (
                                <div style={{ fontSize: 10, color: "#e67e22", marginTop: 2 }} title="تاريخ أول دفعة جزئية">
                                  أول جزئية: {p.first_partial_date_hijri} هـ
                                </div>
                              )}
                            </td>
                            <td style={{ padding: 8 }}>{statusBadge(computed)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
