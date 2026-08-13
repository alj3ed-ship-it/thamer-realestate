import re

path = "src/Letters.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# نمط مرن يلقط بلوك الـ div اللي فيه سبانات مكتب / ثامر بن سلمان / العقاري
# بغض النظر عن المسافات أو فواصل الأسطر
pattern = re.compile(
    r'<div\s+style=\{\{[^}]*\}\}>\s*'
    r'<span[^>]*>مكتب\s*</span>\s*'
    r'<span[^>]*>ثامر بن سلمان</span>\s*'
    r'<span[^>]*>\s*العقاري</span>\s*'
    r'</div>',
    re.DOTALL
)

matches = pattern.findall(content)

if len(matches) != 1:
    print(f"تحذير: عدد المطابقات = {len(matches)} (متوقع 1). لم يتم أي تعديل.")
    print("انسخ لي السطر الحالي في Letters.jsx حول كلمة OFFICE_NAME من Notepad.")
else:
    new_div = '<div style={{ fontWeight: "bold", fontSize: "22px", color: "#9A7D0A", fontFamily: "\'Aref Ruqaa\', serif" }}>{OFFICE_NAME}</div>'
    content = pattern.sub(new_div, content, count=1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("تم الرجوع للوضع الأصلي بنجاح ✅")
