# -*- coding: utf-8 -*-
import io

path = r"src\Payments.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = "      date: hijriText ? hijriText + ' \u0647\u0640' : '\u2014',\n"
new = """      date: (() => {
        const dueText = getUnpaidDueInfo(p).hijriText
        const paidText = p.payment_date_hijri
        if (paidText) {
          return {
            value: dueText ? `\u0627\u0633\u062a\u062d\u0642\u0627\u0642: ${dueText} \u0647\u0640` : '\u2014',
            color: '#c0392b',
            subtext: `\u0627\u0633\u062a\u0644\u0627\u0645: ${paidText} \u0647\u0640`,
            subtextColor: '#27ae60'
          }
        }
        return { value: dueText ? dueText + ' \u0647\u0640' : '\u2014', color: '#c0392b' }
      })(),
"""

assert content.count(old) == 1, "old غير فريد أو غير موجود"
content = content.replace(old, new)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل مسار التصدير بنجاح ✅")