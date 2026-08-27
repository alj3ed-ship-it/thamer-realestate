import pathlib

path = pathlib.Path("src/components/DashboardCharts.jsx")
content = path.read_text(encoding="utf-8")

# 1) ترتيب مخصص للعقارات بدل الترتيب الأبجدي
old_order_const = "const BAR_HIGHLIGHT = '#f59e0b';"
new_order_const = """const BAR_HIGHLIGHT = '#f59e0b';
const PROPERTY_ORDER = ['عمارة سلمان', 'عمارة أبراهيم', 'عمارة عبدالله الكبيرة', 'عمارة عبدالله الصغيره'];
function sortByPriority(list) {
  return [...list].sort((a, b) => {
    const ia = PROPERTY_ORDER.indexOf(a.name);
    const ib = PROPERTY_ORDER.indexOf(b.name);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, 'ar');
  });
}"""
assert content.count(old_order_const) == 1
content = content.replace(old_order_const, new_order_const)

old_load_props = """  const loadProperties = async () => {
    const { data, error } = await supabase.from('properties').select('id, name').order('name');
    if (!error) setProperties(data || []);
  };"""
new_load_props = """  const loadProperties = async () => {
    const { data, error } = await supabase.from('properties').select('id, name');
    if (!error) setProperties(sortByPriority(data || []));
  };"""
assert content.count(old_load_props) == 1
content = content.replace(old_load_props, new_load_props)

# 2) بطاقة "إجمالي صافي كل العقود" تحترم الفلتر بدل ما تجيب كل العقود دائماً
old_hijri = """  const loadHijriYearTotal = async () => {
    const { data, error } = await supabase
      .from("leases")
      .select("rent_amount, tax_enabled, amount_includes_vat")
      .neq("status", "منتهي");
    if (error || !data) return;
    const total = data.reduce(
      (sum, l) => sum + computeNetRevenue(l.rent_amount, l.tax_enabled, l.amount_includes_vat),
      0
    );
    setHijriYearTotal(Math.round(total));
  };"""
new_hijri = """  const loadHijriYearTotal = async () => {
    let query = supabase
      .from("leases")
      .select("rent_amount, tax_enabled, amount_includes_vat, property_id")
      .neq("status", "منتهي");
    if (filterIds) query = query.in("property_id", filterIds);
    const { data, error } = await query;
    if (error || !data) return;
    const total = data.reduce(
      (sum, l) => sum + computeNetRevenue(l.rent_amount, l.tax_enabled, l.amount_includes_vat),
      0
    );
    setHijriYearTotal(Math.round(total));
  };"""
assert content.count(old_hijri) == 1
content = content.replace(old_hijri, new_hijri)

# تسمية البطاقة توضيحياً: تصير "إجمالي صافي العقود" (بدل "كل العقود") لما يكون فيه فلتر مطبق
old_label = '<div style={styles.kpiLabel}>إجمالي صافي كل العقود (ريال)</div>'
new_label = "<div style={styles.kpiLabel}>{isGroupedView && !filterIds ? 'إجمالي صافي كل العقود (ريال)' : 'إجمالي صافي العقود المحددة (ريال)'}</div>"
assert content.count(old_label) == 1
content = content.replace(old_label, new_label)

path.write_text(content, encoding="utf-8")
print("تم إصلاح الترتيب وربط بطاقة الإجمالي بالفلتر بنجاح")