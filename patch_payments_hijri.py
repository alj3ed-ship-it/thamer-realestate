path = "src/Payments.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# ============================================
# 1) hijriToGregorian -> تقويم أم القرى الرسمي (ترجع {year, month, day})
# ============================================
old_h2g = '''function hijriToGregorian(hy, hm, hd) {
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
    return { year, month, day }
  } catch { return null }
}'''

new_h2g = '''function hijriToGregorian(hy, hm, hd) {
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
        return { year: guess.getFullYear(), month: guess.getMonth() + 1, day: guess.getDate() }
      }
      const diffMonths = (hy - cur.y) * 12 + (hm - cur.m)
      const diffDays = Math.round(diffMonths * 29.53 + (hd - cur.d))
      const step = diffDays !== 0 ? diffDays : (hd > cur.d ? 1 : -1)
      guess = new Date(guess.getTime() + step * 86400000)
    }
    return null
  } catch { return null }
}'''

assert content.count(old_h2g) == 1, "لم يتم العثور على hijriToGregorian بشكل فريد!"
content = content.replace(old_h2g, new_h2g)

# ============================================
# 2) gregorianToHijri -> تقويم أم القرى الرسمي
# ============================================
old_g2h = '''function gregorianToHijri(gregorianDateStr) {
  if (!gregorianDateStr) return null
  try {
    const d = new Date(gregorianDateStr)
    if (isNaN(d.getTime())) return null
    const gy = d.getFullYear(), gm = d.getMonth() + 1, gd = d.getDate()
    const jd = Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
      Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
      Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) +
      gd - 32075
    let l = jd - 1948440 + 10632
    const n = Math.floor((l - 1) / 10631)
    l = l - 10631 * n + 354
    const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
      Math.floor(l / 5670) * Math.floor((43 * l) / 15238)
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
    const month = Math.floor((24 * l) / 709)
    const day = l - Math.floor((709 * month) / 24)
    const year = 30 * n + j - 30
    return { year, month, day }
  } catch { return null }
}'''

new_g2h = '''function gregorianToHijri(gregorianDateStr) {
  if (!gregorianDateStr) return null
  try {
    const d = new Date(gregorianDateStr)
    if (isNaN(d.getTime())) return null
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' })
    const parts = fmt.formatToParts(d)
    const year = parseInt(parts.find(p => p.type === 'year').value)
    const month = parseInt(parts.find(p => p.type === 'month').value)
    const day = parseInt(parts.find(p => p.type === 'day').value)
    return { year, month, day }
  } catch { return null }
}'''

assert content.count(old_g2h) == 1, "لم يتم العثور على gregorianToHijri بشكل فريد!"
content = content.replace(old_g2h, new_g2h)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تحديث دالتي التحويل الهجري/الميلادي في Payments.jsx بنجاح (تقويم أم القرى الرسمي)")
