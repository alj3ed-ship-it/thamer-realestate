import pathlib
p = pathlib.Path('src/LeaseDetailsModal.jsx')
content = p.read_text(encoding='utf-8')

old1 = 'function computeInstallmentHijri('
assert content.count(old1) == 1, f'old1: {content.count(old1)}'
new1 = '''function reverseDateOrder(text) {
  if (!text) return text;
  const parts = text.split('/');
  if (parts.length !== 3) return text;
  return [parts[2], parts[1], parts[0]].join('/');
}

function computeInstallmentHijri('''
content = content.replace(old1, new1)

old2 = '<div><span style={{ color: "#6b7280" }}>تاريخ البداية: </span><strong>{l.start_date || "—"}{l.start_date_hijri ? ` (${l.start_date_hijri} هـ)` : ""}</strong></div>'
assert content.count(old2) == 1, f'old2: {content.count(old2)}'
new2 = '<div><span style={{ color: "#6b7280" }}>تاريخ البداية: </span><strong>{l.start_date || "—"}{l.start_date_hijri ? ` (${reverseDateOrder(l.start_date_hijri)} هـ)` : ""}</strong></div>'
content = content.replace(old2, new2)

old3 = '<div><span style={{ color: "#6b7280" }}>تاريخ النهاية: </span><strong>{l.end_date || "—"}{l.end_date_hijri ? ` (${l.end_date_hijri} هـ)` : ""}</strong></div>'
assert content.count(old3) == 1, f'old3: {content.count(old3)}'
new3 = '<div><span style={{ color: "#6b7280" }}>تاريخ النهاية: </span><strong>{l.end_date || "—"}{l.end_date_hijri ? ` (${reverseDateOrder(l.end_date_hijri)} هـ)` : ""}</strong></div>'
content = content.replace(old3, new3)

old4 = '''                            <td style={{ padding: 8 }}>
                              <div>{p.payment_date_hijri || p.payment_date || "—"}</div>
                              {p.first_partial_date_hijri && (
                                <div style={{ fontSize: 10, color: "#e67e22", marginTop: 2 }} title="تاريخ أول دفعة جزئية">
                                  أول جزئية: {p.first_partial_date_hijri} هـ
                                </div>
                              )}
                            </td>'''
assert content.count(old4) == 1, f'old4: {content.count(old4)}'
new4 = '''                            <td style={{ padding: 8 }}>
                              <div>{reverseDateOrder(p.payment_date_hijri) || p.payment_date || "—"}</div>
                              {p.first_partial_date_hijri && (
                                <div style={{ fontSize: 10, color: "#e67e22", marginTop: 2 }} title="تاريخ أول دفعة جزئية">
                                  أول جزئية: {reverseDateOrder(p.first_partial_date_hijri)} هـ
                                </div>
                              )}
                            </td>'''
content = content.replace(old4, new4)

old5 = '<div key={h.id || hi}>• {Number(h.amount || 0).toLocaleString()}{h.payment_date_hijri ? ` — ${h.payment_date_hijri} هـ` : ""}</div>'
assert content.count(old5) == 1, f'old5: {content.count(old5)}'
new5 = '<div key={h.id || hi}>• {Number(h.amount || 0).toLocaleString()}{h.payment_date_hijri ? ` — ${reverseDateOrder(h.payment_date_hijri)} هـ` : ""}</div>'
content = content.replace(old5, new5)

p.write_text(content, encoding='utf-8')
print('تم التعديل بنجاح')