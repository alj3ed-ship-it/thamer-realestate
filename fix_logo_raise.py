paths = ["public/thamer-logo.svg", "src/assets/thamer-logo.svg"]

old_combined = '<text x="350" y="320" text-anchor="middle" class="brand"><tspan font-size="16" fill="#0F5C3C">مكتب </tspan><tspan font-size="44" fill="url(#goldGrad)">ثامر بن سلمان</tspan><tspan font-size="16" fill="#0F5C3C"> العقاري</tspan></text>'

new_combined = '<text x="350" y="300" text-anchor="middle" class="brand"><tspan font-size="16" fill="#0F5C3C">مكتب </tspan><tspan font-size="44" fill="url(#goldGrad)">ثامر بن سلمان</tspan><tspan font-size="16" fill="#0F5C3C"> العقاري</tspan></text>'

for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if content.count(old_combined) != 1:
        print(f"⚠️ {path}: النص الحالي ما طابق بالضبط. لم يتم تعديل هذا الملف.")
        continue

    content = content.replace(old_combined, new_combined)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✅ تم تعديل: {path} (رفع الاسم y=320 -> y=300)")

print("انتهى.")
