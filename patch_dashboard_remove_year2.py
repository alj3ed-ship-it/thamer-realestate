import io

path = "src/components/DashboardCharts.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''  const loadHijriYearTotal = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("amount_due, status, installment_number, total_installments, leases(start_date_hijri, tax_enabled, amount_includes_vat, status)");
    if (error || !data) return;
    let total = 0;
    data.forEach((row) => {
      if (row.status === "ملغى") return;
      const lease = row.leases;
      if (!lease) return;
      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
      if (!hijri || hijri.year !== 1448) return;
      total += computeNetRevenue(row.amount_due, lease.tax_enabled, lease.amount_includes_vat);
    });
    setHijriYearTotal(Math.round(total));
  };'''
new = '''  // إجمالي صافي كل العقود النشطة (بدون تقييد بسنة هجرية) — نفس رقم صفحة العقود دائماً
  const loadHijriYearTotal = async () => {
    const { data, error } = await supabase
      .from("leases")
      .select("rent_amount, tax_enabled, amount_includes_vat")
      .neq("status", "منتهي");
    if (error || !data) return;
    const total = data.reduce(
      (sum, l) => sum + computeNetRevenue(l.rent_amount, l.tax_enabled, l.amount_includes_vat),
      0
    );
    setHijriYearTotal(Math.round(total));
  };'''
assert content.count(old) == 1, "old not found"
content = content.replace(old, new)

old_label = 'إجمالي عقود السنة الهجرية 1448 (صافي، ريال)'
new_label = 'إجمالي صافي كل العقود (ريال)'
assert content.count(old_label) == 1, "old_label not found"
content = content.replace(old_label, new_label)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")