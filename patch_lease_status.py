# -*- coding: utf-8 -*-
"""
سكربت تحديث: يضيف رقم العقد + شارة حالة العقد (نشط/قريب الانتهاء/منتهي)
+ نافذة تفاصيل العقد إلى صفحات Leases, Payments, Entitlements

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python patch_lease_status.py
"""
import io
import sys

sys.stdout.reconfigure(encoding="utf-8")

SRC = "src"


def read(path):
    with io.open(path, "r", encoding="utf-8") as f:
        return f.read()


def write(path, content):
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(content)


def patch(path, replacements):
    content = read(path)
    for i, (old, new) in enumerate(replacements, 1):
        count = content.count(old)
        if count == 0:
            raise SystemExit(f"[FAIL] {path}: لم يتم إيجاد النص رقم {i} (ربما الملف تغيّر). توقفت العملية بدون أي تعديل ناقص.")
        if count > 1:
            raise SystemExit(f"[FAIL] {path}: النص رقم {i} غير فريد ({count} تكرار). راجع الملف يدوياً.")
        content = content.replace(old, new, 1)
    write(path, content)
    print(f"[OK] تم تحديث {path} ({len(replacements)} تعديل)")


# =========================================================
# 1) ملف جديد: leaseStatus.js
# =========================================================
LEASE_STATUS_JS = '''// دالة موحّدة لحساب حالة عقد الإيجار (نشط / قريب الانتهاء / منتهي)
// تُستخدم في Leases.jsx و Payments.jsx و Entitlements.jsx

export function getLeaseStatus(endDate) {
  if (!endDate) {
    return { key: "unknown", label: "—", color: "#9ca3af", bg: "#f3f4f6", border: "#e5e7eb" };
  }

  const end = new Date(endDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / 86400000);

  if (diffDays < 0) {
    return { key: "expired", label: "منتهي", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", days: diffDays };
  }
  if (diffDays <= 60) {
    return { key: "ending", label: `باقي ${diffDays} يوم`, color: "#d97706", bg: "#fef3c7", border: "#fcd34d", days: diffDays };
  }
  return { key: "active", label: "نشط", color: "#059669", bg: "#d1fae5", border: "#6ee7b7", days: diffDays };
}

export function LeaseStatusBadge({ endDate, style = {} }) {
  const s = getLeaseStatus(endDate);
  const icon = s.key === "expired" ? "🔴" : s.key === "ending" ? "🟠" : s.key === "active" ? "🟢" : "⚪";
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap", display: "inline-block", fontFamily: "Cairo, sans-serif",
      ...style
    }}>
      {icon} {s.label}
    </span>
  );
}
'''

# =========================================================
# 2) ملف جديد: LeaseDetailsModal.jsx
# =========================================================
LEASE_DETAILS_MODAL_JSX = '''import { useState, useEffect } from "react";
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
'''

import os

os.makedirs(SRC, exist_ok=True)
write(f"{SRC}/leaseStatus.js", LEASE_STATUS_JS)
print(f"[OK] تم إنشاء {SRC}/leaseStatus.js")
write(f"{SRC}/LeaseDetailsModal.jsx", LEASE_DETAILS_MODAL_JSX)
print(f"[OK] تم إنشاء {SRC}/LeaseDetailsModal.jsx")

# =========================================================
# 3) تعديل Leases.jsx
# =========================================================
patch(f"{SRC}/Leases.jsx", [
    (
        'import ExportToolbar from "./components/ExportToolbar";',
        'import ExportToolbar from "./components/ExportToolbar";\n'
        'import { LeaseStatusBadge } from "./leaseStatus";\n'
        'import LeaseDetailsModal from "./LeaseDetailsModal";',
    ),
    (
        '  const [deletingId, setDeletingId] = useState(null);',
        '  const [deletingId, setDeletingId] = useState(null);\n'
        '  const [viewingLeaseId, setViewingLeaseId] = useState(null);',
    ),
    (
        '    rent_amount: "", payment_type: "سنوي", notes: "",\n'
        '    installments: [],',
        '    lease_number: "",\n'
        '    rent_amount: "", payment_type: "سنوي", notes: "",\n'
        '    installments: [],',
    ),
    (
        '      rent_amount: "", payment_type: "سنوي", notes: "",\n'
        '      installments: [],',
        '      lease_number: "",\n'
        '      rent_amount: "", payment_type: "سنوي", notes: "",\n'
        '      installments: [],',
    ),
    (
        '      property_id: lease.property_id || "",\n'
        '      selected_unit_ids: currentUnitIds,\n'
        '      tenant_id: lease.tenant_id || "",',
        '      property_id: lease.property_id || "",\n'
        '      selected_unit_ids: currentUnitIds,\n'
        '      tenant_id: lease.tenant_id || "",\n'
        '      lease_number: lease.lease_number || "",',
    ),
    (
        '    const payload = {\n'
        '      property_id: form.property_id || null,\n'
        '      unit_id: form.selected_unit_ids[0] || null,\n'
        '      tenant_id: form.tenant_id || null,',
        '    const payload = {\n'
        '      property_id: form.property_id || null,\n'
        '      unit_id: form.selected_unit_ids[0] || null,\n'
        '      tenant_id: form.tenant_id || null,\n'
        '      lease_number: form.lease_number || null,',
    ),
    (
        '              <div>\n'
        '                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>تاريخ البداية</label>',
        '              <div style={{ gridColumn: "span 2" }}>\n'
        '                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>رقم العقد (Ejar) — اختياري</label>\n'
        '                <input type="text" value={form.lease_number} onChange={e => setForm({ ...form, lease_number: e.target.value })}\n'
        '                  placeholder="مثال: 2553461"\n'
        '                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }} />\n'
        '              </div>\n'
        '              <div>\n'
        '                <label style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>تاريخ البداية</label>',
    ),
    (
        '                  {(isReadOnly\n'
        '                    ? ["المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الضريبة", "الملاحظات"]\n'
        '                    : ["المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الضريبة", "الملاحظات", ""]\n'
        '                  ).map(h => (',
        '                  {(isReadOnly\n'
        '                    ? ["الحالة", "رقم العقد", "المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الضريبة", "الملاحظات"]\n'
        '                    : ["الحالة", "رقم العقد", "المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الضريبة", "الملاحظات", ""]\n'
        '                  ).map(h => (',
    ),
    (
        '                    <tr key={l.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>\n'
        '                      <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{tenant?.name || "—"}</td>',
        '                    <tr key={l.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>\n'
        '                      <td style={{ padding: "12px" }}>\n'
        '                        <button type="button" onClick={() => setViewingLeaseId(l.id)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }} title="عرض تفاصيل العقد">\n'
        '                          <LeaseStatusBadge endDate={l.end_date} />\n'
        '                        </button>\n'
        '                      </td>\n'
        '                      <td style={{ padding: "12px", color: "#374151", fontSize: 13 }}>{l.lease_number || "—"}</td>\n'
        '                      <td style={{ padding: "12px", fontWeight: 600, color: "#1B4D7A" }}>{tenant?.name || "—"}</td>',
    ),
    (
        '              <button onClick={handleSave} disabled={saving || form.selected_unit_ids.length === 0}\n'
        '                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer", opacity: form.selected_unit_ids.length === 0 ? 0.5 : 1 }}>\n'
        '                {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}\n'
        '              </button>\n'
        '            </div>\n'
        '          </div>\n'
        '        </div>\n'
        '      )}\n'
        '    </div>\n'
        '  );\n'
        '}',
        '              <button onClick={handleSave} disabled={saving || form.selected_unit_ids.length === 0}\n'
        '                style={{ padding: "8px 20px", borderRadius: 8, background: "#1B4D7A", color: "#fff", border: "none", cursor: "pointer", opacity: form.selected_unit_ids.length === 0 ? 0.5 : 1 }}>\n'
        '                {saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة"}\n'
        '              </button>\n'
        '            </div>\n'
        '          </div>\n'
        '        </div>\n'
        '      )}\n\n'
        '      <LeaseDetailsModal leaseId={viewingLeaseId} onClose={() => setViewingLeaseId(null)} />\n'
        '    </div>\n'
        '  );\n'
        '}',
    ),
])

# =========================================================
# 4) تعديل Payments.jsx
# =========================================================
patch(f"{SRC}/Payments.jsx", [
    (
        "import ExportToolbar from './components/ExportToolbar'",
        "import ExportToolbar from './components/ExportToolbar'\n"
        "import { LeaseStatusBadge } from './leaseStatus'\n"
        "import LeaseDetailsModal from './LeaseDetailsModal'",
    ),
    (
        "  const [editingId, setEditingId] = useState(null)",
        "  const [editingId, setEditingId] = useState(null)\n"
        "  const [viewingLeaseId, setViewingLeaseId] = useState(null)",
    ),
    (
        "      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, payment_frequency, payment_type, unit_id, start_date_hijri, tax_enabled, tax_effective_hijri, amount_includes_vat'),",
        "      supabase.from('leases').select('id, tenant_id, property_id, rent_amount, payment_frequency, payment_type, unit_id, start_date_hijri, end_date, lease_number, tax_enabled, tax_effective_hijri, amount_includes_vat'),",
    ),
    (
        "                      <td style={{ padding: '16px 18px', fontWeight: 700, color: '#1B4D7A', whiteSpace: 'nowrap' }}>{getTenantName(p.lease_id)}</td>",
        "                      <td style={{ padding: '16px 18px', whiteSpace: 'nowrap' }}>\n"
        "                        <button type=\"button\" onClick={() => setViewingLeaseId(p.lease_id)}\n"
        "                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, textAlign: 'right' }} title=\"عرض تفاصيل العقد\">\n"
        "                          <div style={{ fontWeight: 700, color: '#1B4D7A' }}>{getTenantName(p.lease_id)}</div>\n"
        "                          <LeaseStatusBadge endDate={getLease(p.lease_id)?.end_date} style={{ marginTop: 3 }} />\n"
        "                        </button>\n"
        "                      </td>",
    ),
    (
        "        </div>\n"
        "      )}\n"
        "    </div>\n"
        "  )\n"
        "}\n\n"
        "export default Payments",
        "        </div>\n"
        "      )}\n\n"
        "      <LeaseDetailsModal leaseId={viewingLeaseId} onClose={() => setViewingLeaseId(null)} />\n"
        "    </div>\n"
        "  )\n"
        "}\n\n"
        "export default Payments",
    ),
])

# =========================================================
# 5) تعديل Entitlements.jsx
# =========================================================
patch(f"{SRC}/Entitlements.jsx", [
    (
        'import ExportToolbar from "./components/ExportToolbar";\n'
        'import { getUnitTypeColor } from "./theme";',
        'import ExportToolbar from "./components/ExportToolbar";\n'
        'import { getUnitTypeColor } from "./theme";\n'
        'import { LeaseStatusBadge } from "./leaseStatus";\n'
        'import LeaseDetailsModal from "./LeaseDetailsModal";',
    ),
    (
        '  const [searched, setSearched] = useState(false);',
        '  const [searched, setSearched] = useState(false);\n'
        '  const [viewingLeaseId, setViewingLeaseId] = useState(null);',
    ),
    (
        '    leases (\n'
        '      id, property_id, start_date_hijri, tax_enabled, tax_effective_hijri, amount_includes_vat,',
        '    leases (\n'
        '      id, property_id, start_date_hijri, end_date, lease_number, tax_enabled, tax_effective_hijri, amount_includes_vat,',
    ),
    (
        '      found.push({\n'
        '        tenant: lease.tenants?.name || "",',
        '      found.push({\n'
        '        leaseId: lease.id,\n'
        '        leaseEndDate: lease.end_date,\n'
        '        leaseNumber: lease.lease_number,\n'
        '        tenant: lease.tenants?.name || "",',
    ),
    (
        '                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>العقار</th>',
        '                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>حالة العقد</th>\n'
        '                    <th style={{ padding: "12px 16px", textAlign: "right", color: "#555", fontWeight: "bold" }}>العقار</th>',
    ),
    (
        '                      <td style={{ padding: "12px 16px" }}>{propertyBadge(r.property)}</td>',
        '                      <td style={{ padding: "12px 16px" }}>\n'
        '                        <button type="button" onClick={() => setViewingLeaseId(r.leaseId)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }} title="عرض تفاصيل العقد">\n'
        '                          <LeaseStatusBadge endDate={r.leaseEndDate} />\n'
        '                        </button>\n'
        '                      </td>\n'
        '                      <td style={{ padding: "12px 16px" }}>{propertyBadge(r.property)}</td>',
    ),
    (
        '      {searched && results.length === 0 && (\n'
        '        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>\n'
        '          لا توجد دفعات مستحقة في هذا الشهر\n'
        '        </div>\n'
        '      )}\n'
        '    </div>\n'
        '  );\n'
        '}',
        '      {searched && results.length === 0 && (\n'
        '        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", padding: "48px", textAlign: "center", color: "#999" }}>\n'
        '          لا توجد دفعات مستحقة في هذا الشهر\n'
        '        </div>\n'
        '      )}\n\n'
        '      <LeaseDetailsModal leaseId={viewingLeaseId} onClose={() => setViewingLeaseId(null)} />\n'
        '    </div>\n'
        '  );\n'
        '}',
    ),
])

print("\n✅ كل التعديلات تمت بنجاح.")
print("شغّل الآن: npm run dev")
