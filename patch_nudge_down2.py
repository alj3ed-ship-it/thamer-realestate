# -*- coding: utf-8 -*-
path = r"src\Letters.jsx"

with open(path, encoding="utf-8") as f:
    content = f.read()

old = '''              <div style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "14px", fontWeight: "bold", lineHeight: 1.9, textAlign: "left", marginTop: "12px" }}>'''
new = '''              <div style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "14px", fontWeight: "bold", lineHeight: 1.9, textAlign: "left", marginTop: "16px" }}>'''
assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")
