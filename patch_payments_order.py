import pathlib

path = pathlib.Path("src/Payments.jsx")
content = path.read_text(encoding="utf-8")

old = """    .filter(p => filterTenants.length === 0 || filterTenants.includes(getTenantId(p.lease_id)))
    .sort((a, b) => getEffectiveSortKey(a) - getEffectiveSortKey(b))"""

new = """    .filter(p => filterTenants.length === 0 || filterTenants.includes(getTenantId(p.lease_id)))
    .sort((a, b) => {
      // نفس العقد: الأولوية دائماً لرقم الدفعة (١ → ١٢) بدل تاريخها، عشان
      // تعديل أو إدخال تاريخ لاحقاً ما يقلب ترتيب الصفوف بالجدول.
      if (a.lease_id === b.lease_id) {
        const aIdx = a.installment_number || getPaymentIndex(a)
        const bIdx = b.installment_number || getPaymentIndex(b)
        return aIdx - bIdx
      }
      // عقود مختلفة: يفضل الترتيب بالتاريخ زي ما كان
      return getEffectiveSortKey(a) - getEffectiveSortKey(b)
    })"""

assert content.count(old) == 1, "old block not found or not unique"
content = content.replace(old, new)

path.write_text(content, encoding="utf-8")
print("Payments.jsx (sort order) patched successfully.")
