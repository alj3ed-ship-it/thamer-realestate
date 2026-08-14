path = r"src\Entitlements.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """<div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>"""

new = """<div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "14px" }}>"""

if old not in content:
    print("لم يتم العثور على النص - تحقق يدوياً")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("تم الإصلاح بنجاح ✓")
