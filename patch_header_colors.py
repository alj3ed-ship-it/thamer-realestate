# -*- coding: utf-8 -*-
path = r"src\Letters.jsx"

with open(path, encoding="utf-8") as f:
    content = f.read()

old = '''                <div style={{ fontWeight: "bold", fontSize: "22px", color: "#9A7D0A", fontFamily: "'Aref Ruqaa', serif" }}>{OFFICE_NAME}</div>'''

new = '''                <div style={{ fontWeight: "bold", fontFamily: "'Aref Ruqaa', serif" }}>
                  <span style={{ fontSize: "13px", color: "#0F5C3C" }}>مكتب </span>
                  <span style={{ fontSize: "24px", color: "#9A7D0A" }}>ثامر بن سلمان</span>
                  <span style={{ fontSize: "13px", color: "#0F5C3C" }}> العقاري</span>
                </div>'''

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")
