import pathlib

path = pathlib.Path("src/ViewerLimited.jsx")
content = path.read_text(encoding="utf-8")

old = '  const [activePage, setActivePage] = useState("tenants");'
new = '  const [activePage, setActivePage] = useState("dashboard");'
assert content.count(old) == 1
content = content.replace(old, new)

path.write_text(content, encoding="utf-8")
print("تم تغيير الصفحة الافتراضية إلى لوحة التحكم بنجاح")