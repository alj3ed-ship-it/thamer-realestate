# -*- coding: utf-8 -*-
import io
import os

path = r"src\Invoices.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# --- 1) حذف دالة handleDownloadPdf بالكامل ---
start_markers = [i for i, l in enumerate(lines) if "async function handleDownloadPdf" in l]
end_markers = [i for i, l in enumerate(lines) if "async function handlePrintInvoice" in l]
assert len(start_markers) == 1, f"عدد تطابقات بداية الدالة: {len(start_markers)}"
assert len(end_markers) == 1, f"عدد تطابقات نهاية الدالة: {len(end_markers)}"

func_start = start_markers[0]
func_end = end_markers[0]
assert func_end > func_start, "ترتيب غير متوقع بين الدالتين"

del lines[func_start:func_end]
print(f"✅ حذف دالة handleDownloadPdf ({func_end - func_start} سطر)")

# --- 2) حذف زر "تحميل PDF" بالكامل ---
btn_markers = [i for i, l in enumerate(lines) if "handleDownloadPdf(inv)" in l]
assert len(btn_markers) == 1, f"عدد أزرار handleDownloadPdf: {len(btn_markers)}"
onclick_idx = btn_markers[0]

btn_start = onclick_idx
while btn_start > 0 and "<button" not in lines[btn_start]:
    btn_start -= 1
assert "<button" in lines[btn_start], "ما لقيت بداية الزر"

btn_end = onclick_idx
while btn_end < len(lines) and "</button>" not in lines[btn_end]:
    btn_end += 1
assert btn_end < len(lines), "ما لقيت نهاية الزر"

del lines[btn_start:btn_end + 1]
print(f"✅ حذف زر تحميل PDF ({btn_end - btn_start + 1} سطر)")

with io.open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

# --- 3) حذف ملفات Puppeteer بالسيرفر (ما راح تُستخدم بعد الحين) ---
api_files = [
    r"api\generate-invoice-pdf.js",
    r"api\tajawal-font.js",
]

for f in api_files:
    if os.path.exists(f):
        os.remove(f)
        print(f"✅ حذف {f}")
    else:
        print(f"⏭ {f} غير موجود أصلاً")

print("\nتم بنجاح ✅ — الطباعة الآن تعتمد كليًا على زر المتصفح (فوري بدون انتظار)")
