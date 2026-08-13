# -*- coding: utf-8 -*-
path = r"src\Letters.jsx"

with open(path, encoding="utf-8") as f:
    content = f.read()

old_fal = '''              <div style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "17px", fontWeight: "bold", lineHeight: 1.9, textAlign: "left" }}>'''
new_fal = '''              <div style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "14px", fontWeight: "bold", lineHeight: 1.9, textAlign: "left" }}>'''
assert content.count(old_fal) == 1, f"fal block: expected 1 match, found {content.count(old_fal)}"
content = content.replace(old_fal, new_fal)

old_sig = '''            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <img src={officeSignature} alt="التوقيع" style={{ width: "130px", height: "auto", display: "block", margin: "0 auto", marginBottom: "-6px", transform: "translateX(-18px)" }} />
                <div style={{ fontSize: "13px", marginTop: "0px", color: "#111827" }}>{SIGNER_NAME}</div>
              </div>
            </div>'''

new_sig = '''            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "80px" }}>
              <div style={{ textAlign: "center" }}>
                <img src={officeSignature} alt="التوقيع" style={{ width: "130px", height: "auto", display: "block", margin: "0 auto", marginBottom: "-6px", transform: "translateX(-18px)" }} />
                <div style={{ fontSize: "22px", marginTop: "2px", color: "#9A7D0A", fontFamily: "'Aref Ruqaa', serif", fontWeight: "bold" }}>{SIGNER_NAME}</div>
              </div>
            </div>'''

assert content.count(old_sig) == 1, f"signature block: expected 1 match, found {content.count(old_sig)}"
content = content.replace(old_sig, new_sig)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")
