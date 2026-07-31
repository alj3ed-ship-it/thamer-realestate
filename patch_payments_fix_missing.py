path = r"src\Payments.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# تحقق أول: هل الاستيراد موجود مسبقاً؟ (لتفادي التكرار لو شغّلنا هذا أكثر من مرة)
if "useReadOnly" in content:
    print("ℹ️ يبدو أن useReadOnly مذكور بالفعل بالملف — تحقق يدوياً قبل المتابعة.")
else:
    # 1) إضافة الاستيراد بعد سطر ExportToolbar (مرساة قصيرة وموثوقة)
    old1 = '''import ExportToolbar from './components/ExportToolbar'''
    new1 = '''import ExportToolbar from './components/ExportToolbar'
import { useReadOnly } from './ReadOnlyContext'''
    if old1 in content:
        content = content.replace(old1, new1, 1)
        changes_made.append("✅ تمت إضافة استيراد useReadOnly")
    else:
        print("❌ لم يتم العثور على سطر استيراد ExportToolbar")

    # 2) إضافة استدعاء الـ hook بعد بداية دالة Payments (مرساة قصيرة وموثوقة)
    old2 = '''function Payments({ onBack }) {'''
    new2 = '''function Payments({ onBack }) {
  const isReadOnly = useReadOnly()'''
    if old2 in content:
        content = content.replace(old2, new2, 1)
        changes_made.append("✅ تمت إضافة استدعاء useReadOnly داخل Payments")
    else:
        print("❌ لم يتم العثور على بداية دالة Payments")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print("\n".join(changes_made))
    print(f"\n✅ تم إصلاح الملف ({len(changes_made)}/2)" if len(changes_made) == 2 else f"\n⚠️ لم يكتمل الإصلاح ({len(changes_made)}/2) — أرسل محتوى الملف الحالي فوراً")
