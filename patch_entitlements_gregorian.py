import sys
from pathlib import Path

path = Path("src/Entitlements.jsx")
content = path.read_text(encoding="utf-8")
original_content = content

# ---------------------------------------------------------------
# 1) استبدال دوال الحساب الهجري التقريبي بدوال حساب ميلادي دقيق
# ---------------------------------------------------------------
old1 = '''function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map((p) => parseInt(p));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  if (parts[0] >= 1300) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  if (parts[2] >= 1300) {
    return { day: parts[0], month: parts[1], year: parts[2] };
  }
  return null;
}

function addHijriMonths(date, months) {
  const totalMonths = date.year * 12 + (date.month - 1) + months;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1, day: date.day };
}

function computeInstallmentHijri(startDateHijri, totalInstallments, installmentNumber) {
  const start = parseHijri(startDateHijri);
  if (!start || !totalInstallments) return null;
  const intervalMonths = 12 / totalInstallments;
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths;
  return addHijriMonths(start, Math.round(monthsToAdd));
}'''

new1 = '''function parseHijri(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/").map((p) => parseInt(p));
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return null;
  if (parts[0] >= 1300) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  if (parts[2] >= 1300) {
    return { day: parts[0], month: parts[1], year: parts[2] };
  }
  return null;
}

// تنسيق تاريخ Date كنص "YYYY-MM-DD" بدون مشاكل فرق التوقيت (لا نستخدم toISOString لأنها UTC)
function formatDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// إضافة أشهر ميلادية دقيقة على تاريخ ميلادي (الأساس الجديد بدل الحساب الهجري التقريبي المتراكم)
function addGregorianMonths(startDateStr, monthsToAdd) {
  if (!startDateStr) return null;
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return null;
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  result.setMonth(result.getMonth() + monthsToAdd);
  return result;
}

// تاريخ استحقاق القسط — محسوب من start_date الميلادي مباشرة (دقيق 100%، بدون تراكم أخطاء تحويل هجري)
function computeInstallmentDueDate(startDate, totalInstallments, installmentNumber) {
  if (!startDate || !totalInstallments) return null;
  const intervalMonths = 12 / totalInstallments;
  const monthsToAdd = (Number(installmentNumber || 1) - 1) * intervalMonths;
  return addGregorianMonths(startDate, Math.round(monthsToAdd));
}'''

assert old1 in content, "❌ لم يتم العثور على كتلة الدوال الهجرية (old1) — الملف تغيّر عن النسخة المتوقعة."
content = content.replace(old1, new1)

# ---------------------------------------------------------------
# 2) إضافة start_date الميلادي لاستعلام العقود
# ---------------------------------------------------------------
old2 = '''    leases (
      id, property_id, start_date_hijri, tax_enabled, tax_effective_hijri,'''
new2 = '''    leases (
      id, property_id, start_date, start_date_hijri, tax_enabled, tax_effective_hijri,'''

assert old2 in content, "❌ لم يتم العثور على استعلام leases (old2)."
content = content.replace(old2, new2)

# ---------------------------------------------------------------
# 3) تحديث computeStatus لتستقبل تاريخ ميلادي مباشر بدل كائن هجري
# ---------------------------------------------------------------
old3 = '''  // status الآن: "paid" | "partial" | "overdue" (متأخر) | "not_due" (غير مستحق بعد)
  function computeStatus(row, hijri) {
    const due = Number(row.amount_due || 0);
    const paid = Number(row.amount_paid || 0);
    if (paid > 0 && paid >= due && due > 0) return "paid";
    if (paid > 0) return "partial";

    // لم يُدفع شيء بعد — نحدد إذا كان متأخراً أو لسا ما جاء وقته
    if (hijri) {
      const dueDate = hijriToGregorian(hijri.year, hijri.month, hijri.day);
      if (dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        // يوم الاستحقاق نفسه يُعتبر مستحقاً (متأخر) وليس "غير مستحق بعد"
        return dueDate <= today ? "overdue" : "not_due";
      }
    }
    return "overdue"; // احتياطي إذا تعذر حساب التاريخ
  }'''

new3 = '''  // status الآن: "paid" | "partial" | "overdue" (متأخر) | "not_due" (غير مستحق بعد)
  // dueDate: كائن Date ميلادي دقيق (من computeInstallmentDueDate) — بدون تحويل هجري وسيط
  function computeStatus(row, dueDate) {
    const due = Number(row.amount_due || 0);
    const paid = Number(row.amount_paid || 0);
    if (paid > 0 && paid >= due && due > 0) return "paid";
    if (paid > 0) return "partial";

    // لم يُدفع شيء بعد — نحدد إذا كان متأخراً أو لسا ما جاء وقته
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d2 = new Date(dueDate);
      d2.setHours(0, 0, 0, 0);
      // يوم الاستحقاق نفسه يُعتبر مستحقاً (متأخر) وليس "غير مستحق بعد"
      return d2 <= today ? "overdue" : "not_due";
    }
    return "overdue"; // احتياطي إذا تعذر حساب التاريخ
  }'''

assert old3 in content, "❌ لم يتم العثور على دالة computeStatus (old3)."
content = content.replace(old3, new3)

# ---------------------------------------------------------------
# 4) تحديث حلقة البحث: حساب تاريخ الاستحقاق من الميلادي بدل الهجري
# ---------------------------------------------------------------
old4 = '''      const hijri = computeInstallmentHijri(lease.start_date_hijri, row.total_installments, row.installment_number);
      if (!hijri || hijri.year !== filterYear || hijri.month !== filterMonth) continue;'''

new4 = '''      const dueDate = computeInstallmentDueDate(lease.start_date, row.total_installments, row.installment_number);
      if (!dueDate) continue;
      const dueDateHijriText = gregorianToHijri(formatDateStr(dueDate));
      const dueDateHijriParts = parseHijri(dueDateHijriText);
      if (!dueDateHijriParts || dueDateHijriParts.year !== filterYear || dueDateHijriParts.month !== filterMonth) continue;'''

assert old4 in content, "❌ لم يتم العثور على شرط فلترة الهجري بالحلقة (old4)."
content = content.replace(old4, new4)

old5 = '''      const status = computeStatus(row, hijri);
      const dueDateHijri = hijri
        ? `${hijri.year}/${String(hijri.month).padStart(2, "0")}/${String(hijri.day).padStart(2, "0")}`
        : "—";'''

new5 = '''      const status = computeStatus(row, dueDate);
      const dueDateHijri = dueDateHijriText || "—";'''

assert old5 in content, "❌ لم يتم العثور على كتلة status/dueDateHijri (old5)."
content = content.replace(old5, new5)

# ---------------------------------------------------------------
# الحفظ
# ---------------------------------------------------------------
if content == original_content:
    print("⚠️ لم يتغيّر أي شيء — تحقق من الملف.")
    sys.exit(1)

path.write_text(content, encoding="utf-8")
print("✅ تم تحديث src/Entitlements.jsx بنجاح.")
print("   - تاريخ الاستحقاق الآن يُحسب من start_date الميلادي مباشرة (دقيق 100%)")
print("   - الهجري يظهر فقط للعرض والفلترة بواجهة البحث (زي ما هو)")
