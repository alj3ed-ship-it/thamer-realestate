import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

old = """      let cancelled = false
      ;(async () => {
        await new Promise(r => setTimeout(r, 200))
        const node = printAreaRef.current
        if (!node || cancelled) { setPrintingInvoice(null); return }
        try {"""
new = """      let cancelled = false
      ;(async () => {
        const node = printAreaRef.current
        if (!node) { setPrintingInvoice(null); return }
        // ننتظر جاهزية الخطوط فعلياً (لا مجرد تأخير ثابت) قبل الالتقاط — هذا هو
        // سبب تشابك/انعكاس النص العربي: html2canvas كان يلتقط قبل ما يخلص تحميل
        // خط Cairo، فيرجع يستخدم خط بديل بترتيب حروف غلط لحظة الالتقاط
        window.scrollTo(0, 0)
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready
        }
        await new Promise(r => setTimeout(r, 150))
        if (cancelled) { setPrintingInvoice(null); return }
        try {"""
assert content.count(old) == 1
content = content.replace(old, new)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx (PDF font-readiness fix) successfully")