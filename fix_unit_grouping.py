path = r"src\Payments.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """      const aUnit = parseInt((getUnitNumbers(a.lease_id) || \x27\x27).split(\x27\u060c\x27)[0]) || 9999
      const bUnit = parseInt((getUnitNumbers(b.lease_id) || \x27\x27).split(\x27\u060c\x27)[0]) || 9999
      if (aUnit !== bUnit) return aUnit - bUnit
      if (a.lease_id === b.lease_id) {
        const aIdx = a.installment_number || getPaymentIndex(a)
        const bIdx = b.installment_number || getPaymentIndex(b)
        return aIdx - bIdx
      }
      return getEffectiveSortKey(a) - getEffectiveSortKey(b)
    })"""

new = """      const aUnit = parseInt((getUnitNumbers(a.lease_id) || \x27\x27).split(\x27\u060c\x27)[0]) || 9999
      const bUnit = parseInt((getUnitNumbers(b.lease_id) || \x27\x27).split(\x27\u060c\x27)[0]) || 9999
      if (aUnit !== bUnit) return aUnit - bUnit
      if (a.lease_id !== b.lease_id) {
        return String(a.lease_id).localeCompare(String(b.lease_id))
      }
      const aIdx = a.installment_number || getPaymentIndex(a)
      const bIdx = b.installment_number || getPaymentIndex(b)
      return aIdx - bIdx
    })"""

if old not in content:
    print("لم يتم العثور على النص - تحقق يدوياً")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("تم تجميع الوحدات بنجاح ✓")
