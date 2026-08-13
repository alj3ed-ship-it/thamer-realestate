import re

path = "src/Letters.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '<div style={{ fontWeight: "bold", fontSize: "22px", color: "#9A7D0A", fontFamily: "\'Aref Ruqaa\', serif" }}>{OFFICE_NAME}</div>'

new = '''<div style={{ fontWeight: "bold", fontSize: "22px", fontFamily: "'Aref Ruqaa', serif" }}>
              <span style={{ color: "#0F5C3C" }}>مكتب </span>
              <span style={{ color: "#9A7D0A" }}>ثامر بن سلمان</span>
              <span style={{ color: "#0F5C3C" }}> العقاري</span>
            </div>'''

count = content.count(old)
if count != 1:
    print(f"تحذير: السطر القديم موجود {count} مرة بدل مرة واحدة. لم يتم أي تعديل.")
    print("ابعث لي السطر 448 بالضبط (نسخ من VS Code) عشان أصحح الباتش.")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("تم التعديل بنجاح ✅")
