import re

paths = ["public/thamer-logo.svg", "src/assets/thamer-logo.svg"]

# النصوص الثلاثة الحالية (بعد التعديل السابق) اللي بندمجها بسطر واحد
old_maktab = '<text x="350" y="230" text-anchor="middle" class="brand" font-size="22" fill="#0F5C3C">مكتب</text>'
old_thamer = '<text x="350" y="288" text-anchor="middle" class="brand" font-size="54" fill="url(#goldGrad)">ثامر بن سلمان</text>'
old_aqari = '<text x="350" y="340" text-anchor="middle" class="brand" font-size="22" fill="#0F5C3C">العقاري</text>'

new_combined = '<text x="350" y="288" text-anchor="middle" class="brand"><tspan font-size="16" fill="#0F5C3C">مكتب </tspan><tspan font-size="54" fill="url(#goldGrad)">ثامر بن سلمان</tspan><tspan font-size="16" fill="#0F5C3C"> العقاري</tspan></text>'

for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if content.count(old_maktab) != 1 or content.count(old_thamer) != 1 or content.count(old_aqari) != 1:
        print(f"⚠️ {path}: النصوص الثلاثة (مكتب/ثامر/العقاري) ما طابقت بالضبط. لم يتم تعديل هذا الملف.")
        continue

    content = content.replace(old_maktab, "")
    content = content.replace(old_thamer, new_combined)
    content = content.replace(old_aqari, "")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ تم تعديل: {path} (سطر واحد + مقاس أصغر لمكتب/العقاري، فال وEJAR بدون تغيير)")

print("انتهى.")
