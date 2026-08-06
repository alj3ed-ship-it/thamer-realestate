import pathlib

path = pathlib.Path("src/components/ExportToolbar.jsx")
content = path.read_text(encoding="utf-8")

old = """            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f5f7fa",
                  }}
                >
                  {columns.map((col) => {
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
                  })}
                </tr>
              ))}
            </tbody>"""

new = """            <tbody>
              {data.map((row, idx) => {
                const statusVal = statusCol ? String(row[statusCol.key] ?? "") : "";
                const isPartialRow = statusVal.includes("جزئي");
                const rowBg = isPartialRow ? "#F5EFE0" : idx % 2 === 0 ? "#ffffff" : "#f5f7fa";
                return (
                  <tr
                    key={idx}
                    style={{
                      background: rowBg,
                    }}
                  >
                    {columns.map((col) => {
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
                    })}
                  </tr>
                );
              })}
            </tbody>"""

assert content.count(old) == 1, "old block not found or not unique"
content = content.replace(old, new)

path.write_text(content, encoding="utf-8")
print("ExportToolbar.jsx patched successfully.")
