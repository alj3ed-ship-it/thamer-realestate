import re

path = "src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) استيراد المكوّن
old1 = 'import VatReturns from "./VatReturns";'
new1 = 'import VatReturns from "./VatReturns";\nimport DataAudit from "./DataAudit";'
assert content.count(old1) == 1, "old1 not found or not unique"
content = content.replace(old1, new1)

# 2) إضافة تسمية بالعربي
old2 = '  vatReturns: "الإقرارات الضريبية",'
new2 = '  vatReturns: "الإقرارات الضريبية",\n  dataAudit: "تدقيق البيانات",'
assert content.count(old2) == 1, "old2 not found or not unique"
content = content.replace(old2, new2)

# 3) إضافة عنصر بالقائمة الجانبية
old3 = '  { key: "vatReturns", label: T.vatReturns, icon: "🧾" },'
new3 = '  { key: "vatReturns", label: T.vatReturns, icon: "🧾" },\n  { key: "dataAudit", label: T.dataAudit, icon: "🔍" },'
assert content.count(old3) == 1, "old3 not found or not unique"
content = content.replace(old3, new3)

# 4) إضافة شرط عرض الصفحة
old4 = '{activePage === "vatReturns" && <VatReturns onBack={goBack} />}'
new4 = '{activePage === "vatReturns" && <VatReturns onBack={goBack} />}\n        {activePage === "dataAudit" && <DataAudit onBack={goBack} />}'
assert content.count(old4) == 1, "old4 not found or not unique"
content = content.replace(old4, new4)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")
