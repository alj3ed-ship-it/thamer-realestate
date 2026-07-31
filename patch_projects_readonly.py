path = r"src\Projects.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly + استدعاء الـ hook
old1 = '''import { supabase } from './supabaseClient';
import ExportToolbar from './components/ExportToolbar';'''
new1 = '''import { supabase } from './supabaseClient';
import { useReadOnly } from './ReadOnlyContext';
import ExportToolbar from './components/ExportToolbar';'''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly")
else:
    print("❌ لم يتم العثور على مكان الاستيراد")

old1b = '''function Projects() {
  const [projects, setProjects] = useState([]);'''
new1b = '''function Projects() {
  const isReadOnly = useReadOnly();
  const [projects, setProjects] = useState([]);'''
if old1b in content:
    content = content.replace(old1b, new1b)
    changes_made.append("✅ استدعاء useReadOnly داخل Projects")
else:
    print("❌ لم يتم العثور على بداية مكون Projects")

# 2) إخفاء زر "+ إضافة مشروع جديد" وزر إلغاء الفورم بالكامل (شريط الأزرار العلوي)
old2 = '''          <div className="no-print" style={styles.buttonRow}>
            {!showForm ? (
              <button onClick={() => setShowForm(true)} style={styles.addBtn}>
                + إضافة مشروع جديد
              </button>
            ) : (
              <button onClick={resetForm} style={styles.cancelBtn}>
                إلغاء
              </button>
            )}
          </div>

          {showForm && ('''
new2 = '''          {!isReadOnly && (
          <div className="no-print" style={styles.buttonRow}>
            {!showForm ? (
              <button onClick={() => setShowForm(true)} style={styles.addBtn}>
                + إضافة مشروع جديد
              </button>
            ) : (
              <button onClick={resetForm} style={styles.cancelBtn}>
                إلغاء
              </button>
            )}
          </div>
          )}

          {!isReadOnly && showForm && ('''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ إخفاء زر إضافة مشروع وفورم الإضافة/التعديل")
else:
    print("❌ لم يتم العثور على شريط زر الإضافة")

# 3) إخفاء رأس عمود الأزرار بالجدول
old3 = '''                    {['اسم المشروع', 'الوصف', 'التاريخ', 'الحالة', 'المصروفات', 'الإيرادات', 'الرصيد', 'ملاحظات', ''].map((h) => ('''
new3 = '''                    {(isReadOnly
                      ? ['اسم المشروع', 'الوصف', 'التاريخ', 'الحالة', 'المصروفات', 'الإيرادات', 'الرصيد', 'ملاحظات']
                      : ['اسم المشروع', 'الوصف', 'التاريخ', 'الحالة', 'المصروفات', 'الإيرادات', 'الرصيد', 'ملاحظات', '']
                    ).map((h) => ('''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء رأس عمود الأزرار بالجدول")
else:
    print("❌ لم يتم العثور على رأس عمود الأزرار")

# 4) إخفاء أزرار تعديل/حذف بكل صف
old4 = '''                        <td className="no-print" style={styles.td}>
                          <div style={styles.actionsBox}>
                            <button onClick={() => startEdit(project)} style={styles.editBtn}>تعديل</button>
                            <button onClick={() => deleteProject(project.id)} style={styles.deleteBtn}>حذف</button>
                          </div>
                        </td>'''
new4 = '''                        {!isReadOnly && (
                        <td className="no-print" style={styles.td}>
                          <div style={styles.actionsBox}>
                            <button onClick={() => startEdit(project)} style={styles.editBtn}>تعديل</button>
                            <button onClick={() => deleteProject(project.id)} style={styles.deleteBtn}>حذف</button>
                          </div>
                        </td>
                        )}'''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء أزرار تعديل/حذف بكل صف")
else:
    print("❌ لم يتم العثور على أزرار تعديل/حذف بالصفوف")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم تحديث Projects.jsx بالكامل ({len(changes_made)}/5)" if len(changes_made) == 5 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/5)")
