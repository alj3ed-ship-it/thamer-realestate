path = "src/Entitlements.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) حساب الصافي بدون ضريبة (يطرح فقط حصة الضريبة الداخلة ضمن المبلغ، لا يزيد عن اللازم)
old1 = '  const totalWithTax = filteredResults.reduce((sum, r) => sum + (r.grossTotal ?? ((r.amount || 0) + (r.taxAmount || 0))), 0);'
new1 = '''  const totalWithTax = filteredResults.reduce((sum, r) => sum + (r.grossTotal ?? ((r.amount || 0) + (r.taxAmount || 0))), 0);
  const totalNet = totalAmount - filteredResults.reduce((sum, r) => sum + (r.taxApplies && r.includesVat ? (r.taxAmount || 0) : 0), 0);'''
assert content.count(old1) == 1, "old1 not found or not unique"
content = content.replace(old1, new1)

# 2) إضافة المربع الخامس بالشاشة
old2 = '''            {totalTax > 0 && (
              <div style={{ flex: 1, minWidth: 150, background: "#F4ECF7", border: "1px solid #E1C6ED", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الضريبة</div>
                <div style={{ fontWeight: "bold", color: "#8e44ad", fontSize: "18px" }}>{totalTax.toLocaleString()} ريال</div>
              </div>
            )}
          </div>'''
new2 = '''            {totalTax > 0 && (
              <div style={{ flex: 1, minWidth: 150, background: "#F4ECF7", border: "1px solid #E1C6ED", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#555" }}>إجمالي الضريبة</div>
                <div style={{ fontWeight: "bold", color: "#8e44ad", fontSize: "18px" }}>{totalTax.toLocaleString()} ريال</div>
              </div>
            )}
            {totalTax > 0 && (
              <div style={{ flex: 1, minWidth: 150, background: "#EAF7F1", border: "1px solid #A3E4D7", borderRadius: "10px", padding: "14px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", color: "#555" }}>الصافي بدون ضريبة</div>
                <div style={{ fontWeight: "bold", color: "#16a085", fontSize: "18px" }}>{totalNet.toLocaleString()} ريال</div>
              </div>
            )}
          </div>'''
assert content.count(old2) == 1, "old2 not found or not unique"
content = content.replace(old2, new2)

# 3) إضافة نفس الرقم بإحصائيات التصدير (Excel/PDF)
old3 = '''            stats={[
              { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#27ae60" },
              { label: "إجمالي المتبقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#e74c3c" },
              { label: "إجمالي المستحق", value: `${totalAmount.toLocaleString()} ريال`, color: "#1B4D7A" },
              { label: "إجمالي الضريبة", value: `${totalTax.toLocaleString()} ريال`, color: "#8e44ad" },
              { label: "الإجمالي شامل الضريبة", value: `${totalWithTax.toLocaleString()} ريال`, color: "#1B4D7A" },
            ]}'''
new3 = '''            stats={[
              { label: "إجمالي المحصّل", value: `${totalCollected.toLocaleString()} ريال`, color: "#27ae60" },
              { label: "إجمالي المتبقي", value: `${totalRemaining.toLocaleString()} ريال`, color: "#e74c3c" },
              { label: "إجمالي المستحق", value: `${totalAmount.toLocaleString()} ريال`, color: "#1B4D7A" },
              { label: "إجمالي الضريبة", value: `${totalTax.toLocaleString()} ريال`, color: "#8e44ad" },
              { label: "الإجمالي شامل الضريبة", value: `${totalWithTax.toLocaleString()} ريال`, color: "#1B4D7A" },
              { label: "الصافي بدون ضريبة", value: `${totalNet.toLocaleString()} ريال`, color: "#16a085" },
            ]}'''
assert content.count(old3) == 1, "old3 not found or not unique"
content = content.replace(old3, new3)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅ (3 تعديلات)")
