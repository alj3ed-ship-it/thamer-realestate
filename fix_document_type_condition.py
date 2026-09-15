import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

old = "{inv.status === 'cleared' && !inv.document_type && ("
new = "{inv.status === 'cleared' && (!inv.document_type || inv.document_type === 'invoice') && ("

assert content.count(old) == 1, f"عدد النتائج: {content.count(old)}"
content = content.replace(old, new)
path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅")