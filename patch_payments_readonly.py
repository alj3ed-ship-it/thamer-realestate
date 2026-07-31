path = r"src\Payments.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly
old1 = '''import { supabase } from './supabaseClient'
import ExportToolbar from './components/ExportToolbar'

const FREQUENCY_MAP ='''
new1 = '''import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'

const FREQUENCY_MAP ='''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly")
else:
    print("❌ لم يتم العثور على مكان الاستيراد")

# 2) استدعاء الـ hook داخل مكون Payments
old2 = '''function Payments({ onBack }) {
  const [payments, setPayments] = useState([])'''
new2 = '''function Payments({ onBack }) {
  const isReadOnly = useReadOnly()
  const [payments, setPayments] = useState([])'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ استدعاء useReadOnly داخل Payments")
else:
    print("❌ لم يتم العثور على بداية مكون Payments")

# 3) إخفاء زر "+ تسجيل دفعة"
old3 = '''        <button onClick={openAdd} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + تسجيل دفعة
        </button>'''
new3 = '''        {!isReadOnly && (
        <button onClick={openAdd} style={{ padding: '10px 20px', cursor: 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8 }}>
          + تسجيل دفعة
        </button>
        )}'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء زر تسجيل دفعة")
else:
    print("❌ لم يتم العثور على زر تسجيل دفعة")

# 4) إخفاء رأس عمود الأزرار بالجدول
old4 = '''                  {['المستأجر', 'العقار', 'النشاط', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات', ''].map(h => ('''
new4 = '''                  {(isReadOnly
                    ? ['المستأجر', 'العقار', 'النشاط', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات']
                    : ['المستأجر', 'العقار', 'النشاط', 'الوحدة', 'الدفعة', 'المبلغ', 'الحالة', 'التاريخ', 'طريقة الدفع', 'ملاحظات', '']
                  ).map(h => ('''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء رأس عمود الأزرار بالجدول")
else:
    print("❌ لم يتم العثور على رأس عمود الأزرار")

# 5) إخفاء أزرار تعديل/حذف بكل صف
old5 = '''                      <td style={{ padding: '12px' }} className="no-print">
                        <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                          {deletingId === p.id ? '...' : 'حذف'}
                        </button>
                      </td>'''
new5 = '''                      {!isReadOnly && (
                      <td style={{ padding: '12px' }} className="no-print">
                        <button onClick={() => openEdit(p)} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #c0d0e8', background: '#eef3ff', color: '#1B4D7A', cursor: 'pointer', marginLeft: 6 }}>تعديل</button>
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fcc', background: '#fee', color: '#c00', cursor: 'pointer' }}>
                          {deletingId === p.id ? '...' : 'حذف'}
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
print(f"\n✅ تم تحديث Payments.jsx بالكامل ({len(changes_made)}/5)" if len(changes_made) == 5 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/5)")
