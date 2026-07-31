# -*- coding: utf-8 -*-
FILE = "src/Payments.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Unify the "غير مستحق بعد" status badge color with the amount's gold color
old_badge = """    if (computed === 'not_due') return <span style={{ background: '#F4F6F7', color: '#7f8c8d', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>غير مستحق بعد ⏳</span>"""
new_badge = """    if (computed === 'not_due') return <span style={{ background: '#FDF6E3', color: '#b7950b', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>غير مستحق بعد ⏳</span>"""
if old_badge not in content:
    raise SystemExit("PATCH FAILED: not_due badge not found — aborting safely.")
content = content.replace(old_badge, new_badge)

# 2) Change activity badge color from teal-green (too close to paid green) to purple
old_activity = """                        <span style={{ background: '#E8F6F3', color: '#148F77', border: '1px solid #A2D9CE', padding: '3px 10px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {getTenantActivity(p.lease_id)}
                        </span>"""
new_activity = """                        <span style={{ background: '#F4ECF7', color: '#8E44AD', border: '1px solid #D2B4DE', padding: '3px 10px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {getTenantActivity(p.lease_id)}
                        </span>"""
if old_activity not in content:
    raise SystemExit("PATCH FAILED: activity badge not found — aborting safely.")
content = content.replace(old_activity, new_activity)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل Payments.jsx بنجاح — توحيد لون غير مستحق وتغيير لون النشاط")
