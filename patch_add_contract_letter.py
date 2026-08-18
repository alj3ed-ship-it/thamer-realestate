import pathlib

path = pathlib.Path("src/Letters.jsx")
content = path.read_text(encoding="utf-8")

old = '''  {
    key: "other",
    label: "أخرى",
    buildBody: () => "",
  },
];'''

new = '''  {
    key: "contract_signing",
    label: "إبرام عقد",
    buildBody: ({ tenant, property, unit, amount }) =>
      `المكرم / ${tenant || "..........."}\\n\\nالسلام عليكم ورحمة الله وبركاته،\\n\\nيسرنا إفادتكم بأنه قد تم إبرام عقد الإيجار الخاص بالوحدة (${unit || "..........."}) الكائنة ضمن ${property || "..........."}، وذلك بقيمة إجمالية قدرها (${amount || "..........."} ريال)، وفقاً للشروط والأحكام المتفق عليها بين الطرفين.\\n\\nنتمنى لكم إقامة موفقة، ونؤكد حرصنا على التعاون البنّاء معكم طوال مدة العقد.\\n\\nولكم منا خالص الشكر والتقدير.`,
  },
  {
    key: "other",
    label: "أخرى",
    buildBody: () => "",
  },
];'''

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)
path.write_text(content, encoding="utf-8")
print("تم إضافة نوع الخطاب 'إبرام عقد' بنجاح ✅")
