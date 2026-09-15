import io

path = "src/Letters.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''  {
    key: "other",
    label: "أخرى",
    buildBody: () => "",
  },'''

new = '''  {
    key: "tax_certificate_request",
    label: "طلب شهادة تسجيل ضريبي",
    buildBody: ({ tenant, property, unit }) =>
      `المكرم / ${tenant || "..........."}\\n\\nالسلام عليكم ورحمة الله وبركاته، وبعد:\\n\\nإشارةً إلى عقد الإيجار المبرم بينكم وبين مكتبنا بخصوص الوحدة (${unit || "..........."}) الكائنة ضمن ${property || "..........."}، ونظراً لالتزام مكتبنا بإصدار الفواتير الضريبية وفق الأنظمة والتعليمات الصادرة عن هيئة الزكاة والضريبة والجمارك (ZATCA)، فإننا نأمل من سعادتكم موافاتنا بنسخة من شهادة التسجيل الضريبي الخاصة بكم (متضمنة الرقم الضريبي)، وذلك لاستكمال متطلبات إصدار الفاتورة الضريبية المتعلقة بالعقد المذكور.\\n\\nيرجى التكرم بإرسال المستند عبر البريد الإلكتروني أو وسيلة التواصل المتاحة لديكم في أقرب وقت ممكن، تسهيلاً لإجراءات الفوترة من جانبنا.\\n\\nشاكرين لكم حسن تعاونكم، ودمتم بخير.`,
  },
  {
    key: "other",
    label: "أخرى",
    buildBody: () => "",
  },'''

assert content.count(old) == 1, f"match count = {content.count(old)}"
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم بنجاح ✅")