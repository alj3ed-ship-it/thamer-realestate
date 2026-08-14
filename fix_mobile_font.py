path = r"src\Entitlements.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة كلاس اسم للجدول عشان نقدر نستهدفه بالـ CSS
old_wrapper = """<div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "14px" }}>"""

new_wrapper = """<div className="entitlements-table-wrap" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="entitlements-table" style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "14px" }}>"""

if old_wrapper not in content:
    print("لم يتم العثور على النص الأول - تحقق يدوياً")
else:
    content = content.replace(old_wrapper, new_wrapper)

# 2) إضافة قاعدة CSS تصغّر الخط والمسافات على الشاشات الأضيق من 1100px (آيباد ونحوه)
style_block = """      <style>{`
        @media (max-width: 1100px) {
          .entitlements-table { min-width: 720px !important; font-size: 12px !important; }
          .entitlements-table th, .entitlements-table td { padding: 6px 8px !important; font-size: 12px !important; }
          .entitlements-table span { font-size: 11px !important; padding: 2px 8px !important; }
        }
      `}</style>
"""

anchor = '      <h1 style={{ color: "#1B4D7A", marginBottom: "24px", fontSize: "24px" }}>جدول الاستحقاقات</h1>'
if anchor not in content:
    print("لم يتم العثور على نقطة الإدراج - تحقق يدوياً")
else:
    content = content.replace(anchor, style_block + anchor)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("تم تطبيق التصغير بنجاح ✓")
