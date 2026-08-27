import pathlib

path = pathlib.Path("src/components/DashboardCharts.jsx")
content = path.read_text(encoding="utf-8")

old_effect = """  useEffect(() => {
    loadAll();
  }, [selectedProperties]);"""
new_effect = """  useEffect(() => {
    // تفادي وميض صفري: لا نحمّل البيانات إذا كان القيد لسا فاضي مؤقتاً (قبل اكتمال تحميل العقارات المسموحة)
    if (restrictToPropertyIds !== null && restrictToPropertyIds.length === 0 && selectedProperties.length === 0) return;
    loadAll();
  }, [selectedProperties, restrictToPropertyIds]);"""
assert content.count(old_effect) == 1
content = content.replace(old_effect, new_effect)

old_props_effect = """  useEffect(() => {
    loadProperties();
  }, []);"""
new_props_effect = """  useEffect(() => {
    loadProperties();
  }, [restrictToPropertyIds]);"""
assert content.count(old_props_effect) == 1
content = content.replace(old_props_effect, new_props_effect)

path.write_text(content, encoding="utf-8")
print("تم إصلاح مشكلة التحميل الفارغ عند فتح لوحة المحاسب بنجاح")