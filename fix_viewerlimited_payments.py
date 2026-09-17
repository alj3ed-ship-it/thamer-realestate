# -*- coding: utf-8 -*-
import io

path = r"src\ViewerLimited.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) جدول عرض الدفعات (تبويب "الدفعات")
old1 = """                        const hijri = computeInstallmentHijri(p.leases?.start_date_hijri, p.total_installments, p.installment_number);
                        const { status, paidState } = computeStatus(p, hijri);
                        const due = Number(p.amount_due || 0);"""
new1 = """                        const hijri = computeInstallmentHijri(p.leases?.start_date_hijri, p.total_installments, p.installment_number);
                        const { status, paidState } = computeStatus(p, hijri);
                        const dueDateHijriTxt = hijri ? `${hijri.year}/${String(hijri.month).padStart(2, "0")}/${String(hijri.day).padStart(2, "0")}` : null;
                        const due = Number(p.amount_due || 0);"""
assert content.count(old1) == 1, "old1 غير فريد أو غير موجود"
content = content.replace(old1, new1)

old2 = """                            <td style={{ padding: "12px", color: "#6b7280" }}>
                              <div>{p.payment_date_hijri ? `${p.payment_date_hijri} \u0647\u0640` : "\u2014"}</div>
                              {p.first_partial_date_hijri && (
                                <div style={{ fontSize: 10, color: "#e67e22", marginTop: 2 }} title="\u062a\u0627\u0631\u064a\u062e \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629">
                                  \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629: {p.first_partial_date_hijri} \u0647\u0640
                                </div>
                              )}
                            </td>"""
new2 = """                            <td style={{ padding: "12px", color: "#6b7280" }}>
                              <div style={{ color: "#e74c3c", fontWeight: "bold" }}>{dueDateHijriTxt ? `${dueDateHijriTxt} \u0647\u0640` : "\u2014"}</div>
                              {p.payment_date_hijri && (
                                <div style={{ color: "#27ae60", fontWeight: "bold", marginTop: 3 }}>\u2713 {p.payment_date_hijri} \u0647\u0640</div>
                              )}
                              {p.first_partial_date_hijri && (
                                <div style={{ fontSize: 10, color: "#e67e22", marginTop: 2 }} title="\u062a\u0627\u0631\u064a\u062e \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629">
                                  \u0623\u0648\u0644 \u062f\u0641\u0639\u0629 \u062c\u0632\u0626\u064a\u0629: {p.first_partial_date_hijri} \u0647\u0640
                                </div>
                              )}
                            </td>"""
assert content.count(old2) == 1, "old2 غير فريد أو غير موجود"
content = content.replace(old2, new2)

# 2) تصدير PDF/Excel لتبويب "الدفعات"
old3 = '      date: p.payment_date_hijri ? `${p.payment_date_hijri} \u0647\u0640` : "\u2014",\n'
new3 = """      date: (() => {
        const h = computeInstallmentHijri(p.leases?.start_date_hijri, p.total_installments, p.installment_number);
        const dueTxt = h ? `${h.year}/${String(h.month).padStart(2, "0")}/${String(h.day).padStart(2, "0")}` : null;
        if (p.payment_date_hijri) {
          return {
            value: dueTxt ? `${dueTxt} \u0647\u0640` : "\u2014",
            color: "#e74c3c",
            subtext: `\u2713 ${p.payment_date_hijri} \u0647\u0640`,
            subtextColor: "#27ae60",
          };
        }
        return { value: dueTxt ? `${dueTxt} \u0647\u0640` : "\u2014", color: "#e74c3c" };
      })(),
"""
assert content.count(old3) == 1, "old3 غير فريد أو غير موجود"
content = content.replace(old3, new3)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تعديل ViewerLimited.jsx بنجاح ✅")