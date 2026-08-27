import pathlib

# ==================== 1) DashboardCharts.jsx: دعم قيد العقارات ====================
dc_path = pathlib.Path("src/components/DashboardCharts.jsx")
dc = dc_path.read_text(encoding="utf-8")

old_fn_sig = "function DashboardCharts() {"
new_fn_sig = "function DashboardCharts({ restrictToPropertyIds = null }) {"
assert dc.count(old_fn_sig) == 1
dc = dc.replace(old_fn_sig, new_fn_sig)

old_filter_ids = """  const filterIds = selectedProperties.length > 0 ? selectedProperties : null;"""
new_filter_ids = """  const filterIds = selectedProperties.length > 0 ? selectedProperties : restrictToPropertyIds;"""
assert dc.count(old_filter_ids) == 1
dc = dc.replace(old_filter_ids, new_filter_ids)

new_load_props = """  const loadProperties = async () => {
    let query = supabase.from('properties').select('id, name');
    if (restrictToPropertyIds) query = query.in('id', restrictToPropertyIds);
    const { data, error } = await query;
    if (!error) setProperties(sortByPriority(data || []));
  };"""
if dc.count(new_load_props) == 0:
    prev_load_props = """  const loadProperties = async () => {
    const { data, error } = await supabase.from('properties').select('id, name');
    if (!error) setProperties(sortByPriority(data || []));
  };"""
    assert dc.count(prev_load_props) == 1
    dc = dc.replace(prev_load_props, new_load_props)

old_all_label = '<span>كل العقارات</span>'
new_all_label = "<span>{restrictToPropertyIds ? 'كل عقاراتي' : 'كل العقارات'}</span>"
assert dc.count(old_all_label) == 1
dc = dc.replace(old_all_label, new_all_label)

old_filter_label_fn = """  const filterLabel = () => {
    if (selectedProperties.length === 0) return 'كل العقارات';"""
new_filter_label_fn = """  const filterLabel = () => {
    if (selectedProperties.length === 0) return restrictToPropertyIds ? 'كل عقاراتي' : 'كل العقارات';"""
assert dc.count(old_filter_label_fn) == 1
dc = dc.replace(old_filter_label_fn, new_filter_label_fn)

dc_path.write_text(dc, encoding="utf-8")
print("1/2: DashboardCharts.jsx أصبح يدعم القيد بنجاح")

# ==================== 2) ViewerLimited.jsx: إضافة تبويب لوحة التحكم ====================
vl_path = pathlib.Path("src/ViewerLimited.jsx")
vl = vl_path.read_text(encoding="utf-8")

old_import = 'import { useState, useEffect, useMemo } from "react";'
new_import = ('import { useState, useEffect, useMemo } from "react";\n'
              'import DashboardCharts from "./components/DashboardCharts";')
assert vl.count(old_import) == 1
vl = vl.replace(old_import, new_import)

old_nav_btn = '''        <button style={navStyle("tenants")} onClick={() => { setActivePage("tenants"); setSelectedTenant(null); }}>المستأجرون</button>'''
new_nav_btn = '''        <button style={navStyle("dashboard")} onClick={() => { setActivePage("dashboard"); setSelectedTenant(null); }}>لوحة التحكم</button>
        <button style={navStyle("tenants")} onClick={() => { setActivePage("tenants"); setSelectedTenant(null); }}>المستأجرون</button>'''
assert vl.count(old_nav_btn) == 1
vl = vl.replace(old_nav_btn, new_nav_btn)

old_content_start = '''            {activePage === "tenants" && (
              <div>'''
new_content_start = '''            {activePage === "dashboard" && (
              <div>
                <DashboardCharts restrictToPropertyIds={allowedPropertyIds} />
              </div>
            )}

            {activePage === "tenants" && (
              <div>'''
assert vl.count(old_content_start) == 1
vl = vl.replace(old_content_start, new_content_start)

vl_path.write_text(vl, encoding="utf-8")
print("2/2: ViewerLimited.jsx أصبح فيه تبويب لوحة التحكم بنجاح")