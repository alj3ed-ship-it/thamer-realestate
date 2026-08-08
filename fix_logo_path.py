path = r"C:\Users\aljuaid\Desktop\thamer-realestate\src\Login.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_line = 'import thamerLogo from "./thamer-logo.svg";'
new_line = 'import thamerLogo from "./assets/thamer-logo.svg";'

assert content.count(old_line) == 1, "لم يتم العثور على سطر الاستيراد الخاطئ أو تكرر أكثر من مرة"
content = content.replace(old_line, new_line)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تصحيح مسار اللوقو بنجاح ✅")
