path = r"src\Payments.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "  }).sort((a, b) => (a.name || \x27\x27).localeCompare(b.name || \x27\x27, \x27ar\x27))\n\n  const grandTotal"

new = """  }).sort((a, b) => {
    const priority = [\x27\u0639\u0645\u0627\u0631\u0629 \u0633\u0644\u0645\u0627\u0646\x27, \x27\u0639\u0645\u0627\u0631\u0629 \u0625\u0628\u0631\u0627\u0647\u064a\u0645\x27, \x27\u0639\u0645\u0627\u0631\u0629 \u0639\u0628\u062f\u0627\u0644\u0644\u0647 \u0627\u0644\u0643\u0628\u064a\u0631\u0629\x27, \x27\u0639\u0645\u0627\u0631\u0629 \u0639\u0628\u062f\u0627\u0644\u0644\u0647 \u0627\u0644\u0635\u063a\u064a\u0631\u0629\x27]
    const aIdx = priority.indexOf(a.name)
    const bIdx = priority.indexOf(b.name)
    const aRank = aIdx === -1 ? 999 : aIdx
    const bRank = bIdx === -1 ? 999 : bIdx
    if (aRank !== bRank) return aRank - bRank
    return (a.name || \x27\x27).localeCompare(b.name || \x27\x27, \x27ar\x27)
  })

  const grandTotal"""

if old not in content:
    print("لم يتم العثور على النص - تحقق يدوياً")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("تم الترتيب بنجاح ✓")
