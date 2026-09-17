# -*- coding: utf-8 -*-
import io

path = r"src\Payments.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة استخراج تاريخ الاستحقاق بجانب تاريخ الدفع الفعلي داخل حلقة عرض الصفوف
old1 = "                          const { hijriText, isEstimated } = getPaymentHijriDisplay(p)\n"
new1 = ("                          const { hijriText, isEstimated } = getPaymentHijriDisplay(p)\n"
        "                          const dueHijriText = getUnpaidDueInfo(p).hijriText\n")
assert content.count(old1) == 1, "old1 غير فريد أو غير موجود"
content = content.replace(old1, new1)

# 2) تعديل خلية التاريخ: استحقاق ثابت بالأحمر + استلام فعلي بالأخضر (لو موجود) بدل استبدال بعضهما
old2 = """                              <td style={{ padding: '10px', color: '#6b7280' }}>
                                <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{hijriText ? hijriText + ' \u0647\u0640' : '\u2014'}</div>
                                <div style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>{p.payment_date || (isEstimated ? '\u0645\u062a\u0648\u0642\u0639' : '\u2014')}</div>
                                {p.first_partial_date_hijri && (
                                  <div style={{ fontSize: 10, color: '#e67e22', marginTop: 2, wordBreak: 'break-word' }} title="\u062a\u0627\u0631\u064a\u062e \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629">
                                    \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629: {p.first_partial_date_hijri} \u0647\u0640
                                  </div>
                                )}
                              </td>"""

new2 = """                              <td style={{ padding: '10px', color: '#6b7280' }}>
                                <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', color: '#c0392b' }}>
                                  \u0627\u0633\u062a\u062d\u0642\u0627\u0642: {dueHijriText ? dueHijriText + ' \u0647\u0640' : '\u2014'}
                                </div>
                                {p.payment_date_hijri && (
                                  <div style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', color: '#27ae60', marginTop: 2 }}>
                                    \u0627\u0633\u062a\u0644\u0627\u0645: {p.payment_date_hijri} \u0647\u0640
                                  </div>
                                )}
                                <div style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', marginTop: 2 }}>{p.payment_date || (isEstimated ? '\u0645\u062a\u0648\u0642\u0639' : '\u2014')}</div>
                                {p.first_partial_date_hijri && (
                                  <div style={{ fontSize: 10, color: '#e67e22', marginTop: 2, wordBreak: 'break-word' }} title="\u062a\u0627\u0631\u064a\u062e \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629">
                                    \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629: {p.first_partial_date_hijri} \u0647\u0640
                                  </div>
                                )}
                              </td>"""

assert content.count(old2) == 1, "old2 غير فريد أو غير موجود"
content = content.replace(old2, new2)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم التعديل بنجاح ✅")