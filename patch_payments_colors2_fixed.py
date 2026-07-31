# -*- coding: utf-8 -*-
FILE = "src/Payments.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Change "not_due" amount color from gray (too close to other gray text) to a distinct amber/gold
old_color = """    const amountColor = computed === 'paid' ? '#27ae60'
      : computed === 'overdue' ? '#e74c3c'
      : computed === 'not_due' ? '#7f8c8d'
      : '#27ae60'"""
new_color = """    const amountColor = computed === 'paid' ? '#27ae60'
      : computed === 'overdue' ? '#e74c3c'
      : computed === 'not_due' ? '#b7950b'
      : '#27ae60'"""
if old_color not in content:
    raise SystemExit("PATCH FAILED: amountColor block not found — aborting safely.")
content = content.replace(old_color, new_color)

# 2) Give the "النشاط" (activity) column a colored badge instead of plain gray text
old_activity_cell = """                      <td style={{ padding: '16px 18px', color: '#6b7280', fontSize: 13 }}>{getTenantActivity(p.lease_id)}</td>"""
new_activity_cell = """                      <td style={{ padding: '16px 18px' }}>
                        <span style={{ background: '#E8F6F3', color: '#148F77', border: '1px solid #A2D9CE', padding: '3px 10px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {getTenantActivity(p.lease_id)}
                        </span>
                      </td>"""
if old_activity_cell not in content:
    raise SystemExit("PATCH FAILED: activity cell not found — aborting safely.")
content = content.replace(old_activity_cell, new_activity_cell)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تعديل Payments.jsx بنجاح — تمييز لون غير مستحق + بادج النشاط")
