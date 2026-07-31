path = r"src\Leases.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly
old1 = '''import { supabase } from "./supabaseClient";
import ExportToolbar from "./components/ExportToolbar";'''
new1 = '''import { supabase } from "./supabaseClient";
import { useReadOnly } from "./ReadOnlyContext";
import ExportToolbar from "./components/ExportToolbar";'''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly")
else:
    print("❌ لم يتم العثور على مكان الاستيراد")

# 2) استدعاء الـ hook داخل مكون Leases
old2 = '''export default function Leases({ onBack }) {
  const [leases, setLeases] = useState([]);'''
new2 = '''export default function Leases({ onBack }) {
  const isReadOnly = useReadOnly();
  const [leases, setLeases] = useState([]);'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ استدعاء useReadOnly داخل Leases")
else:
    print("❌ لم يتم العثور على بداية مكون Leases")

# 3) إخفاء زر "+ إضافة عقد جديد"
old3 = '''        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + إضافة عقد جديد
        </button>'''
new3 = '''        {!isReadOnly && (
        <button onClick={openAddForm} style={{ padding: "10px 20px", cursor: "pointer", background: "#1B4D7A", color: "#fff", border: "none", borderRadius: 8 }}>
          + إضافة عقد جديد
        </button>
        )}'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء زر الإضافة")
else:
    print("❌ لم يتم العثور على زر الإضافة")

# 4) إخفاء رأس عمود الأزرار بالجدول
old4 = '''                  {["المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الضريبة", "الملاحظات", ""].map(h => ('''
new4 = '''                  {(isReadOnly
                    ? ["المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الضريبة", "الملاحظات"]
                    : ["المستأجر", "العقار", "الوحدات", "نوع الدفع", "المبلغ", "الدفعة 1", "الدفعة 2", "الدفعة 3", "الدفعة 4", "الضريبة", "الملاحظات", ""]
                  ).map(h => ('''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء رأس عمود الأزرار بالجدول")
else:
    print("❌ لم يتم العثور على رأس عمود الأزرار")

# 5) إخفاء أزرار تعديل/حذف بكل صف
old5 = '''                      <td className="no-print" style={{ padding: "12px" }}>
                        <button onClick={() => openEditForm(l)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer", marginLeft: 6 }}>تعديل</button>
                        <button onClick={() => handleDelete(l)} disabled={deletingId === l.id} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                          {deletingId === l.id ? "..." : "حذف"}
                        </button>
                      </td>'''
new5 = '''                      {!isReadOnly && (
                      <td className="no-print" style={{ padding: "12px" }}>
                        <button onClick={() => openEditForm(l)} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #c0d0e8", background: "#eef3ff", color: "#1B4D7A", cursor: "pointer", marginLeft: 6 }}>تعديل</button>
                        <button onClick={() => handleDelete(l)} disabled={deletingId === l.id} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #fcc", background: "#fee", color: "#c00", cursor: "pointer" }}>
                          {deletingId === l.id ? "..." : "حذف"}
                        </button>
                      </td>
                      )}'''
if old5 in content:
    content = content.replace(old5, new5)
    changes_made.append("✅ إخفاء أزرار تعديل/حذف بكل صف")
else:
    print("❌ لم يتم العثور على أزرار تعديل/حذف بالصفوف")

# 6) تعطيل زر استثناء الوحدة من فرز النوع (لأنه يعدّل قاعدة البيانات) في وضع القراءة فقط
old6 = '''              onClick={() => toggleUnitExclusion(leaseId, u.id)}'''
new6 = '''              onClick={() => { if (!isReadOnly) toggleUnitExclusion(leaseId, u.id); }}'''
if old6 in content:
    content = content.replace(old6, new6)
    changes_made.append("✅ تعطيل زر استثناء الوحدة (يمنع التعديل بوضع القراءة فقط)")
else:
    print("❌ لم يتم العثور على زر استثناء الوحدة")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم تحديث Leases.jsx بالكامل ({len(changes_made)}/6)" if len(changes_made) == 6 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/6) — راجع الرسائل أعلاه")
