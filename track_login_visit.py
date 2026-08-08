# -*- coding: utf-8 -*-
path = r"C:\Users\aljuaid\Desktop\thamer-realestate\src\Login.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) تعديل الاستيراد ليشمل useEffect
old_import = 'import { useState } from "react";'
new_import = 'import { useState, useEffect } from "react";'

assert content.count(old_import) == 1, "لم يتم العثور على سطر الاستيراد أو تكرر أكثر من مرة"
content = content.replace(old_import, new_import)

# 2) إضافة تسجيل الزيارة عند تحميل الصفحة
old_state_line = '  const [forgotLoading, setForgotLoading] = useState(false);'
new_state_line = '''  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    supabase.from("demo_visits").insert({}).then(() => {});
  }, []);'''

assert content.count(old_state_line) == 1, "لم يتم العثور على سطر forgotLoading أو تكرر أكثر من مرة"
content = content.replace(old_state_line, new_state_line)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تفعيل تسجيل الزيارات بنجاح ✅")
