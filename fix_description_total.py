import pathlib

path = pathlib.Path("src/ProjectDetailsModal.jsx")
content = path.read_text(encoding="utf-8")

old_display = '''            {splitToNumberedItems(project.description).length > 0 ? (
              <ol style={{ margin: 0, paddingRight: 20 }}>
                {splitToNumberedItems(project.description).map((item, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                ))}
              </ol>
            ) : '—'}'''
assert content.count(old_display) == 1

new_display = '''            {splitToNumberedItems(project.description).length > 0 ? (
              <>
                <ol style={{ margin: 0, paddingRight: 20 }}>
                  {splitToNumberedItems(project.description).map((item, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                  ))}
                </ol>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>المجموع =</span>
                  <span style={{
                    display: 'inline-block', background: '#e74c3c', color: '#fff',
                    borderRadius: '50%', width: 90, height: 90, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    fontSize: 15, textAlign: 'center', lineHeight: 1.2
                  }}>
                    {Number(project.project_type === 'إيراد' ? project.revenues : project.expenses || 0).toLocaleString()}<br/>ريال
                  </span>
                </div>
              </>
            ) : '—'}'''
content = content.replace(old_display, new_display)

old_export = "    description: splitToNumberedItems(project.description).map((item, i) => `${i + 1}. ${item}`).join('\\n') || '—',"
assert content.count(old_export) == 1
new_export = "    description: (splitToNumberedItems(project.description).map((item, i) => `${i + 1}. ${item}`).join('\\n') + `\\n\\nالمجموع = ${Number(project.project_type === 'إيراد' ? project.revenues : project.expenses || 0).toLocaleString()} ريال`) || '—',"
content = content.replace(old_export, new_export)

path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح")