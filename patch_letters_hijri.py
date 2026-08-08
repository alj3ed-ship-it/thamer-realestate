path = "src/Letters.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_func = '''// تحويل تقريبي من ميلادي إلى هجري (خوارزمية كويتية شائعة) — يمكن تعديله يدوياً بأي وقت
function gregorianToHijriApprox(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let m = month, y = year;
  if (m < 3) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { year: hYear, month: hMonth, day: hDay };
}'''

new_func = '''// تحويل من ميلادي إلى هجري باستخدام تقويم "أم القرى" الرسمي (عبر Intl) — الحقل يبقى قابلاً للتعديل اليدوي بأي وقت
function gregorianToHijriApprox(date) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const parts = fmt.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value);
    const day = parseInt(parts.find(p => p.type === 'day').value);
    return { year, month, day };
  } catch {
    return { year: 0, month: 0, day: 0 };
  }
}'''

assert content.count(old_func) == 1, "لم يتم العثور على gregorianToHijriApprox بشكل فريد!"
content = content.replace(old_func, new_func)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تحديث دالة التحويل الهجري/الميلادي في Letters.jsx بنجاح (تقويم أم القرى الرسمي)")
