# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """            <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: pasteMode ? "auto" : "180px" }}>
              {bodyText}
            </div>

            {pasteMode && (
              <div
                style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", marginTop: "12px", direction: "rtl" }}
                dangerouslySetInnerHTML={{ __html: pastedHtml }}
              />
            )}"""
assert content.count(old) == 1, "old not found or not unique"

new = """            {(() => {
              const TABLE_MARKER = "{{الجدول}}";
              if (pasteMode && bodyText.includes(TABLE_MARKER)) {
                const [beforeText, afterText] = bodyText.split(TABLE_MARKER);
                return (
                  <>
                    <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap" }}>{beforeText}</div>
                    <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", margin: "12px 0", direction: "rtl" }} dangerouslySetInnerHTML={{ __html: pastedHtml }} />
                    <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap" }}>{afterText}</div>
                  </>
                );
              }
              return (
                <>
                  <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", whiteSpace: "pre-wrap", minHeight: pasteMode ? "auto" : "180px" }}>
                    {bodyText}
                  </div>
                  {pasteMode && (
                    <div style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", marginTop: "12px", direction: "rtl" }} dangerouslySetInnerHTML={{ __html: pastedHtml }} />
                  )}
                </>
              );
            })()}"""
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — يدعم الآن وضع علامة {{الجدول}} داخل النص لتحديد مكانه")
