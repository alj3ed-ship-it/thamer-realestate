# -*- coding: utf-8 -*-
import io

path = r"src\Letters.jsx"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  function sanitizePastedRtl(html) {
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
assert content.count(old) == 1, "old not found or not unique"

new = """  function sanitizePastedRtl(html) {
    // Word أحيانًا يحط اتجاه الجدول/الخلايا LTR وقت النسخ، فنجبره RTL دائمًا
    let cleaned = html
      .replace(/dir=["']ltr["']/gi, 'dir="rtl"')
      .replace(/direction\\s*:\\s*ltr/gi, "direction:rtl")
      .replace(/text-align\\s*:\\s*left/gi, "text-align:right");

    // نعكس ترتيب أعمدة أي جدول (thead+tbody rows) لأن المتصفح يرسمها LTR
    // بصرف النظر عن اتجاه النص، فيطلع "الحقبة" يسار بدل يمين.
    const wrapper = document.createElement("div");
    wrapper.innerHTML = cleaned;
    wrapper.querySelectorAll("tr").forEach((row) => {
      const cells = Array.from(row.children);
      cells.reverse().forEach((cell) => row.appendChild(cell));
    });
    return wrapper.innerHTML;
  }

  function handlePasteUpdate() {
    if (pasteEditableRef.current) {
      const cleaned = sanitizePastedRtl(pasteEditableRef.current.innerHTML);
      setPastedHtml(cleaned);
    }
  }"""
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل الملف بنجاح ✅ — ترتيب أعمدة الجدول يُعكس تلقائيًا للاتجاه الصحيح")
