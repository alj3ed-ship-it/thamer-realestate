import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

old = """        <div ref={printAreaRef} className="inv-print-area" style={{
          position: 'fixed', inset: 0, background: '#fff', zIndex: 9999, padding: 40,
          overflow: 'auto', fontFamily: 'Cairo, sans-serif', direction: 'rtl',
        }}>"""
new = """        <div ref={printAreaRef} className="inv-print-area" style={{
          position: 'fixed', top: 0, left: 0, width: 794, maxWidth: '100%',
          background: '#fff', zIndex: 9999, padding: 40,
          fontFamily: 'Cairo, sans-serif', direction: 'rtl',
        }}>"""
assert content.count(old) == 1
content = content.replace(old, new)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx (proper A4-proportioned capture size) successfully")