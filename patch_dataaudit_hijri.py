path = "src/DataAudit.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_func = '''// نفس خوارزمية التحويل المستخدمة ببقية الصفحات
function hijriToGregorianDate(hy, hm, hd) {
  try {
    const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
      Math.floor((hm - 1) / 2) + hd + 1948440 - 385
    let l = jd + 68569
    const n = Math.floor((4 * l) / 146097)
    l = l - Math.floor((146097 * n + 3) / 4)
    const i = Math.floor((4000 * (l + 1)) / 1461001)
    l = l - Math.floor((1461 * i) / 4) + 31
    const j = Math.floor((80 * l) / 2447)
    const day = l - Math.floor((2447 * j) / 80)
    l = Math.floor(j / 11)
    const month = j + 2 - 12 * l
    const year = 100 * (n - 49) + i + l
    return new Date(year, month - 1, day)
  } catch { return null }
}'''

new_func = '''// تحويل هجري إلى ميلادي باستخدام تقويم "أم القرى" الرسمي (نفس الأسلوب المستخدم ببقية الصفحات)
function hijriToGregorianDate(hy, hm, hd) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' })
    function getHijriParts(d) {
      const parts = fmt.formatToParts(d)
      return {
        y: parseInt(parts.find(p => p.type === 'year').value),
        m: parseInt(parts.find(p => p.type === 'month').value),
        d: parseInt(parts.find(p => p.type === 'day').value),
      }
    }
    const epoch = new Date(Date.UTC(622, 6, 19))
    const approxDays = Math.round((hy - 1) * 354.36667 + (hm - 1) * 29.53 + hd)
    let guess = new Date(epoch.getTime() + approxDays * 86400000)

    for (let i = 0; i < 30; i++) {
      const cur = getHijriParts(guess)
      if (cur.y === hy && cur.m === hm && cur.d === hd) {
        return new Date(guess.getFullYear(), guess.getMonth(), guess.getDate())
      }
      const diffMonths = (hy - cur.y) * 12 + (hm - cur.m)
      const diffDays = Math.round(diffMonths * 29.53 + (hd - cur.d))
      const step = diffDays !== 0 ? diffDays : (hd > cur.d ? 1 : -1)
      guess = new Date(guess.getTime() + step * 86400000)
    }
    return null
  } catch { return null }
}'''

assert content.count(old_func) == 1, "لم يتم العثور على hijriToGregorianDate بشكل فريد!"
content = content.replace(old_func, new_func)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تحديث دالة التحويل الهجري/الميلادي في DataAudit.jsx بنجاح (تقويم أم القرى الرسمي)")
