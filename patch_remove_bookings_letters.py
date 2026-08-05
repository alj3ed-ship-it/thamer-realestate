# -*- coding: utf-8 -*-
"""
سكريبت تعديل App.jsx لنسخة الديمو
يزيل: قاعة مذهلة (Bookings) والخطابات (Letters)
يشتغل فقط على فرع demo — لا تشغله على فرع main!
"""

import re

FILE_PATH = "src/App.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

original_length = len(content)
replacements_made = []

# 1. حذف استيراد Bookings
old = 'import Bookings from "./Bookings";\n'
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف import Bookings")
else:
    print("⚠️ لم يتم العثور على: import Bookings")

# 2. حذف استيراد Letters
old = 'import Letters from "./Letters";\n'
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف import Letters")
else:
    print("⚠️ لم يتم العثور على: import Letters")

# 3. حذف تعريف نص bookings من كائن الترجمة T
old = '  bookings: "قاعة مذهلة",\n'
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف T.bookings")
else:
    print("⚠️ لم يتم العثور على: T.bookings")

# 4. حذف تعريف نص letters من كائن الترجمة T
old = '  letters: "الخطابات",\n'
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف T.letters")
else:
    print("⚠️ لم يتم العثور على: T.letters")

# 5. حذف عنصر bookings من NAV_ITEMS
old = '  { key: "bookings", label: T.bookings, icon: "🎉" },\n'
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف NAV_ITEMS.bookings")
else:
    print("⚠️ لم يتم العثور على: NAV_ITEMS.bookings")

# 6. حذف عنصر letters من NAV_ITEMS
old = '  { key: "letters", label: T.letters, icon: "✉️" },\n'
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف NAV_ITEMS.letters")
else:
    print("⚠️ لم يتم العثور على: NAV_ITEMS.letters")

# 7. حذف عرض صفحة Bookings
old = '        {activePage === "bookings" && <Bookings onBack={goBack} />}\n'
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف عرض صفحة Bookings")
else:
    print("⚠️ لم يتم العثور على: عرض صفحة Bookings")

# 8. حذف عرض صفحة Letters (كتلة من 3 أسطر)
old = '''        {activePage === "letters" && (
          <Letters onBack={goBack} prefillData={letterPrefill} onPrefillConsumed={() => setLetterPrefill(null)} />
        )}
'''
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف عرض صفحة Letters")
else:
    print("⚠️ لم يتم العثور على: عرض صفحة Letters (سيتم محاولة نمط بديل)")
    # نمط بديل بمسافات مختلفة محتملة
    pattern = re.compile(
        r'\s*\{activePage === "letters" && \(\s*<Letters[^}]*?/>\s*\)\}\s*\n',
        re.DOTALL
    )
    content, n = pattern.subn("\n", content)
    if n:
        replacements_made.append(f"حذف عرض صفحة Letters (نمط بديل، {n} مطابقة)")
    else:
        print("❌ فشل حذف عرض صفحة Letters — يلزم تعديل يدوي")

# 9. إزالة onCreateLetter prop من Defaulters (يستدعي صفحة letters المحذوفة)
old = '''            onCreateLetter={(data) => {
              setLetterPrefill(data);
              setActivePage("letters");
            }}
'''
if old in content:
    content = content.replace(old, "")
    replacements_made.append("حذف onCreateLetter prop من Defaulters")
else:
    print("⚠️ لم يتم العثور على: onCreateLetter prop (قد تختلف المسافات)")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print("\n" + "=" * 50)
print(f"تم! التغييرات المطبقة ({len(replacements_made)}):")
for r in replacements_made:
    print(f"  ✅ {r}")
print(f"\nحجم الملف قبل: {original_length} حرف")
print(f"حجم الملف بعد: {len(content)} حرف")
print("=" * 50)
