import { useState, useEffect, useRef } from "react";
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

// ===== مساعدات تفاصيل الدفعات =====
function normalizeHijri(text) {
  if (!text) return null;
  const parts = String(text).replace(/-/g, "/").split("/").map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return String(text);
  let [y, m, d] = parts;
  if (y < 1300 && d >= 1300) { const t = y; y = d; d = t; }
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

function hijriKey(text) {
  const n = normalizeHijri(text);
  if (!n) return -1;
  const [y, m, d] = n.split("/").map((x) => parseInt(x, 10) || 0);
  return y * 10000 + m * 100 + d;
}

function installmentAmount(p) {
  return Number(p.amount ?? p.amount_due ?? 0);
}

function installmentDueText(p) {
  const h = normalizeHijri(p.due_date_hijri);
  const g = p.due_date_gregorian;
  if (h && g) return `${h} (${g})`;
  return h || g || "—";
}

function installmentTax(lease, p, amount) {
  if (!lease.tax_enabled) return 0;
  if (lease.tax_effective_hijri && hijriKey(p.due_date_hijri) < hijriKey(lease.tax_effective_hijri)) return 0;
  return lease.amount_includes_vat ? Math.round(amount - amount / 1.15) : Math.round(amount * 0.15);
}

function installmentStatus(p) {
  const due = installmentAmount(p);
  const paid = Number(p.amount_paid || 0);
  if (paid > 0 && paid >= due) return "✓ مدفوع";
  if (paid > 0) return "جزئي ⚠";
  return "غير مسدد";
}

export default function LeaseContracts({ onBack, onSelectLease }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [propertyFilters, setPropertyFilters] = useState([]); // فارغ = كل العقارات
  const [taxFilter, setTaxFilter] = useState("الكل");
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  const propertyMenuRef = useRef(null);
  const [properties, setProperties] = useState([]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (propertyMenuRef.current && !propertyMenuRef.current.contains(e.target)) {
        setShowPropertyMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function load() {
    setLoading(true);
    const { data: leases } = await supabase
      .from("leases")
      .select(`
        id, lease_number, start_date_hijri, end_date_hijri, start_date, end_date,
        payment_type, payment_frequency, rent_amount, contract_value, status,
        tax_enabled, amount_includes_vat, tax_effective_hijri, contract_file_url,
        tenants ( full_name, name ),
        properties ( name ),
        lease_units ( units ( unit_number ) )
      `);

    const { data: payments } = await supabase
      .from("payments")
      .select("lease_id, installment_number, total_installments, amount, amount_due, amount_paid, due_date_hijri, due_date_gregorian, status");

    const countByLease = {};
    const paymentsByLease = {};
    (payments || []).forEach((p) => {
      countByLease[p.lease_id] = (countByLease[p.lease_id] || 0) + 1;
      (paymentsByLease[p.lease_id] = paymentsByLease[p.lease_id] || []).push(p);
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
        installments: (paymentsByLease[l.id] || []).slice().sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0)),
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
    if (propertyFilters.length > 0 && !propertyFilters.includes(r.propertyName)) return false;
    if (taxFilter === "شامل" && !(r.tax_enabled && r.amount_includes_vat)) return false;
    if (taxFilter === "غير شامل" && !(r.tax_enabled && !r.amount_includes_vat)) return false;
    if (taxFilter === "غير خاضع" && r.tax_enabled) return false;
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

  const exportKeyCounts = {};
  const exportRows = groups.flatMap((g) => g.items).flatMap((r) => {
    const vatLabel = r.tax_enabled ? (r.amount_includes_vat ? "شامل الضريبة" : "غير شامل الضريبة") : "غير خاضع";
    const payText = r.payment_type || r.payment_frequency || "—";
    const baseKey = [
      r.tenantName,
      r.propertyName,
      `وحدة ${r.unitsText}`,
      r.lease_number ? `عقد ${r.lease_number}` : "بدون رقم عقد",
      /دفع/.test(payText) ? payText : `${payText} · ${r.installmentsCount} دفعة`,
      `القيمة ${Number(r.contractValue).toLocaleString()} ريال (${vatLabel})`,
      `${r.start_date_hijri || "—"} إلى ${r.end_date_hijri || "—"} هـ (${r.start_date || "—"} إلى ${r.end_date || "—"})`,
      statusLabel(r.status),
    ].join(" — ");
    exportKeyCounts[baseKey] = (exportKeyCounts[baseKey] || 0) + 1;
    const groupKey = exportKeyCounts[baseKey] > 1 ? `${baseKey} (${exportKeyCounts[baseKey]})` : baseKey;

    if (r.installments.length === 0) {
      return [{ contract: groupKey, installment: "—", dueHijri: "—", dueGregorian: "—", amount: "", tax: "", status: "لا توجد دفعات" }];
    }
    return r.installments.map((p, i) => {
      const amount = installmentAmount(p);
      const tax = installmentTax(r, p, amount);
      return {
        contract: groupKey,
        installment: `${p.installment_number || i + 1} / ${p.total_installments || r.installmentsCount}`,
        dueHijri: normalizeHijri(p.due_date_hijri) || "—",
        dueGregorian: p.due_date_gregorian || "—",
        amount: { value: `${amount.toLocaleString()} ريال`, color: "#1B4D7A" },
        tax: r.tax_enabled ? { value: `${tax.toLocaleString()} ريال`, color: "#B42318" } : "",
        status: installmentStatus(p),
      };
    });
  });

  const totalContractsValue = filtered.reduce((s, r) => s + Number(r.contractValue || 0), 0);
  const totalInstallmentsCount = filtered.reduce((s, r) => s + r.installments.length, 0);
  const exportStats = [
    { label: "عدد العقود", value: filtered.length, color: "#1B4D7A" },
    { label: "عدد الدفعات", value: totalInstallmentsCount, color: "#059669" },
    { label: "إجمالي قيمة العقود", value: `${totalContractsValue.toLocaleString()} ريال`, color: "#1d4ed8" },
  ];
  const taxFilterLabel = { "شامل": "شامل الضريبة", "غير شامل": "غير شامل الضريبة", "غير خاضع": "غير خاضع للضريبة" }[taxFilter] || "";
  const propertyFilterLabel = propertyFilters.length === 0
    ? ""
    : propertyFilters.length <= 2 ? propertyFilters.join("، ") : `${propertyFilters.length} عقارات`;
  const filterSummary = [taxFilterLabel, propertyFilterLabel].filter(Boolean).join(" — ");
  const reportTitle = ["عقود الإيجار — تفاصيل الدفعات", filterSummary].filter(Boolean).join(" — ");

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
            { key: "contract", label: "العقد", group: true },
            { key: "installment", label: "الدفعة" },
            { key: "dueHijri", label: "تاريخ الاستحقاق (هـ)" },
            { key: "dueGregorian", label: "تاريخ الاستحقاق (م)" },
            { key: "amount", label: "مبلغ الدفعة (ريال)" },
            { key: "tax", label: "الضريبة" },
            { key: "status", label: "الحالة" },
          ]}
          filename="lease_contracts"
          subtotalLabel="إجمالي دفعات العقد"
          stats={exportStats}
          title={reportTitle}
        />
      </div>

      <div className="lc-hide-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", fontFamily: "Cairo, sans-serif" }}>
          <option value="الكل">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="منتهي">ملغي</option>
        </select>
        <div ref={propertyMenuRef} style={{ position: "relative" }}>
          <button type="button" onClick={() => setShowPropertyMenu(!showPropertyMenu)}
            style={{
              padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", background: "#fff", cursor: "pointer",
              fontFamily: "Cairo, sans-serif", minWidth: "200px", textAlign: "right", display: "flex",
              justifyContent: "space-between", alignItems: "center", gap: "8px"
            }}>
            <span>
              {propertyFilters.length === 0
                ? "كل العقارات"
                : propertyFilters.length === 1
                  ? propertyFilters[0]
                  : `${propertyFilters.length} عقارات محددة`}
            </span>
            <span style={{ fontSize: "10px", color: "#999" }}>▾</span>
          </button>
          {showPropertyMenu && (
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: "4px", background: "#fff", border: "1px solid #ddd",
              borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "10px", zIndex: 20,
              minWidth: "240px", maxHeight: "320px", overflowY: "auto"
            }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #eee" }}>
                <button type="button" onClick={() => setPropertyFilters(properties)}
                  style={{ fontSize: "12px", color: "#1B4D7A", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif" }}>
                  تحديد الكل
                </button>
                <button type="button" onClick={() => setPropertyFilters([])}
                  style={{ fontSize: "12px", color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif" }}>
                  إلغاء الكل
                </button>
              </div>
              {properties.map((p) => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={propertyFilters.includes(p)}
                    onChange={() => setPropertyFilters((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                  />
                  {p}
                </label>
              ))}
            </div>
          )}
        </div>
        <select value={taxFilter} onChange={(e) => setTaxFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", fontFamily: "Cairo, sans-serif" }}>
          <option value="الكل">كل أنواع الضريبة</option>
          <option value="شامل">شامل الضريبة</option>
          <option value="غير شامل">غير شامل الضريبة</option>
          <option value="غير خاضع">غير خاضع للضريبة</option>
        </select>
      </div>

      <div className="lc-print-area">
        <h2 style={{ color: "#1B4D7A", fontSize: "18px", marginBottom: "4px" }}>{T.title}{filterSummary ? ` — ${filterSummary}` : ""}</h2>
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

                      {r.installments.length > 0 && (
                        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "6px 8px", fontSize: "11px", display: "flex", flexDirection: "column", gap: "3px" }}>
                          {r.installments.map((p, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "6px", color: "#555" }}>
                              <span>{p.installment_number || i + 1} / {p.total_installments || r.installmentsCount}</span>
                              <span>{installmentDueText(p)}</span>
                              <span style={{ fontWeight: "bold", color: "#1B4D7A" }}>{installmentAmount(p).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

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