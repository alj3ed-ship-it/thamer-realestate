path = r"src\App.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''  useEffect(() => {
    if (role === "admin") fetchStats();
  }, [role, activePage]);'''

new = '''  useEffect(() => {
    if (role === "admin" || role === "viewer") fetchStats();
  }, [role, activePage]);'''

if old not in content:
    print("❌ لم يتم العثور على النص المطلوب استبداله. تحقق من الملف يدوياً.")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تحديث App.jsx: إحصائيات لوحة التحكم الآن تظهر للوالد أيضاً.")
