import pathlib

path = pathlib.Path("src/Payments.jsx")
content = path.read_text(encoding="utf-8")

old1 = """  // الإجمالي الفعلي المستلم من المستأجر: لو شامل الضريبة يبقى نفس المبلغ، لو غير شامل يُضاف عليه 15%
  function getTotalWithTax(p) {
    const amt = Number(p.amount || 0)
    if (isTaxApplicable(p) && isAmountVatInclusive(p)) {
      return amt
    }
    return amt + getTaxAmount(p)
  }"""

new1 = """  // الصافي الفعلي الذي يستلمه المالك بعد أثر الضريبة (بغض النظر عن نوع العقد)
  function getTotalWithTax(p) {
    const amt = Number(p.amount || 0)
    if (!isTaxApplicable(p)) return amt
    if (isAmountVatInclusive(p)) {
      return Math.round(getBaseAmount(p))
    }
    return amt - getTaxAmount(p)
  }"""

assert content.count(old1) == 1, f"old1 matches: {content.count(old1)}"
content = content.replace(old1, new1)

old2 = """        {taxApplies && !inclusive && (
          <div style={{ fontSize: 11, color: '#8e44ad', marginTop: 2, fontWeight: 700 }}>
            + ضريبة 15% (يتحملها المالك): {tax.toLocaleString()} = {getTotalWithTax(p).toLocaleString()} ريال
          </div>
        )}"""

new2 = """        {taxApplies && !inclusive && (
          <div style={{ fontSize: 11, color: '#8e44ad', marginTop: 2, fontWeight: 700 }}>
            − ضريبة 15% (يتحملها المالك): {tax.toLocaleString()} ← الصافي: {getTotalWithTax(p).toLocaleString()} ريال
          </div>
        )}"""

assert content.count(old2) == 1, f"old2 matches: {content.count(old2)}"
content = content.replace(old2, new2)

path.write_text(content, encoding="utf-8")
print("✅ تم تصحيح الدالتين بنجاح في src/Payments.jsx")
