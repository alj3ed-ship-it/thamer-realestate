import pathlib
p = pathlib.Path('src/Leases.jsx')
content = p.read_text(encoding='utf-8')

old1 = 'function addHijriMonths(hijri, monthsToAdd) {'
assert content.count(old1) == 1, f'old1 matches: {content.count(old1)}'
new1 = """// يعكس ترتيب أجزاء نص التاريخ (أياً كان الترتيب الحالي) لعرضه كـ يوم/شهر/سنة
def_placeholder = 1
"""
new1 = new1.replace("def_placeholder = 1\n", "")
new1_func = "function reverseDateOrder(text) {\n  if (!text) return text;\n  const parts = text.split('/');\n  if (parts.length !== 3) return text;\n  return [parts[2], parts[1], parts[0]].join('/');\n}\n\nfunction addHijriMonths(hijri, monthsToAdd) {"
content = content.replace(old1, new1_func)

old2 = '''  function getInstallmentDate(leaseId, num) {
    const row = payments.find(p => p.lease_id === leaseId && p.installment_number === num);
    if (!row) return "—";
    return row.due_date_hijri || row.due_date_gregorian || "—";
  }'''
assert content.count(old2) == 1, f'old2 matches: {content.count(old2)}'
new2 = '''  function getInstallmentDate(leaseId, num) {
    const row = payments.find(p => p.lease_id === leaseId && p.installment_number === num);
    if (!row) return "—";
    const raw = row.due_date_hijri || row.due_date_gregorian || "—";
    return reverseDateOrder(raw);
  }'''
content = content.replace(old2, new2)

old3 = '<td style={{ padding: "12px", fontWeight: 600 }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + " ريال" : "—"}</td>'
assert content.count(old3) == 1, f'old3 matches: {content.count(old3)}'
new3 = '<td style={{ padding: "12px", fontWeight: 600, color: "#e74c3c" }}>{l.rent_amount ? Number(l.rent_amount).toLocaleString() + " ريال" : "—"}</td>'
content = content.replace(old3, new3)

p.write_text(content, encoding='utf-8')
print('تم التعديل بنجاح')