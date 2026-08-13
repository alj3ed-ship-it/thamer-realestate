# -*- coding: utf-8 -*-
"""
إصلاح سريع: ملف leaseStatus.js لازم يكون .jsx عشان Vite يقدر يقرأ كود JSX بداخله.

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_leasestatus_extension.py
"""
import os

SRC = "src"
old_path = f"{SRC}/leaseStatus.js"
new_path = f"{SRC}/leaseStatus.jsx"

if not os.path.exists(old_path):
    if os.path.exists(new_path):
        print(f"[OK] {new_path} موجود مسبقاً — ما فيه شي للإصلاح.")
    else:
        raise SystemExit(f"[FAIL] ما لقيت {old_path} ولا {new_path}. تأكد إنك بمجلد المشروع الصحيح.")
else:
    os.rename(old_path, new_path)
    print(f"[OK] تم تغيير الاسم: {old_path} → {new_path}")

print("\n✅ خلاص. أوقف السيرفر (Ctrl+C) وشغّله من جديد:")
print("npm run dev")
