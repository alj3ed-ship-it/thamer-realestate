# -*- coding: utf-8 -*-
"""
يصلح مشكلة انقسام صفوف الجدول بين صفحات الطباعة (يسبب فاصل أسود/غريب بين الصفحات).
يمنع تقطيع أي صف جدول عند حدود الصفحة، ويخلي رأس الجدول يتكرر تلقائياً بأعلى كل صفحة.
"""

path = "src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """        #export-print-area table {
          width: 100% !important;
          table-layout: fixed !important;
        }
        @page { size: landscape; margin: 8mm; }"""

new = """        #export-print-area table {
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        #export-print-area tr,
        #export-print-area td,
        #export-print-area th {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        #export-print-area thead {
          display: table-header-group !important;
        }
        @page { size: landscape; margin: 8mm; }"""

if old in content:
    content = content.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم إصلاح مشكلة انقسام صفوف الجدول بين صفحات الطباعة")
else:
    print("⚠ لم يتم العثور على قاعدة @page الأصلية — تحقق يدوياً")
