import io

path = "src/components/DashboardCharts.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''      const lease = row.leases;
      if (!lease) return;
      if (lease.status === "منتهي") return;
      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);'''
new = '''      const lease = row.leases;
      if (!lease) return;
      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);'''
assert content.count(old) == 1, "old not found"
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS dashboard reverted")