import io

path = "src/Payments.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = 'const propPayments = payments.filter(p => getPropertyId(p.lease_id) === prop.id && p.status !== "ملغى" && getLease(p.lease_id)?.status !== "منتهي")'
new1 = 'const propPayments = payments.filter(p => getPropertyId(p.lease_id) === prop.id && p.status !== "ملغى")'
assert content.count(old1) == 1, "old1 not found"
content = content.replace(old1, new1)

old2 = ': payments.filter(p => getPropertyId(p.lease_id) === filterProperty && p.status !== "ملغى" && getLease(p.lease_id)?.status !== "منتهي")'
new2 = ': payments.filter(p => getPropertyId(p.lease_id) === filterProperty && p.status !== "ملغى")'
assert content.count(old2) == 1, "old2 not found"
content = content.replace(old2, new2)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS payments.jsx reverted")