# -*- coding: utf-8 -*-
"""
سكربت حل تعارض الدمج في VatReturns.jsx
شغّله من داخل مجلد المشروع (وأنت على فرع demo)
"""

with open("src/VatReturns.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# تعارض 1: getDeadlineColor
old1 = """    if (daysLeft < 0) return '#e74c3c' // متأخر
<<<<<<< HEAD
    if (daysLeft <= 14) return '#f39c12' // قريب
=======
    if (daysLeft <= 30) return '#ea580c' // قريب — برتقالي واضح وحقيقي
>>>>>>> main
    return '#27ae60' // بعيد"""
new1 = """    if (daysLeft < 0) return '#e74c3c' // متأخر
    if (daysLeft <= 30) return '#ea580c' // قريب — برتقالي واضح وحقيقي
    return '#27ae60' // بعيد"""

assert content.count(old1) == 1, "تعارض 1 غير موجود أو مكرر"
content = content.replace(old1, new1)

# تعارض 2: getOpenColor
old2 = """    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
<<<<<<< HEAD
    if (daysToOpen <= 14) return '#f39c12' // قريب من الفتح
=======
    if (daysToOpen <= 30) return '#ea580c' // قريب من الفتح — برتقالي واضح وحقيقي
>>>>>>> main
    return '#d4a017' // بعيد بعد — أصفر واضح بدل الرمادي الباهت"""
new2 = """    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 30) return '#ea580c' // قريب من الفتح — برتقالي واضح وحقيقي
    return '#d4a017' // بعيد بعد — أصفر واضح بدل الرمادي الباهت"""

assert content.count(old2) == 1, "تعارض 2 غير موجود أو مكرر"
content = content.replace(old2, new2)

# تعارض 3: مؤشر عداد أيام آخر موعد + مؤشر "تم التقديم"
old3 = """                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
<<<<<<< HEAD
                          <div style={{ fontSize: 10, fontWeight: 600, color: getDeadlineColor(daysLeft) }}>
                            {daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`}
=======
                          <div style={{ fontSize: 10, fontWeight: 600, color: st === 'filed' ? '#27ae60' : getDeadlineColor(daysLeft) }}>
                            {st === 'filed' ? 'تم التقديم ✓' : (daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`)}
>>>>>>> main
                          </div>"""
new3 = """                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: st === 'filed' ? '#27ae60' : getDeadlineColor(daysLeft) }}>
                            {st === 'filed' ? 'تم التقديم ✓' : (daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`)}
                          </div>"""

assert content.count(old3) == 1, "تعارض 3 غير موجود أو مكرر"
content = content.replace(old3, new3)

# تأكد ما تبقى أي رموز تعارض
assert "<<<<<<<" not in content, "لسا فيه رموز تعارض متبقية!"
assert "=======" not in content, "لسا فيه رموز تعارض متبقية!"
assert ">>>>>>>" not in content, "لسا فيه رموز تعارض متبقية!"

with open("src/VatReturns.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("تم حل التعارضات الثلاثة بنجاح ✅")
print("الملف نظيف الآن، جاهز للـ commit")
