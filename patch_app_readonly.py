path = r"src\App.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes_made = []

# 1) استيراد ReadOnlyProvider
old1 = '''import ViewerLayout from "./ViewerLayout";'''
new1 = '''import ViewerLayout from "./ViewerLayout";
import { ReadOnlyProvider } from "./ReadOnlyContext";'''
if old1 in content:
    content = content.replace(old1, new1)
    changes_made.append("✅ استيراد ReadOnlyProvider")
else:
    print("❌ لم يتم العثور على سطر استيراد ViewerLayout")

# 2) إلغاء الـ return المبكر لـ ViewerLayout (الوالد صار يمر لنفس صفحة الأدمن)
old2 = '''  if (role === "viewer") return <ViewerLayout />;
   if (role === "viewer2") return <ViewerLimited />;'''
new2 = '''   if (role === "viewer2") return <ViewerLimited />;'''
if old2 in content:
    content = content.replace(old2, new2)
    changes_made.append("✅ إلغاء التوجيه لـ ViewerLayout — الوالد صار يمر لصفحة الأدمن")
else:
    print("❌ لم يتم العثور على أسطر التوجيه (viewer/viewer2)")

# 3) لف الـ return الرئيسي بـ ReadOnlyProvider (البداية)
old3 = '''  return (
    <div style={{ display: "flex", minHeight: "100vh", maxWidth: "100vw", overflowX: "hidden", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>'''
new3 = '''  return (
    <ReadOnlyProvider value={role === "viewer"}>
    <div style={{ display: "flex", minHeight: "100vh", maxWidth: "100vw", overflowX: "hidden", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>'''
if old3 in content:
    content = content.replace(old3, new3)
    changes_made.append("✅ لف بداية الصفحة بـ ReadOnlyProvider")
else:
    print("❌ لم يتم العثور على بداية الـ return الرئيسي")

# 4) إخفاء زر الخروج للوالد (ما عنده جلسة تسجيل دخول أصلاً)
old4 = '''        <div style={{ padding: "16px 20px", borderTop: "1px solid #2E6394" }}>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "10px", background: "#c0392b", color: "#fff",
            border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "14px"
          }}>{T.logout}</button>
        </div>'''
new4 = '''        {role !== "viewer" && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid #2E6394" }}>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "10px", background: "#c0392b", color: "#fff",
            border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "14px"
          }}>{T.logout}</button>
        </div>
        )}'''
if old4 in content:
    content = content.replace(old4, new4)
    changes_made.append("✅ إخفاء زر الخروج عن الوالد")
else:
    print("❌ لم يتم العثور على زر الخروج")

# 5) لف نهاية الصفحة بإغلاق ReadOnlyProvider
old5 = '''        {activePage === "defaulters" && (
          <Defaulters
            onBack={goBack}
            onCreateLetter={(data) => {
              setLetterPrefill(data);
              setActivePage("letters");
            }}
          />
        )}
      </div>
    </div>
  );
}'''
new5 = '''        {activePage === "defaulters" && (
          <Defaulters
            onBack={goBack}
            onCreateLetter={(data) => {
              setLetterPrefill(data);
              setActivePage("letters");
            }}
          />
        )}
      </div>
    </div>
    </ReadOnlyProvider>
  );
}'''
if old5 in content:
    content = content.replace(old5, new5)
    changes_made.append("✅ إغلاق ReadOnlyProvider في نهاية الصفحة")
else:
    print("❌ لم يتم العثور على نهاية الصفحة")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n".join(changes_made))
print("\n✅ تم تحديث App.jsx بالكامل" if len(changes_made) == 5 else "\n⚠️ بعض التعديلات لم تُطبّق — راجع الرسائل أعلاه")
