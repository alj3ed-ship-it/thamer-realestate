import pathlib

path = pathlib.Path("src/lib/zatcaCompliance.js")
content = path.read_text(encoding="utf-8")

old = """  const issue_date = invoice?.issue_date || new Date().toISOString().slice(0, 10)
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const issue_time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`"""

new = """  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const issue_date = invoice?.issue_date || now.toISOString().slice(0, 10)
  const issue_time = invoice?.issue_date
    ? '00:00:00'
    : `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`"""

count = content.count(old)
assert count == 1, f"Expected 1 match, found {count}"

content = content.replace(old, new)
path.write_text(content, encoding="utf-8")
print("Patched successfully.")
