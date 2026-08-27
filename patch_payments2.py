import io

path = "src/Payments.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "supabase.from('leases').select('id, tenant_id, property_id, rent_amount, payment_frequency, payment_type, unit_id, start_date_hijri, end_date, lease_number, tax_enabled, tax_effective_hijri, amount_includes_vat')"
new = "supabase.from('leases').select('id, tenant_id, property_id, rent_amount, payment_frequency, payment_type, unit_id, start_date_hijri, end_date, lease_number, tax_enabled, tax_effective_hijri, amount_includes_vat, status')"
assert content.count(old) == 1, "old not found or not unique"
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("done")