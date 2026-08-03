path = r"src\ViewerLayout.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) دالة مفتاح ترتيب فعّال + تعديل الفرز
old_sort = """  const filteredPaymentsList = payments
    .filter((p) => {
      if (paymentsSelectedProperties.length > 0 && !paymentsSelectedProperties.includes(p.leases?.property_id)) return false;
      if (paymentsSelectedTenants.length > 0 && !paymentsSelectedTenants.includes(p.leases?.tenants?.name)) return false;
      if (paymentsSelectedUnitType) {
        const unitsList = p.leases?.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
        if (!unitsList.some((u) => (u.unit_type || "").trim() === paymentsSelectedUnitType)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => hijriSortKey(a.payment_date_hijri) - hijriSortKey(b.payment_date_hijri));"""

new_sort = """  function getEffectivePaymentSortKey(p) {
    if (p.payment_date_hijri) return hijriSortKey(p.payment_date_hijri);
    const hijri = computeInstallmentHijri(p.leases?.start_date_hijri, p.total_installments, p.installment_number);
    if (!hijri) return 99999999;
    return hijri.year * 10000 + hijri.month * 100 + hijri.day;
  }

  const filteredPaymentsList = payments
    .filter((p) => {
      if (paymentsSelectedProperties.length > 0 && !paymentsSelectedProperties.includes(p.leases?.property_id)) return false;
      if (paymentsSelectedTenants.length > 0 && !paymentsSelectedTenants.includes(p.leases?.tenants?.name)) return false;
      if (paymentsSelectedUnitType) {
        const unitsList = p.leases?.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
        if (!unitsList.some((u) => (u.unit_type || "").trim() === paymentsSelectedUnitType)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => getEffectivePaymentSortKey(a) - getEffectivePaymentSortKey(b));"""

assert content.count(old_sort) == 1, "sort block not found in ViewerLayout"
content = content.replace(old_sort, new_sort)

# 2) ألوان المبلغ الجزئي
old_amount = """    if (r.status === "partial") {
      const remaining = Math.max((r.amount || 0) - (r.paidAmount || 0), 0);
      return (
        <div style={{ whiteSpace: "nowrap", fontSize: "13px" }}>
          <span style={{ color: "#27ae60", fontWeight: "bold" }}>{r.paidAmount.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ color: "#e74c3c", fontWeight: "bold" }}>{remaining.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ color: "#1B4D7A", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>
        </div>
      );
    }"""

new_amount = """    if (r.status === "partial") {
      const remaining = Math.max((r.amount || 0) - (r.paidAmount || 0), 0);
      return (
        <div style={{ whiteSpace: "nowrap", fontSize: "13px" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af" }}>مدفوع </span>
          <span style={{ color: "#27ae60", fontWeight: "bold" }}>{r.paidAmount.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af" }}>متبقي </span>
          <span style={{ color: "#d4ac0d", fontWeight: "bold" }}>{remaining.toLocaleString()}</span>
          <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af" }}>الإجمالي </span>
          <span style={{ color: "#e74c3c", fontWeight: "bold" }}>{r.amount.toLocaleString()}</span>
        </div>
      );
    }"""

assert content.count(old_amount) == 1, "amount block not found in ViewerLayout"
content = content.replace(old_amount, new_amount)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل ViewerLayout.jsx بنجاح ✓")