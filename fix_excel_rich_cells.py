# -*- coding: utf-8 -*-
"""
يصلح تصدير Excel لما تكون بعض الخلايا بصيغة كائن غني {value, color, subtext}
(مستخدم بصفحة الاستحقاقات لتلوين المبالغ) — كان يطبع الكائن الخام كنص JSON
بدل القيمة الفعلية. الحل: نفكّك الكائن ونستخرج القيمة، ونطبّق لونه كخط بالخلية.
"""

path = "src/components/ExportToolbar.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1) إضافة دالتي مساعدتين: فك الكائن الغني + تحويل اللون السداسي لصيغة ARGB
old1 = """  const numericKeys = new Set(
    displayCols
      .filter(
        (col) =>
          data.length > 0 &&
          data.every((row) => {
            const v = row[col.key];
            return v == null || v === "" || parseRiyalNumber(v) !== null;
          }) &&
          data.some((row) => parseRiyalNumber(row[col.key]) !== null)
      )
      .map((c) => c.key)
  );"""
new1 = """  // بعض الخلايا (زي عمود المبلغ بصفحة الاستحقاقات) تُمرَّر بصيغة كائن غني
  // { value, color, subtext } للتلوين بالشاشة — نفكّكه هنا عشان ما يطلع كنص
  // JSON خام بملف Excel.
  const unwrapCell = (raw) => (raw && typeof raw === "object" && "value" in raw ? raw.value : raw);

  const hexToArgb = (hex) => {
    if (!hex || typeof hex !== "string") return null;
    const clean = hex.replace("#", "").toUpperCase();
    return clean.length === 6 ? `FF${clean}` : null;
  };

  const numericKeys = new Set(
    displayCols
      .filter(
        (col) =>
          data.length > 0 &&
          data.every((row) => {
            const v = unwrapCell(row[col.key]);
            return v == null || v === "" || parseRiyalNumber(v) !== null;
          }) &&
          data.some((row) => parseRiyalNumber(unwrapCell(row[col.key])) !== null)
      )
      .map((c) => c.key)
  );"""
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حساب numericKeys — تحقق يدوياً")

# 2) تعديل writeDataRow ليفكّك الكائن الغني بدل طباعته خام، ويطبّق لونه إن وُجد
old2 = """      const writeDataRow = (rowData) => {
        const rowValues = displayCols.map((col) => {
          const raw = rowData[col.key];
          if (numericKeys.has(col.key)) {
            const num = parseRiyalNumber(raw);
            return num === null ? raw ?? "" : num;
          }
          return raw ?? "";
        });
        const row = sheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Arial" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          const colKey = displayCols[colNumber - 1]?.key;
          if (numericKeys.has(colKey)) cell.numFmt = numFmtRiyal;
        });"""
new2 = """      const writeDataRow = (rowData) => {
        const rowValues = displayCols.map((col) => {
          const cellRaw = unwrapCell(rowData[col.key]);
          if (numericKeys.has(col.key)) {
            const num = parseRiyalNumber(cellRaw);
            return num === null ? cellRaw ?? "" : num;
          }
          return cellRaw ?? "";
        });
        const row = sheet.addRow(rowValues);
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Arial" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          const colKey = displayCols[colNumber - 1]?.key;
          if (numericKeys.has(colKey)) cell.numFmt = numFmtRiyal;
          const rawForCell = rowData[colKey];
          const richColor = rawForCell && typeof rawForCell === "object" ? hexToArgb(rawForCell.color) : null;
          if (richColor) {
            cell.font = { name: "Arial", bold: true, color: { argb: richColor } };
          }
        });"""
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على دالة writeDataRow — تحقق يدوياً")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ تم تطبيق {changes} من أصل 2 تعديلات على {path}")
