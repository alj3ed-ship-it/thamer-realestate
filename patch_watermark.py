# -*- coding: utf-8 -*-
path = r"src\Letters.jsx"

with open(path, encoding="utf-8") as f:
    content = f.read()

old = '''            <img
              src={watermarkLogo}
              alt=""
              style={{
                position: "absolute",
                top: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "600px",
                maxWidth: "90%",
                height: "660px",
                opacity: 0.16,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />'''

new = '''            <img
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
            />'''

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")
