paths = ["public/thamer-logo.svg", "src/assets/thamer-logo.svg"]

old_combined = '<text x="350" y="300" text-anchor="middle" class="brand"><tspan font-size="16" fill="#0F5C3C">مكتب </tspan><tspan font-size="44" fill="url(#goldGrad)">ثامر بن سلمان</tspan><tspan font-size="16" fill="#0F5C3C"> العقاري</tspan></text>'
new_combined = '<text x="335" y="300" text-anchor="middle" class="brand"><tspan font-size="16" fill="#0F5C3C">مكتب </tspan><tspan font-size="44" fill="url(#goldGrad)">ثامر بن سلمان</tspan><tspan font-size="16" fill="#0F5C3C"> العقاري</tspan></text>'

old_line = '<rect x="180" y="357" width="340" height="3" fill="#0F5C3C"/>'
new_line = '<rect x="180" y="335" width="340" height="3" fill="#0F5C3C"/>'

for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False

    if content.count(old_combined) == 1:
        content = content.replace(old_combined, new_combined)
        changed = True
    else:
        print(f"⚠️ {path}: نص الاسم ما طابق بالضبط.")

    if content.count(old_line) == 1:
        content = content.replace(old_line, new_line)
        changed = True
    else:
        print(f"⚠️ {path}: الخط الأخضر ما طابق بالضبط.")

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ تم تعديل: {path}")

print("انتهى.")
