path = r"src\Units.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly
old1 = '''import { supabase } from './supabaseClient'
import ExportToolbar from './components/ExportToolbar'

const statusColor ='''
new1 = '''import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'
import ExportToolbar from './components/ExportToolbar'

const statusColor ='''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly")
else:
    print("❌ لم يتم العثور على مكان الاستيراد")

# 2) استدعاء الـ hook داخل مكون Units
old2 = '''export default function Units({ onBack }) {
  const [units, setUnits] = useState([])'''
new2 = '''export default function Units({ onBack }) {
  const isReadOnly = useReadOnly()
  const [units, setUnits] = useState([])'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ استدعاء useReadOnly داخل Units")
else:
    print("❌ لم يتم العثور على بداية مكون Units")

# 3) تعطيل قائمة تغيير تصنيف الضريبة (فيها كتابة مباشرة لقاعدة البيانات)
old3 = '''                        <select
                          value={vatValue}
                          disabled={updatingId === u.id}
                          onChange={e => handleVatChange(u.id, e.target.value)}'''
new3 = '''                        <select
                          value={vatValue}
                          disabled={isReadOnly || updatingId === u.id}
                          onChange={e => handleVatChange(u.id, e.target.value)}'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ تعطيل قائمة تصنيف الضريبة بوضع القراءة فقط")
else:
    print("❌ لم يتم العثور على قائمة تصنيف الضريبة")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم تحديث Units.jsx بالكامل ({len(changes_made)}/3)" if len(changes_made) == 3 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/3)")
