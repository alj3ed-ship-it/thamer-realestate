import pathlib

path = pathlib.Path("src/Payments.jsx")
content = path.read_text(encoding="utf-8")

old1 = "const totalFiltered = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0)"
assert content.count(old1) == 1, f"old1 match count: {content.count(old1)}"
new1 = "const totalFiltered = filteredPayments.reduce((s, p) => s + Math.round(getBaseAmount(p)), 0)"
content = content.replace(old1, new1)

old2 = "المجموع: {totalFiltered.toLocaleString()} ريال"
assert content.count(old2) == 1, f"old2 match count: {content.count(old2)}"
new2 = "الصافي: {totalFiltered.toLocaleString()} ريال"
content = content.replace(old2, new2)

old3 = "{ label: 'المجموع', value: `${totalFiltered.toLocaleString()} ريال`, color: '#27ae60' },"
assert content.count(old3) == 1, f"old3 match count: {content.count(old3)}"
new3 = "{ label: 'الصافي', value: `${totalFiltered.toLocaleString()} ريال`, color: '#27ae60' },"
content = content.replace(old3, new3)

path.write_text(content, encoding="utf-8")
print("Patched successfully.")