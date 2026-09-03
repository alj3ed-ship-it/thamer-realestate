# -*- coding: utf-8 -*-
"""
Patch: يخلي صفوف البيانات الفردية بجدول التقرير المجمَّع (حسب العقار) تحترم
لون الخلية المخصص (cell.color) بدل تجاهله — نفس سلوك الجدول المسطّح.

الاستخدام:
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python fix_exporttoolbar_row_colors.py
"""
import pathlib

FILE = pathlib.Path("src/components/ExportToolbar.jsx")
content = FILE.read_text(encoding="utf-8")

OLD = """                        {displayCols.map((col) => {
                          const cell = row[col.key];
                          const isRich = cell && typeof cell === "object" && "value" in cell;
                          const cellValue = isRich ? cell.value : cell ?? "—";
                          let tdStyle = styles.td;
                          if (numericKeys.has(col.key)) {"""

NEW = """                        {displayCols.map((col) => {
                          const cell = row[col.key];
                          const isRich = cell && typeof cell === "object" && "value" in cell;
                          const cellValue = isRich ? cell.value : cell ?? "—";
                          const cellColor = isRich ? cell.color : undefined;
                          let tdStyle = cellColor ? { ...styles.td, color: cellColor, fontWeight: "bold" } : styles.td;
                          if (numericKeys.has(col.key)) {"""

assert content.count(OLD) == 1, f"expected exactly 1 match, found {content.count(OLD)}"
content = content.replace(OLD, NEW)
FILE.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅ — src/components/ExportToolbar.jsx (ألوان صفوف البيانات بالجدول المجمّع)")
