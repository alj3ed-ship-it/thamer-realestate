import re

paths = ["public/thamer-logo.svg", "src/assets/thamer-logo.svg"]

# مكتب: font-size="34" fill="url(#goldGrad)" -> font-size="22" fill="#0F5C3C"
old_maktab = '<text x="350" y="230" text-anchor="middle" class="brand" font-size="34" fill="url(#goldGrad)">مكتب</text>'
new_maktab = '<text x="350" y="230" text-anchor="middle" class="brand" font-size="22" fill="#0F5C3C">مكتب</text>'

# العقاري: font-size="46" fill="url(#goldGrad)" -> font-size="22" fill="#0F5C3C"
old_aqari = '<text x="350" y="340" text-anchor="middle" class="brand" font-size="46" fill="url(#goldGrad)">العقاري</text>'
new_aqari = '<text x="350" y="340" text-anchor="middle" class="brand" font-size="22" fill="#0F5C3C">العقاري</text>'

for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    c1 = content.count(old_maktab)
    c2 = content.count(old_aqari)

    if c1 != 1 or c2 != 1:
        print(f"⚠️ {path}: مكتب موجود {c1} مرة، العقاري موجود {c2} مرة (متوقع 1 لكل واحد). لم يتم تعديل هذا الملف.")
        continue

    content = content.replace(old_maktab, new_maktab)
    content = content.replace(old_aqari, new_aqari)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ تم تعديل: {path}")

print("انتهى.")
