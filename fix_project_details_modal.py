import pathlib

path = pathlib.Path("src/Projects.jsx")
content = path.read_text(encoding="utf-8")

# 1) استيراد المودال
old_import = "import ExportToolbar from './components/ExportToolbar';"
assert content.count(old_import) == 1
new_import = old_import + "\nimport ProjectDetailsModal from './ProjectDetailsModal';"
content = content.replace(old_import, new_import)

# 2) إضافة state جديد
old_state = "  const [searchQuery, setSearchQuery] = useState('');"
assert content.count(old_state) == 1
new_state = old_state + "\n  const [viewingProjectId, setViewingProjectId] = useState(null);"
content = content.replace(old_state, new_state)

# 3) جعل اسم المشروع قابل للضغط
old_cell = '''                        <td style={{ ...styles.td, fontWeight: 600, color: '#1B4D7A' }}>{project.name}</td>'''
assert content.count(old_cell) == 1
new_cell = '''                        <td
                          onClick={() => setViewingProjectId(project.id)}
                          style={{ ...styles.td, fontWeight: 600, color: '#1B4D7A', cursor: 'pointer', textDecoration: 'underline' }}
                          title="اضغط لعرض تفاصيل المشروع"
                        >{project.name}</td>'''
content = content.replace(old_cell, new_cell)

# 4) إضافة المودال قبل نهاية المكون
old_end = '''      )}
    </div>
  );
}

const styles = {'''
assert content.count(old_end) == 1
new_end = '''      )}

      <ProjectDetailsModal
        project={projects.find(p => p.id === viewingProjectId)}
        onClose={() => setViewingProjectId(null)}
        onEdit={(project) => { setViewingProjectId(null); startEdit(project); }}
        onDelete={(id) => { deleteProject(id); setViewingProjectId(null); }}
        isReadOnly={isReadOnly}
      />
    </div>
  );
}

const styles = {'''
content = content.replace(old_end, new_end)

path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح")