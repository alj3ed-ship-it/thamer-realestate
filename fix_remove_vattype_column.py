path = r"src\Payments.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """              { key: 'tax', label: 'الضريبة' },
              { key: 'vatType', label: 'نوع الضريبة' },
              { key: 'totalWithTax', label: 'الإجمالي الفعلي' },"""

new = """              { key: 'tax', label: 'الضريبة' },
              { key: 'totalWithTax', label: 'الإجمالي الفعلي' },"""

assert content.count(old) == 1, "block not found"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم حذف عمود نوع الضريبة ✓")