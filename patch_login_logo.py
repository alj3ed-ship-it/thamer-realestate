import re

path = r"C:\Users\aljuaid\Desktop\thamer-realestate\src\Login.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة استيراد اللوقو بعد استيراد supabase
old_import = 'import { supabase } from "./supabaseClient";'
new_import = 'import { supabase } from "./supabaseClient";\nimport thamerLogo from "./thamer-logo.svg";'

assert content.count(old_import) == 1, "لم يتم العثور على سطر الاستيراد أو تكرر أكثر من مرة"
content = content.replace(old_import, new_import)

# 2) استبدال مكوّن Logo بالكامل (من function Logo() إلى القوس الأخير قبل export default)
old_logo_block = '''function Logo() {
  return (
    <div style={{ marginBottom: "24px" }}>
      <svg width="200" height="70" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg">
        {/* مبنى */}
        <rect x="10" y="20" width="40" height="40" rx="2" fill="#1B4D7A"/>
        <rect x="15" y="10" width="30" height="12" rx="2" fill="#2E6394"/>
        <rect x="22" y="3" width="16" height="9" rx="2" fill="#F5D98C"/>
        {/* نوافذ */}
        <rect x="15" y="25" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="27" y="25" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="39" y="25" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="15" y="38" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="27" y="38" width="8" height="8" rx="1" fill="#F5D98C"/>
        <rect x="39" y="38" width="8" height="8" rx="1" fill="#F5D98C"/>
        {/* باب */}
        <rect x="24" y="48" width="12" height="12" rx="1" fill="#D9A93E"/>
        {/* نص */}
        <text x="60" y="32" fontFamily="Cairo, sans-serif" fontSize="13" fontWeight="700" fill="#1B4D7A">مكتب ثامر</text>
        <text x="60" y="52" fontFamily="Cairo, sans-serif" fontSize="11" fill="#2E6394">بن سلمان العقاري</text>
      </svg>
    </div>
  );
}'''

new_logo_block = '''function Logo() {
  return (
    <div style={{ marginBottom: "24px", display: "flex", justifyContent: "center" }}>
      <img
        src={thamerLogo}
        alt="مكتب ثامر بن سلمان العقاري"
        style={{ width: "260px", height: "auto" }}
      />
    </div>
  );
}'''

assert content.count(old_logo_block) == 1, "لم يتم العثور على كتلة الشعار القديمة أو تكررت أكثر من مرة"
content = content.replace(old_logo_block, new_logo_block)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم استبدال الشعار بنجاح ✅")
