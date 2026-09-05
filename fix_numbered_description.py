import pathlib

path = pathlib.Path("src/ProjectDetailsModal.jsx")
content = path.read_text(encoding="utf-8")

old_top = "export default function ProjectDetailsModal({ project, onClose, onEdit, onDelete, isReadOnly }) {"
assert content.count(old_top) == 1

new_top = '''function splitToNumberedItems(text) {
  if (!text) return [];
  return text
    .split(/؛|\\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

export default function ProjectDetailsModal({ project, onClose, onEdit, onDelete, isReadOnly }) {'''

content = content.replace(old_top, new_top)

old_export_desc = "    description: project.description || '—',"
assert content.count(old_export_desc) == 1
new_export_desc = "    description: splitToNumberedItems(project.description).map((item, i) => `${i + 1}. ${item}`).join('\\n') || '—',"
content = content.replace(old_export_desc, new_export_desc)

old_display = '''        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <span style={labelStyle}>الوصف:</span>
          <div style={{ whiteSpace: 'pre-wrap', flex: 1, color: '#374151' }}>{project.description || '—'}</div>
        </div>'''
assert content.count(old_display) == 1

new_display = '''        <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
          <span style={labelStyle}>الوصف:</span>
          <div style={{ flex: 1, color: '#374151' }}>
            {splitToNumberedItems(project.description).length > 0 ? (
              <ol style={{ margin: 0, paddingRight: 20 }}>
                {splitToNumberedItems(project.description).map((item, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>{item}</li>
                ))}
              </ol>
            ) : '—'}
          </div>
        </div>'''
content = content.replace(old_display, new_display)

path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح")