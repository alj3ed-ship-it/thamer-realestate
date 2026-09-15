import io

path = "src/Letters.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''    key: "tax_certificate_request",
    label: "طلب شهادة تسجيل ضريبي",'''
new = '''    key: "tax_certificate_request",
    label: "طلب شهادة ضريبية",'''
assert content.count(old) == 1, f"match count = {content.count(old)}"
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم بنجاح ✅")