# -*- coding: utf-8 -*-
import io

path = r"src\Invoices.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

marker = "customer_id_number: e.target.value"
matches = [i for i, line in enumerate(lines) if marker in line]

assert len(matches) == 1, f"عدد التطابقات: {len(matches)} — يحتاج مراجعة يدوية"

idx = matches[0]  # index of the <input> line (0-based)

# نتأكد إن السطرين اللي بعده هم </div></div> زي ما شفناه بالتشخيص
assert "</div>" in lines[idx + 1], "السطر بعد input مو </div> — يحتاج مراجعة"
assert "</div>" in lines[idx + 2], "السطر اللي بعده مو </div> — يحتاج مراجعة"

# نأخذ نفس المسافة البادئة المستخدمة بالـ <label> اللي قبل input (idx - 1)
label_line = lines[idx - 1]
indent = label_line[: len(label_line) - len(label_line.lstrip())]

new_block = (
    f"{indent}</div>\n"
    f"{indent}<div>\n"
    f"{indent}  <label style={{labelStyle}}>المبلغ المستلم (يدوي)</label>\n"
    f"{indent}  <input type=\"number\" value={{form.amount_paid || ''}} onChange={{e => setForm(f => ({{ ...f, amount_paid: e.target.value }}))}} style={{inputStyle}} placeholder=\"0\" />\n"
    f"{indent}</div>\n"
)

# نستبدل السطر </div> الأول (idx+1) بالكتلة الجديدة كاملة
lines[idx + 1] = new_block

with io.open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("تم إضافة حقل المبلغ المستلم بنجاح ✅")
