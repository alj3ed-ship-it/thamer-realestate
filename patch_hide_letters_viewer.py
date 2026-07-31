path = r"src\App.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV_ITEMS.map(item => ('''
new = '''        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV_ITEMS.filter(item => !(role === "viewer" && item.key === "letters")).map(item => ('''

if old not in content:
    print("❌ لم يتم العثور على قسم عرض قائمة التنقل. تحقق من الملف يدوياً.")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تحديث App.jsx: تبويب الخطابات الآن مخفي عن الوالد بالكامل.")
