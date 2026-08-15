path = r"src\Payments.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    .sort((a, b) => {
      // \u0646\u0641\u0633 \u0627\u0644\u0639\u0642\u062f: \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629 \u062f\u0627\u0626\u0645\u0627\u064b \u0644\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639\u0629 (\u0661 \u2192 \u0661\u0662) \u0628\u062f\u0644 \u062a\u0627\u0631\u064a\u062e\u0647\u0627\u060c \u0639\u0634\u0627\u0646
      // \u062a\u0639\u062f\u064a\u0644 \u0623\u0648 \u0625\u062f\u062e\u0627\u0644 \u062a\u0627\u0631\u064a\u062e \u0644\u0627\u062d\u0642\u0627\u064b \u0645\u0627 \u064a\u0642\u0644\u0628 \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0635\u0641\u0648\u0641 \u0628\u0627\u0644\u062c\u062f\u0648\u0644.
      if (a.lease_id === b.lease_id) {
        const aIdx = a.installment_number || getPaymentIndex(a)
        const bIdx = b.installment_number || getPaymentIndex(b)
        return aIdx - bIdx
      }
      // \u0639\u0642\u0648\u062f \u0645\u062e\u062a\u0644\u0641\u0629: \u064a\u0641\u0636\u0644 \u0627\u0644\u062a\u0631\u062a\u064a\u0628 \u0628\u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0632\u064a \u0645\u0627 \u0643\u0627\u0646
      return getEffectiveSortKey(a) - getEffectiveSortKey(b)
    })"""

new = """    .sort((a, b) => {
      // \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629 \u062f\u0627\u0626\u0645\u0627\u064b \u0644\u0631\u0642\u0645 \u0627\u0644\u0648\u062d\u062f\u0629 (\u0627\u0644\u0623\u0635\u063a\u0631 \u0641\u0627\u0644\u0623\u0643\u0628\u0631)\u060c \u0648\u0639\u0646\u062f \u062a\u0633\u0627\u0648\u064a \u0627\u0644\u0648\u062d\u062f\u0629
      // \u0646\u0631\u062c\u0639 \u0644\u0646\u0641\u0633 \u0627\u0644\u0639\u0642\u062f \u0644\u0631\u0642\u0645 \u0627\u0644\u062f\u0641\u0639\u0629\u060c \u0648\u0625\u0644\u0627 \u0644\u0644\u062a\u0627\u0631\u064a\u062e.
      const aUnit = parseInt((getUnitNumbers(a.lease_id) || \x27\x27).split(\x27\u060c\x27)[0]) || 9999
      const bUnit = parseInt((getUnitNumbers(b.lease_id) || \x27\x27).split(\x27\u060c\x27)[0]) || 9999
      if (aUnit !== bUnit) return aUnit - bUnit
      if (a.lease_id === b.lease_id) {
        const aIdx = a.installment_number || getPaymentIndex(a)
        const bIdx = b.installment_number || getPaymentIndex(b)
        return aIdx - bIdx
      }
      return getEffectiveSortKey(a) - getEffectiveSortKey(b)
    })"""

if old not in content:
    print("لم يتم العثور على النص - تحقق يدوياً")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("تم ترتيب الوحدات بنجاح ✓")
