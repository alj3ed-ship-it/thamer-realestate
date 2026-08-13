# -*- coding: utf-8 -*-
path = r"src\Letters.jsx"

with open(path, encoding="utf-8") as f:
    content = f.read()

old = '''            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1B4D7A", paddingBottom: "16px", marginBottom: "28px" }}>'''
new = '''            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1B4D7A", paddingBottom: "16px", marginBottom: "28px" }}>'''
assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")
