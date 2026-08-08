path = "src/ViewerLimited.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_h2g = '''// تحويل هجري إلى ميلادي (نفس الخوارزمية المستخدمة في Entitlements.jsx وصفحة الدفعات)
function hijriToGregorian(hy, hm, hd) {
  try {
    const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
      Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
    let l = jd + 68569;
    const n = Math.floor((4 * l) / 146097);
    l = l - Math.floor((146097 * n + 3) / 4);
    const i = Math.floor((4000 * (l + 1)) / 1461001);
    l = l - Math.floor((1461 * i) / 4) + 31;
    const j = Math.floor((80 * l) / 2447);
    const day = l - Math.floor((2447 * j) / 80);
    l = Math.floor(j / 11);
    const month = j + 2 - 12 * l;
    const year = 100 * (n - 49) + i + l;
    return new Date(year, month - 1, day);
  } catch { return null; }
}'''

new_h2g = '''// تحويل هجري إلى ميلادي باستخدام تقويم "أم القرى" الرسمي (بحث تكراري عبر Intl، نفس الأسلوب في VatReturns.jsx وEntitlements.jsx)
function hijriToGregorian(hy, hm, hd) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' });
    function getHijriParts(d) {
      const parts = fmt.formatToParts(d);
      return {
        y: parseInt(parts.find(p => p.type === 'year').value),
        m: parseInt(parts.find(p => p.type === 'month').value),
        d: parseInt(parts.find(p => p.type === 'day').value),
      };
    }
    const epoch = new Date(Date.UTC(622, 6, 19));
    const approxDays = Math.round((hy - 1) * 354.36667 + (hm - 1) * 29.53 + hd);
    let guess = new Date(epoch.getTime() + approxDays * 86400000);

    for (let i = 0; i < 30; i++) {
      const cur = getHijriParts(guess);
      if (cur.y === hy && cur.m === hm && cur.d === hd) {
        return new Date(guess.getFullYear(), guess.getMonth(), guess.getDate());
      }
      const diffMonths = (hy - cur.y) * 12 + (hm - cur.m);
      const diffDays = Math.round(diffMonths * 29.53 + (hd - cur.d));
      const step = diffDays !== 0 ? diffDays : (hd > cur.d ? 1 : -1);
      guess = new Date(guess.getTime() + step * 86400000);
    }
    return null;
  } catch { return null; }
}'''

assert content.count(old_h2g) == 1, "لم يتم العثور على hijriToGregorian بشكل فريد!"
content = content.replace(old_h2g, new_h2g)

old_g2h = '''// تحويل ميلادي إلى هجري (عكس hijriToGregorian) لعرض تاريخ الدفع المخزَّن كتاريخ ميلادي
function gregorianToHijri(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  let jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
    day - 32075;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j = Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) + Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  const ll2 = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hm = Math.floor((24 * ll2) / 709);
  const hd = ll2 - Math.floor((709 * hm) / 24);
  const hy = 30 * n + j - 30;
  return `${hy}/${String(hm).padStart(2, "0")}/${String(hd).padStart(2, "0")}`;
}'''

new_g2h = '''// تحويل ميلادي إلى هجري باستخدام تقويم "أم القرى" الرسمي (عبر Intl، نفس الأسلوب في VatReturns.jsx وEntitlements.jsx)
function gregorianToHijri(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const parts = fmt.formatToParts(d);
    const hy = parts.find(p => p.type === 'year').value;
    const hm = parts.find(p => p.type === 'month').value;
    const hd = parts.find(p => p.type === 'day').value;
    return `${hy}/${String(hm).padStart(2, "0")}/${String(hd).padStart(2, "0")}`;
  } catch {
    return null;
  }
}'''

assert content.count(old_g2h) == 1, "لم يتم العثور على gregorianToHijri بشكل فريد!"
content = content.replace(old_g2h, new_g2h)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تحديث دالتي التحويل الهجري/الميلادي في ViewerLimited.jsx بنجاح (تقويم أم القرى الرسمي)")
