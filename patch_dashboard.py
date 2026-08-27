import io

path = "src/components/DashboardCharts.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = '.select("amount_due, status, installment_number, total_installments, leases(start_date_hijri, tax_enabled, amount_includes_vat)");'
new1 = '.select("amount_due, status, installment_number, total_installments, leases(start_date_hijri, tax_enabled, amount_includes_vat, status)");'
assert content.count(old1) == 1, "old1 not found"
content = content.replace(old1, new1)

old2 = '''      const lease = row.leases;
      if (!lease) return;
      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);'''
new2 = '''      const lease = row.leases;
      if (!lease) return;
      if (lease.status === "منتهي") return;
      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);'''
assert content.count(old2) == 1, "old2 not found"
content = content.replace(old2, new2)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")