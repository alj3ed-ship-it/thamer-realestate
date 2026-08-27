# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """            {pasteMode ? (
              <div
                style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", minHeight: "180px", direction: "rtl" }}
                dangerouslySetInnerHTML={{ __html: pastedHtml }}
              />
            ) : (
              <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: "180px" }}>
                {bodyText}
              </div>
            )}"""
assert content.count(old) == 1, "old not found or not unique"

new = """            <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: pasteMode ? "auto" : "180px" }}>
              {bodyText}
            </div>

            {pasteMode && (
              <div
                style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", marginTop: "12px", direction: "rtl" }}
                dangerouslySetInnerHTML={{ __html: pastedHtml }}
              />
            )}"""
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — النص والجدول الملصوق يظهرون سوا الحين")
