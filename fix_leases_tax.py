import pathlib

path = pathlib.Path("src/Leases.jsx")
content = path.read_text(encoding="utf-8")

old = """  function getNetRentAmount(lease) {
    const amt = Number(lease.rent_amount || 0);
    if (lease.tax_enabled && lease.amount_includes_vat) {
      return Math.round(amt / 1.15);
    }
    return amt;
  }

  // الإجمالي الشامل للضريبة: للعقود الشاملة أصلاً = نفس المبلغ، وللعقود غير الشاملة (الضريبة تُضاف فوق) = المبلغ + 15%
  function getGrossRentAmount(lease) {
    const amt = Number(lease.rent_amount || 0);
    if (!lease.tax_enabled) return amt;
    if (lease.amount_includes_vat) return amt;
    return Math.round(amt * 1.15);
  }"""

new = """  // الصافي الفعلي للمالك: يُخصم من الداخل للعقود الشاملة، ويُخصم 15% (يتحملها المالك) للعقود غير الشاملة
  function getNetRentAmount(lease) {
    const amt = Number(lease.rent_amount || 0);
    if (!lease.tax_enabled) return amt;
    if (lease.amount_includes_vat) {
      return Math.round(amt / 1.15);
    }
    return Math.round(amt * 0.85);
  }

  // الإجمالي الخام: قيمة العقد كما هي دائماً — الضريبة تُستقطع من نفس المبلغ (داخلياً أو يتحملها المالك)، ولا تُضاف عليه أبداً
  function getGrossRentAmount(lease) {
    return Number(lease.rent_amount || 0);
  }"""

assert content.count(old) == 1, f"matches found: {content.count(old)}"
content = content.replace(old, new)

path.write_text(content, encoding="utf-8")
print("✅ تم تصحيح الدالتين بنجاح في src/Leases.jsx")
