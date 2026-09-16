import pathlib

path = pathlib.Path("api/generate-invoice-pdf.js")
content = path.read_text(encoding="utf-8")

old = """    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice.pdf"`)
    res.status(200).send(pdfBuffer)"""

new = """    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.status(200).end(pdfBuffer)"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)
path.write_text(content, encoding="utf-8")
print("Patched successfully.")
