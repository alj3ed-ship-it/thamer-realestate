import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

old = '<label style={labelStyle}>رقم الهوية / السجل المدني</label>'
new = '<label style={labelStyle}>رقم الهوية / الإقامة</label>'
assert content.count(old) == 1
content = content.replace(old, new)

path.write_text(content, encoding="utf-8")
print("Patched label successfully")