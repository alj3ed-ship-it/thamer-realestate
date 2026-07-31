path = r"src\PropertyDetail.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly
old1 = '''import { supabase } from './supabaseClient'
import ExportToolbar from './components/ExportToolbar'

const UNIT_STATUS ='''
new1 = '''import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'

const UNIT_STATUS ='''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly")
else:
    print("❌ لم يتم العثور على مكان الاستيراد")

# 2) استدعاء الـ hook داخل مكون PropertyDetail
old2 = '''export default function PropertyDetail({ propertyId, onBack }) {
  const [property, setProperty] = useState(null)'''
new2 = '''export default function PropertyDetail({ propertyId, onBack }) {
  const isReadOnly = useReadOnly()
  const [property, setProperty] = useState(null)'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ استدعاء useReadOnly داخل PropertyDetail")
else:
    print("❌ لم يتم العثور على بداية مكون PropertyDetail")

# 3) إخفاء زر "+ إضافة وحدة"
old3 = '''        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة وحدة
        </button>'''
new3 = '''        {!isReadOnly && (
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة وحدة
        </button>
        )}'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء زر الإضافة")
else:
    print("❌ لم يتم العثور على زر الإضافة")

# 4) إخفاء رأس عمود الأزرار بالجدول
old4 = '''                {['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات', ''].map(h => ('''
new4 = '''                {(isReadOnly
                  ? ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات']
                  : ['رقم الوحدة', 'النوع', 'الدور', 'المساحة', 'الحالة', 'ملاحظات', '']
                ).map(h => ('''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء رأس عمود الأزرار بالجدول")
else:
    print("❌ لم يتم العثور على رأس عمود الأزرار")

# 5) إخفاء أزرار تعديل/حذف بكل صف
old5 = '''                  <td className="no-print" style={{ padding: '12px' }}>
                    <button onClick={() => openEditForm(u)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                    <button onClick={() => handleDelete(u)} disabled={deletingId === u.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                      {deletingId === u.id ? '...' : 'حذف'}
                    </button>
                  </td>'''
new5 = '''                  {!isReadOnly && (
                  <td className="no-print" style={{ padding: '12px' }}>
                    <button onClick={() => openEditForm(u)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                    <button onClick={() => handleDelete(u)} disabled={deletingId === u.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                      {deletingId === u.id ? '...' : 'حذف'}
                    </button>
                  </td>
                  )}'''
if old5 in content:
    content = content.replace(old5, new5)
    changes_made.append("✅ إخفاء أزرار تعديل/حذف بكل صف")
else:
    print("❌ لم يتم العثور على أزرار تعديل/حذف بالصفوف")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم تحديث PropertyDetail.jsx بالكامل ({len(changes_made)}/5)" if len(changes_made) == 5 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/5)")
