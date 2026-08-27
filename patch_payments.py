import io

path = "src/Payments.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = 'const propPayments = payments.filter(p => getPropertyId(p.lease_id) === prop.id && p.status !== "\u0645\u0644\u063a\u0649")'
new1 = 'const propPayments = payments.filter(p => getPropertyId(p.lease_id) === prop.id && p.status !== "\u0645\u0644\u063a\u0649" && getLease(p.lease_id)?.status !== "\u0645\u0646\u062a\u0647\u064a")'
assert content.count(old1) == 1, "old1 not found or not unique"
content = content.replace(old1, new1)

old2 = ': payments.filter(p => getPropertyId(p.lease_id) === filterProperty && p.status !== "\u0645\u0644\u063a\u0649")'
new2 = ': payments.filter(p => getPropertyId(p.lease_id) === filterProperty && p.status !== "\u0645\u0644\u063a\u0649" && getLease(p.lease_id)?.status !== "\u0645\u0646\u062a\u0647\u064a")'
assert content.count(old2) == 1, "old2 not found or not unique"
content = content.replace(old2, new2)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح")