import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import ExportToolbar from "./components/ExportToolbar";

const T = { title: "عقود الإيجار", back: "⬅ رجوع", print: "🖨 طباعة الصفحة" };

function statusLabel(status) {
  if (status === "active") return "نشط";
  if (status === "منتهي") return "ملغي";
  return status || "—";
}

function propertyRank(name = "") {
  if (name.includes("سلمان")) return 1;
  if (name.includes("براهيم") || name.includes("ابراهيم")) return 2;
  if (name.includes("الكبير")) return 3;
  if (name.includes("الصغير")) return 4;
  return 99;
}

export default function LeaseContracts({ onBack, onSelectLease }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [propertyFilter, setPropertyFilter] = useState("الكل");
  const [properties, setProperties] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: leases } = await supabase
      .from("leases")
      .select(`
        id, lease_number, start_date_hijri, end_date_hijri, start_date, end_date,
        payment_type, payment_frequency, rent_amount, contract_value, status,
        tax_enabled, amount_includes_vat, contract_file_url,
        tenants ( full_name, name ),
        properties ( name ),
        lease_units ( units ( unit_number ) )
      `);

    const { data: payments } = await supabase
      .from("payments")
      .select("lease_id, amount_due");

    const countByLease = {};
    (payments || []).forEach((p) => {
      countByLease[p.lease_id] = (countByLease[p.lease_id] || 0) + 1;
    });

    // قيد دائم: فقط العقود اللي عندها ملف عقد مرفوع فعلياً
    const withFile = (leases || []).filter((l) => !!l.contract_file_url);

    const merged = withFile.map((l) => {
      const unitNumbers = (l.lease_units || [])
        .map((lu) => lu.units?.unit_number)
        .filter(Boolean);
      const minUnit = unitNumbers.length
        ? Math.min(...unitNumbers.map((u) => {
            const n = parseInt(u, 10);
            return Number.isNaN(n) ? 9999 : n;
          }))
        : 9999;

      return {
        ...l,
        tenantName: l.tenants?.full_name || l.tenants?.name || "—",
        propertyName: l.properties?.name || "—",
        unitsText: unitNumbers.join("، ") || "—",
        minUnit,
        installmentsCount: countByLease[l.id] || 0,
        contractValue: l.contract_value || l.rent_amount || 0,
      };
    });

    merged.sort((a, b) => {
      const r = propertyRank(a.propertyName) - propertyRank(b.propertyName);
      if (r !== 0) return r;
      if (a.minUnit !== b.minUnit) return a.minUnit - b.minUnit;
      return (a.tenantName || "").localeCompare(b.tenantName || "", "ar");
    });

    setRows(merged);
    setProperties([...new Set(merged.map((r) => r.propertyName))]);
    setLoading(false);
  }

  const filtered = rows.filter((r) => {
    if (statusFilter !== "الكل" && r.status !== statusFilter) return false;
    if (propertyFilter !== "الكل" && r.propertyName !== propertyFilter) return false;
    return true;
  });

  // تجميع حسب العقار مع الحفاظ على ترتيب الوحدات
  const groups = [];
  filtered.forEach((r) => {
    let g = groups.find((g) => g.propertyName === r.propertyName);
    if (!g) {
      g = { propertyName: r.propertyName, items: [] };
      groups.push(g);
    }
    g.items.push(r);
  });
  groups.sort((a, b) => propertyRank(a.propertyName) - propertyRank(b.propertyName));

  const exportRows = groups.flatMap((g) => g.items).map((r) => ({
    tenant: r.tenantName,
    property: r.propertyName,
    unit: r.unitsText,
    leaseNumber: r.lease_number || "—",
    startDateHijri: r.start_date_hijri || "—",
    endDateHijri: r.end_date_hijri || "—",
    startDateGregorian: r.start_date || "—",
    endDateGregorian: r.end_date || "—",
    paymentType: r.payment_type || r.payment_frequency || "—",
    installments: r.installmentsCount,
    contractValue: `${Number(r.contractValue).toLocaleString()} ريال`,
    status: statusLabel(r.status),
    vat: r.tax_enabled ? (r.amount_includes_vat ? "شامل الضريبة" : "غير شامل الضريبة") : "غير خاضع",
  }));

  return (
    <div style={{ padding: "18px 22px", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .lc-print-area, .lc-print-area * { visibility: visible; }
          .lc-print-area { position: absolute; inset: 0; width: 100%; padding: 20px; }
          .lc-hide-print { display: none !important; }
        }
      `}</style>

      <div className="lc-hide-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <h2 style={{ color: "#1B4D7A", fontSize: "20px", margin: 0 }}>{T.title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ color: "#888", fontSize: "13px" }}>{filtered.length} عقد</div>
          <button onClick={() => window.print()} style={{
            padding: "8px 16px", background: "#1B4D7A", color: "#fff", border: "none",
            borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "13px"
          }}>{T.print}</button>
        </div>
      </div>

      <div className="lc-hide-print" style={{ marginBottom: "14px" }}>
        <ExportToolbar
          data={exportRows}
          columns={[
            { key: "tenant", label: "المستأجر" },
            { key: "property", label: "العقار" },
            { key: "unit", label: "الوحدة" },
            { key: "leaseNumber", label: "رقم العقد" },
            { key: "startDateHijri", label: "تاريخ البداية (هـ)" },
            { key: "endDateHijri", label: "تاريخ النهاية (هـ)" },
            { key: "startDateGregorian", label: "تاريخ البداية (م)" },
            { key: "endDateGregorian", label: "تاريخ النهاية (م)" },
            { key: "paymentType", label: "نوع الدفع" },
            { key: "installments", label: "عدد الدفعات" },
            { key: "contractValue", label: "قيمة العقد" },
            { key: "status", label: "الحالة" },
            { key: "vat", label: "الضريبة" },
          ]}
          filename="lease_contracts"
          title="عقود الإيجار"
        />
      </div>

      <div className="lc-hide-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", fontFamily: "Cairo, sans-serif" }}>
          <option value="الكل">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="منتهي">ملغي</option>
        </select>
        <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", fontFamily: "Cairo, sans-serif" }}>
          <option value="الكل">كل العقارات</option>
          {properties.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="lc-print-area">
        <h2 style={{ color: "#1B4D7A", fontSize: "18px", marginBottom: "4px" }}>{T.title}</h2>
        <div style={{ color: "#888", fontSize: "12px", marginBottom: "16px" }}>
          تعرض هذه الصفحة فقط العقود التي رُفع لها ملف عقد رسمي. أي مستأجر غير ظاهر هنا فعقده إما ملغي/منتهي أو لم يُرفع له عقد بعد.
        </div>

        {loading ? (
          <div style={{ color: "#666" }}>جاري التحميل...</div>
        ) : groups.length === 0 ? (
          <div style={{ color: "#888", padding: "20px", textAlign: "center" }}>لا توجد عقود مطابقة</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
            {groups.map((g) => (
              <div key={g.propertyName} style={{ breakInside: "avoid" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px",
                  paddingBottom: "8px", borderBottom: "2px solid #1B4D7A"
                }}>
                  <span style={{ fontSize: "17px", fontWeight: "bold", color: "#1B4D7A" }}>🏢 {g.propertyName}</span>
                  <span style={{
                    background: "#eaf2ff", color: "#1B4D7A", fontSize: "12px",
                    padding: "2px 10px", borderRadius: "10px"
                  }}>{g.items.length} عقد</span>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "14px"
                }}>
                  {g.items.map((r) => (
                    <div key={r.id} style={{
                      background: "#fff", borderRadius: "12px", padding: "16px",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.07)", display: "flex",
                      flexDirection: "column", gap: "8px", breakInside: "avoid",
                      borderTop: `3px solid ${r.status === "active" ? "#1B4D7A" : "#c0392b"}`
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontWeight: "bold", color: "#1B4D7A", fontSize: "15px", lineHeight: 1.3 }}>{r.tenantName}</div>
                        <span style={{
                          padding: "3px 9px", borderRadius: "12px", fontSize: "11px", whiteSpace: "nowrap",
                          background: r.status === "active" ? "#e6f7ee" : "#fdecea",
                          color: r.status === "active" ? "#1a7f4e" : "#c0392b"
                        }}>{statusLabel(r.status)}</span>
                      </div>

                      <div style={{ color: "#555", fontSize: "13px" }}>وحدة {r.unitsText}</div>
                      {r.lease_number && (
                        <div style={{ color: "#999", fontSize: "12px" }}>عقد رقم {r.lease_number}</div>
                      )}

                      <div style={{ borderTop: "1px solid #f0f0f0", margin: "4px 0" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666" }}>
                        <span>{r.start_date_hijri || "—"}</span>
                        <span>هـ ←</span>
                        <span>{r.end_date_hijri || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#aaa" }}>
                        <span>{r.start_date || "—"}</span>
                        <span>م ←</span>
                        <span>{r.end_date || "—"}</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                        <span style={{ color: "#666" }}>{r.payment_type || r.payment_frequency || "—"} · {r.installmentsCount} دفعة</span>
                        <span style={{ fontWeight: "bold", color: "#1B4D7A" }}>{Number(r.contractValue).toLocaleString()} ريال</span>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: "10px", fontSize: "10px",
                          background: r.lease_number ? "#eaf2ff" : "#f2f2f2",
                          color: r.lease_number ? "#1B4D7A" : "#777"
                        }}>{r.lease_number ? "📄 عقد Ejar" : "📎 ملف بدون رقم"}</span>

                        {r.tax_enabled && (
                          <span style={{
                            padding: "2px 8px", borderRadius: "10px", fontSize: "10px",
                            background: r.amount_includes_vat ? "#f3eaff" : "#fff4e0",
                            color: r.amount_includes_vat ? "#6b3fa0" : "#a06a1a"
                          }}>{r.amount_includes_vat ? "💰 شامل الضريبة" : "💰 غير شامل"}</span>
                        )}
                      </div>

                      <button onClick={() => onSelectLease(r.id)} className="lc-hide-print" style={{
                        marginTop: "6px", padding: "8px", background: "#1B4D7A", color: "#fff", border: "none",
                        borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "13px", width: "100%"
                      }}>عرض التفاصيل</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}