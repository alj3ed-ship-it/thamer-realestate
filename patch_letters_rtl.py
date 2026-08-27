# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old1 = """  function handlePasteUpdate() {
    if (pasteEditableRef.current) setPastedHtml(pasteEditableRef.current.innerHTML);
  }"""
assert content.count(old1) == 1, "old1 not found or not unique"
new1 = """  function sanitizePastedRtl(html) {
    // Word أحيانًا يحط اتجاه الجدول/الخلايا LTR وقت النسخ، فنجبره RTL دائمًا
    return html
      .replace(/dir=["']ltr["']/gi, 'dir="rtl"')
      .replace(/direction\\s*:\\s*ltr/gi, "direction:rtl")
      .replace(/text-align\\s*:\\s*left/gi, "text-align:right");
  }

  function handlePasteUpdate() {
    if (pasteEditableRef.current) {
      const cleaned = sanitizePastedRtl(pasteEditableRef.current.innerHTML);
      setPastedHtml(cleaned);
    }
  }"""
content = content.replace(old1, new1)

old2 = """              <div
                style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", minHeight: "180px" }}
                dangerouslySetInnerHTML={{ __html: pastedHtml }}
              />"""
assert content.count(old2) == 1, "old2 not found or not unique"
new2 = """              <div
                style={{ fontSize: "14.5px", lineHeight: 2, color: "#111827", minHeight: "180px", direction: "rtl" }}
                dangerouslySetInnerHTML={{ __html: pastedHtml }}
              />"""
content = content.replace(old2, new2)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — 2 تعديلات (تصحيح اتجاه الجدول RTL)")
