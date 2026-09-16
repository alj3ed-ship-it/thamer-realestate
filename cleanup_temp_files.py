# -*- coding: utf-8 -*-
import os

files_to_delete = [
    "add_amount_paid_field.py",
    "add_amount_paid_field_v2.py",
    "diagnose_field.py",
    "diagnose_field (1).py",
    "speed_up_invoice_pdf.py",
    "test_arabic_pdf.mjs",
    "test_arabic_pdf_v2.mjs",
    "test_arabic_pdf_v3.mjs",
    "test_arabic_output.pdf",
    "test_arabic_output_v3.pdf",
]

deleted = []
not_found = []

for f in files_to_delete:
    if os.path.exists(f):
        os.remove(f)
        deleted.append(f)
    else:
        not_found.append(f)

print(f"تم حذف {len(deleted)} ملف:")
for f in deleted:
    print(f"  ✅ {f}")

if not_found:
    print(f"\n{len(not_found)} ملف ما كان موجود أصلاً (تجاهلناه):")
    for f in not_found:
        print(f"  ⏭ {f}")
