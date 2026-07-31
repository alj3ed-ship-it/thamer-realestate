path = r"src\VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

if "import { useReadOnly } from './ReadOnlyContext'" in content:
    print("ℹ️ الاستيراد موجود بالفعل بالملف — لا حاجة للإصلاح. تحقق من مصدر الخطأ يدوياً.")
else:
    old1 = '''import ExportToolbar from './components/ExportToolbar\''''
    new1 = '''import ExportToolbar from './components/ExportToolbar'
import { useReadOnly } from './ReadOnlyContext\''''
    if old1 in content:
        content = content.replace(old1, new1, 1)
        changes_made.append("✅ تمت إضافة استيراد useReadOnly")
    else:
        print("❌ لم يتم العثور على سطر استيراد ExportToolbar")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print("\n".join(changes_made))
    print(f"\n✅ تم إصلاح الملف ({len(changes_made)}/1)" if len(changes_made) == 1 else f"\n⚠️ لم يكتمل الإصلاح — أرسل محتوى الملف الحالي فوراً")
