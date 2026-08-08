# -*- coding: utf-8 -*-
path = r"C:\Users\aljuaid\Desktop\thamer-realestate\src\Login.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_text = '<h2 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "20px" }}>دخول المدير</h2>'
new_text = '<h2 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "20px" }}>هلا بِك</h2>'

assert content.count(old_text) == 1, "لم يتم العثور على النص القديم أو تكرر أكثر من مرة"
content = content.replace(old_text, new_text)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تغيير النص إلى 'هلا بِك' بنجاح ✅")
