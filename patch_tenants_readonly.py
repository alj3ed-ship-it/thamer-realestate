path = r"src\Tenants.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly
old1 = '''import { getUnitTypeColor } from './theme'
import ExportToolbar from './components/ExportToolbar'

function TenantDetail({ tenant, onBack }) {'''
new1 = '''import { getUnitTypeColor } from './theme'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'

function TenantDetail({ tenant, onBack }) {'''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly")
else:
    print("❌ لم يتم العثور على مكان الاستيراد")

# 2) استدعاء الـ hook داخل مكون Tenants
old2 = '''function Tenants({ onBack }) {
  const [tenants, setTenants] = useState([])'''
new2 = '''function Tenants({ onBack }) {
  const isReadOnly = useReadOnly()
  const [tenants, setTenants] = useState([])'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ استدعاء useReadOnly داخل Tenants")
else:
    print("❌ لم يتم العثور على بداية مكون Tenants")

# 3) إخفاء زر "+ إضافة مستأجر جديد"
old3 = '''        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة مستأجر جديد
        </button>'''
new3 = '''        {!isReadOnly && (
        <button onClick={openAddForm} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + إضافة مستأجر جديد
        </button>
        )}'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء زر الإضافة")
else:
    print("❌ لم يتم العثور على زر الإضافة")

# 4) إخفاء عمود أزرار تعديل/حذف بالكامل (رأس العمود الفارغ بالجدول)
old4 = '''                  {['المستأجر', 'العقار', 'الوحدات', 'الجوال', 'ملاحظات', ''].map(h => ('''
new4 = '''                  {(isReadOnly ? ['المستأجر', 'العقار', 'الوحدات', 'الجوال', 'ملاحظات'] : ['المستأجر', 'العقار', 'الوحدات', 'الجوال', 'ملاحظات', '']).map(h => ('''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء رأس عمود الأزرار بالجدول")
else:
    print("❌ لم يتم العثور على رأس عمود الأزرار")

# 5) إخفاء أزرار تعديل/حذف بكل صف
old5 = '''                    <td className="no-print" style={{ padding: '12px' }}>
                      <button onClick={() => openEditForm(t)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                      <button onClick={() => handleDelete(t)} disabled={deletingId === t.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                        {deletingId === t.id ? '...' : 'حذف'}
                      </button>
                    </td>'''
new5 = '''                    {!isReadOnly && (
                    <td className="no-print" style={{ padding: '12px' }}>
                      <button onClick={() => openEditForm(t)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                      <button onClick={() => handleDelete(t)} disabled={deletingId === t.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                        {deletingId === t.id ? '...' : 'حذف'}
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
print("\n✅ تم تحديث Tenants.jsx بالكامل" if len(changes_made) == 5 else "\n⚠️ بعض التعديلات لم تُطبّق — راجع الرسائل أعلاه")
