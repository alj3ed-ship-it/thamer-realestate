path = r"C:\Users\aljuaid\Desktop\thamer-realestate\src\assets\thamer-logo.svg"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_bg = '<rect width="700" height="400" fill="#FDFBF6"/>'

assert content.count(old_bg) == 1, "لم يتم العثور على مستطيل الخلفية أو تكرر أكثر من مرة"
content = content.replace(old_bg, '')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم إزالة الخلفية الكريمية بنجاح ✅ اللوقو الآن شفاف")
