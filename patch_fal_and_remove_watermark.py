# -*- coding: utf-8 -*-
path = r"src\Letters.jsx"

with open(path, encoding="utf-8") as f:
    content = f.read()

old_fal = '''              <div style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "12px", lineHeight: 1.9, textAlign: "left" }}>'''
new_fal = '''              <div style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "17px", fontWeight: "bold", lineHeight: 1.9, textAlign: "left" }}>'''
assert content.count(old_fal) == 1, f"fal block: expected 1 match, found {content.count(old_fal)}"
content = content.replace(old_fal, new_fal)

old_watermark = '''            {/* شعار مائي بخلفية كامل الصفحة — ممطوط طولياً عمداً ليصل خطه الأخضر قرب منطقة التوقيع */}
            <img
              src={watermarkLogo}
              alt=""
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "480px",
                maxWidth: "80%",
                height: "auto",
                opacity: 0.55,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

'''
assert content.count(old_watermark) == 1, f"watermark block: expected 1 match, found {content.count(old_watermark)}"
content = content.replace(old_watermark, "")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")
