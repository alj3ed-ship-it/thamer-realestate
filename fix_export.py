import pathlib

# ===== 1) ExportToolbar.jsx =====
p1 = pathlib.Path('src/components/ExportToolbar.jsx')
c1 = p1.read_text(encoding='utf-8')

old1 = '''  const amountFontColorArgb = (col) => {
    if (col.key === "remainingAmount") return "FFE74C3C";
    if (col.label.includes("الأساسي")) return "FF1B4D7A";
    if (col.label === "الضريبة") return "FFB42318";
    if (col.label === "المبلغ المستحق") return "FFE74C3C";
    return null;
  };'''
assert c1.count(old1) == 1, f'old1: {c1.count(old1)}'
new1 = old1 + '''

  // تلوين خلية الحالة بتقارير الطباعة/PDF حسب النص (نفس ألوان شارات الشاشة)
  const getStatusExportStyle = (val) => {
    if (val.includes("مقدماً") || val.includes("مقدَّم")) return { bg: "#EAF4FB", color: "#2E86C1" };
    if (val.includes("جزئي") || val.includes("⚠")) return { bg: "#FEF9E7", color: "#f39c12" };
    if (val.includes("✓")) return { bg: "#EAFAF1", color: "#27ae60" };
    if (val.includes("غير مستحق") || val.includes("⏳")) return { bg: "#FDF6E3", color: "#b7950b" };
    if (val.includes("متأخر") || val.includes("⏰")) return { bg: "#FDEDEC", color: "#e74c3c" };
    return null;
  };'''
c1 = c1.replace(old1, new1)

old2 = '''                    {columns.map((col) => {
                      const cell = row[col.key];
                      const isRich = cell && typeof cell === "object" && "value" in cell;
                      const cellValue = isRich ? cell.value : (cell ?? "—");
                      const cellColor = isRich ? cell.color : undefined;
                      const cellSubtext = isRich ? cell.subtext : null;
                      const cellSubColor = isRich ? cell.subtextColor : undefined;
                      return (
                        <td key={col.key} style={{ ...styles.td, color: cellColor || styles.td.color, fontWeight: cellColor ? "bold" : "normal" }}>
                          <div>{cellValue}</div>
                          {cellSubtext && (
                            <div style={{ fontSize: "11px", marginTop: "3px", color: cellSubColor || "#27ae60", fontWeight: "bold" }}>
                              {cellSubtext}
                            </div>
                          )}
                        </td>
                      );
                    })}'''
assert c1.count(old2) == 1, f'old2: {c1.count(old2)}'
new2 = '''                    {columns.map((col) => {
                      const cell = row[col.key];
                      const isRich = cell && typeof cell === "object" && "value" in cell;
                      const cellValue = isRich ? cell.value : (cell ?? "—");
                      const cellColor = isRich ? cell.color : undefined;
                      const cellSubtext = isRich ? cell.subtext : null;
                      const cellSubColor = isRich ? cell.subtextColor : undefined;
                      let tdStyle = { ...styles.td, color: cellColor || styles.td.color, fontWeight: cellColor ? "bold" : "normal" };
                      if (statusCol && col.key === statusCol.key) {
                        const statusStyle = getStatusExportStyle(String(cellValue || ""));
                        if (statusStyle) {
                          tdStyle = { ...tdStyle, background: statusStyle.bg, color: statusStyle.color, fontWeight: "bold" };
                        }
                      }
                      return (
                        <td key={col.key} style={tdStyle}>
                          <div>{cellValue}</div>
                          {cellSubtext && (
                            <div style={{ fontSize: "11px", marginTop: "3px", color: cellSubColor || "#27ae60", fontWeight: "bold" }}>
                              {cellSubtext}
                            </div>
                          )}
                        </td>
                      );
                    })}'''
c1 = c1.replace(old2, new2)

p1.write_text(c1, encoding='utf-8')

# ===== 2) Payments.jsx =====
p2 = pathlib.Path('src/Payments.jsx')
c2 = p2.read_text(encoding='utf-8')

old3 = '''      amount: (computed === 'partial' || computed === 'partial_early')
        ? {
            value: `${due.toLocaleString()} ريال`,
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: '#e74c3c'
          }
        : `${due.toLocaleString()} ريال`,'''
assert c2.count(old3) == 1, f'old3: {c2.count(old3)}'
new3 = '''      amount: (() => {
        const amountColor = computed === 'paid' ? '#27ae60'
          : computed === 'overdue' ? '#e74c3c'
          : computed === 'not_due' ? '#7f8c8d'
          : computed === 'partial_early' ? '#2E86C1'
          : '#d4ac0d'
        if (computed === 'partial' || computed === 'partial_early') {
          return {
            value: `${due.toLocaleString()} ريال`,
            color: amountColor,
            subtext: `مدفوع ${paid.toLocaleString()} · متبقي ${(due - paid).toLocaleString()}`,
            subtextColor: amountColor
          }
        }
        return { value: `${due.toLocaleString()} ريال`, color: amountColor }
      })(),'''
c2 = c2.replace(old3, new3)

p2.write_text(c2, encoding='utf-8')
print('تم تعديل الملفين بنجاح')