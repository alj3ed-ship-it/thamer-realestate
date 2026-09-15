import io

path = "src/Letters.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''                    <div style={{ fontWeight: "bold", color: "#1B4D7A" }}>{l.tenant}</div>
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>{l.property} ({l.unit || "بدون وحدة"})</div>'''
new = '''                    <div style={{ fontWeight: "bold", color: "#1B4D7A" }}>{l.tenant}</div>
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>{l.property} ({l.unit || "بدون وحدة"}) — عقد {l.contractNumber || "بدون رقم"}</div>'''
assert content.count(old) == 1, f"match count = {content.count(old)}"
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم بنجاح ✅")