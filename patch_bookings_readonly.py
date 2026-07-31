path = r"src\Bookings.jsx"

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

old1b = '''export default function Bookings() {
  const [bookings, setBookings] = useState([]);'''
new1b = '''export default function Bookings() {
  const isReadOnly = useReadOnly();
  const [bookings, setBookings] = useState([]);'''
if old1b in content:
    content = content.replace(old1b, new1b)
    changes_made.append("✅ استدعاء useReadOnly داخل Bookings")
else:
    print("❌ لم يتم العثور على بداية مكون Bookings")

# 2) إخفاء زري "+ إضافة دخل إضافي" و"+ إضافة حجز جديد"
old2 = '''        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openAddExtraForm}
            style={{
              background: '#148F77',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            + إضافة دخل إضافي
          </button>
          <button
            onClick={openAddForm}
            style={{
              background: '#1B4D7A',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            + إضافة حجز جديد
          </button>
        </div>'''
new2 = '''        {!isReadOnly && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openAddExtraForm}
            style={{
              background: '#148F77',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            + إضافة دخل إضافي
          </button>
          <button
            onClick={openAddForm}
            style={{
              background: '#1B4D7A',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            + إضافة حجز جديد
          </button>
        </div>
        )}'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ إخفاء زري إضافة دخل إضافي وإضافة حجز")
else:
    print("❌ لم يتم العثور على أزرار الإضافة العلوية")

# 3) إخفاء قسم "بانتظار الاعتماد" بالكامل (سير عمل إداري بين المحاسب والأدمن)
old3 = '''      {pendingBookings.length > 0 && ('''
new3 = '''      {!isReadOnly && pendingBookings.length > 0 && ('''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء قسم بانتظار الاعتماد بالكامل")
else:
    print("❌ لم يتم العثور على قسم بانتظار الاعتماد")

# 4) إخفاء رأس عمود "إجراءات" وأزرار تعديل/حذف بجدول الحجوزات الرئيسي
old4 = '''                    <th style={th}>الاستلام النهائي (باقي)</th>
                    <th style={th}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b, idx) => {'''
new4 = '''                    <th style={th}>الاستلام النهائي (باقي)</th>
                    {!isReadOnly && <th style={th}>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b, idx) => {'''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء رأس عمود إجراءات بجدول الحجوزات")
else:
    print("❌ لم يتم العثور على رأس عمود إجراءات بجدول الحجوزات")

old5 = '''                        <td style={td}>
                          <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                          <button onClick={() => handleDelete(b.id)} style={actionBtn('#e74c3c')}>حذف</button>
                        </td>'''
new5 = '''                        {!isReadOnly && (
                        <td style={td}>
                          <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                          <button onClick={() => handleDelete(b.id)} style={actionBtn('#e74c3c')}>حذف</button>
                        </td>
                        )}'''
if old5 in content:
    content = content.replace(old5, new5)
    changes_made.append("✅ إخفاء أزرار تعديل/حذف بجدول الحجوزات")
else:
    print("❌ لم يتم العثور على أزرار تعديل/حذف بجدول الحجوزات")

# 5) إخفاء رأس عمود "إجراءات" وأزرار تعديل/حذف بمودال تفاصيل الدخل الإضافي
old6 = '''                    <th style={th}>ملاحظات</th>
                    <th style={th}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExtraIncome.map((e, idx) => {'''
new6 = '''                    <th style={th}>ملاحظات</th>
                    {!isReadOnly && <th style={th}>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredExtraIncome.map((e, idx) => {'''
if old6 in content:
    content = content.replace(old6, new6)
    changes_made.append("✅ إخفاء رأس عمود إجراءات بمودال الدخل الإضافي")
else:
    print("❌ لم يتم العثور على رأس عمود إجراءات بمودال الدخل الإضافي")

old7 = '''                        <td style={td}>{e.notes || '—'}</td>
                        <td style={td}>
                          <button onClick={() => openEditExtraForm(e)} style={actionBtn('#1B4D7A')}>تعديل</button>
                          <button onClick={() => handleDeleteExtra(e.id)} style={actionBtn('#e74c3c')}>حذف</button>
                        </td>'''
new7 = '''                        <td style={td}>{e.notes || '—'}</td>
                        {!isReadOnly && (
                        <td style={td}>
                          <button onClick={() => openEditExtraForm(e)} style={actionBtn('#1B4D7A')}>تعديل</button>
                          <button onClick={() => handleDeleteExtra(e.id)} style={actionBtn('#e74c3c')}>حذف</button>
                        </td>
                        )}'''
if old7 in content:
    content = content.replace(old7, new7)
    changes_made.append("✅ إخفاء أزرار تعديل/حذف بمودال الدخل الإضافي")
else:
    print("❌ لم يتم العثور على أزرار تعديل/حذف بمودال الدخل الإضافي")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم تحديث Bookings.jsx بالكامل ({len(changes_made)}/7)" if len(changes_made) == 7 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/7)")
