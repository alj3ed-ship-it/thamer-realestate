path = r"src\VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد useReadOnly
old1 = '''import ExportToolbar from './components/ExportToolbar'
const TAX_RATE = 0.15'''
new1 = '''import ExportToolbar from './components/ExportToolbar'
import { useReadOnly } from './ReadOnlyContext'
const TAX_RATE = 0.15'''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد useReadOnly")
else:
    print("❌ لم يتم العثور على مكان الاستيراد")

# 2) استدعاء الـ hook داخل مكون VatReturns
old2 = '''export default function VatReturns({ onBack }) {
  const [payments, setPayments] = useState([])'''
new2 = '''export default function VatReturns({ onBack }) {
  const isReadOnly = useReadOnly()
  const [payments, setPayments] = useState([])'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ استدعاء useReadOnly داخل VatReturns")
else:
    print("❌ لم يتم العثور على بداية مكون VatReturns")

# 3) إخفاء منطقة زر التأكيد وحقل الملاحظة بالكامل (كلاهما إجراءات كتابة)
old3 = '''                  <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleFiled(q)}
                      disabled={savingKey === q.key}
                      style={{
                        padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: filing?.filed ? '#fee' : '#1B4D7A',
                        color: filing?.filed ? '#c00' : '#fff', fontWeight: 700, fontSize: 12
                      }}>
                      {savingKey === q.key ? '...' : filing?.filed ? '↺ إلغاء التأكيد' : '✓ تأكيد التقديم'}
                    </button>
                    {filing?.filed && filing?.filed_date && (
                      <span style={{ fontSize: 11, color: '#27ae60' }}>تم بتاريخ: {filing.filed_date}</span>
                    )}
                    <input
                      type="text"
                      placeholder="ملاحظة (اختياري)"
                      value={noteVal}
                      onChange={e => setNoteDrafts(prev => ({ ...prev, [q.key]: e.target.value }))}
                      onBlur={() => saveNote(q)}
                      style={{ flex: 1, minWidth: 140, padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}
                    />
                  </div>'''
new3 = '''                  {!isReadOnly && (
                  <div className="no-print" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleFiled(q)}
                      disabled={savingKey === q.key}
                      style={{
                        padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: filing?.filed ? '#fee' : '#1B4D7A',
                        color: filing?.filed ? '#c00' : '#fff', fontWeight: 700, fontSize: 12
                      }}>
                      {savingKey === q.key ? '...' : filing?.filed ? '↺ إلغاء التأكيد' : '✓ تأكيد التقديم'}
                    </button>
                    {filing?.filed && filing?.filed_date && (
                      <span style={{ fontSize: 11, color: '#27ae60' }}>تم بتاريخ: {filing.filed_date}</span>
                    )}
                    <input
                      type="text"
                      placeholder="ملاحظة (اختياري)"
                      value={noteVal}
                      onChange={e => setNoteDrafts(prev => ({ ...prev, [q.key]: e.target.value }))}
                      onBlur={() => saveNote(q)}
                      style={{ flex: 1, minWidth: 140, padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: 'Cairo, sans-serif' }}
                    />
                  </div>
                  )}
                  {isReadOnly && filing?.filed && filing?.filed_date && (
                    <div style={{ marginTop: 10, fontSize: 11, color: '#27ae60' }}>تم التقديم بتاريخ: {filing.filed_date}</div>
                  )}'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ إخفاء زر التأكيد وحقل الملاحظة (مع إبقاء عرض حالة التقديم فقط للوالد)")
else:
    print("❌ لم يتم العثور على منطقة زر التأكيد وحقل الملاحظة")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print(f"\n✅ تم تحديث VatReturns.jsx بالكامل ({len(changes_made)}/3)" if len(changes_made) == 3 else f"\n⚠️ بعض التعديلات لم تُطبّق ({len(changes_made)}/3)")
