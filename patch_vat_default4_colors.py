path = "src/VatReturns.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1) إضافة state لعرض الكل/الافتراضي
old1 = "  const [selectedQuarters, setSelectedQuarters] = useState([]) // فارغ = كل الأرباع"
new1 = """  const [selectedQuarters, setSelectedQuarters] = useState([]) // فارغ = كل الأرباع
  const [showAllQuarters, setShowAllQuarters] = useState(false)"""
replacements.append((old1, new1))

# 2) دوال الألوان لعداد الأيام (نظام إشارة مرور 3 مستويات)
old2 = "  const statusInfo = {"
new2 = """  function getDeadlineColor(daysLeft) {
    if (daysLeft < 0) return '#e74c3c' // متأخر
    if (daysLeft <= 14) return '#f39c12' // قريب
    return '#27ae60' // بعيد
  }

  function getOpenColor(daysToOpen) {
    if (daysToOpen < 0) return '#27ae60' // متاح للتقديم بالفعل
    if (daysToOpen <= 14) return '#f39c12' // قريب من الفتح
    return '#9ca3af' // بعيد بعد
  }

  const statusInfo = {"""
replacements.append((old2, new2))

# 3) تطبيق الألوان على عدادي الأيام (الفتح + الموعد النهائي)
old3 = """                          <div style={{ fontSize: 10, color: daysToOpen < 0 ? '#9ca3af' : '#6b7280' }}>
                            {daysToOpen >= 0 ? `بعد ${daysToOpen} يوم` : `منذ ${Math.abs(daysToOpen)} يوم`}
                          </div>
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>←</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: daysLeft < 0 ? '#e74c3c' : daysLeft <= 14 ? '#f39c12' : '#6b7280' }}>
                            {daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`}
                          </div>"""
new3 = """                          <div style={{ fontSize: 10, fontWeight: 600, color: getOpenColor(daysToOpen) }}>
                            {daysToOpen >= 0 ? `بعد ${daysToOpen} يوم` : `منذ ${Math.abs(daysToOpen)} يوم`}
                          </div>
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>←</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: st === 'overdue' ? '#e74c3c' : '#374151' }}>{formatDateShort(deadline)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: getDeadlineColor(daysLeft) }}>
                            {daysLeft >= 0 ? `${daysLeft} يوم` : `تأخر ${Math.abs(daysLeft)}`}
                          </div>"""
replacements.append((old3, new3))

# 4) حساب الأرباع الافتراضية (آخر 4 غير القادمة) والأرباع المعروضة فعلياً
old4 = """  const focusKey = quarters.find(q => {
    const st = getStatus(q)
    return st === 'due' || st === 'overdue'
  })?.key"""
new4 = """  const focusKey = quarters.find(q => {
    const st = getStatus(q)
    return st === 'due' || st === 'overdue'
  })?.key

  // آخر 4 أرباع تاريخية (بدون الأرباع القادمة المستقبلية) كعرض افتراضي
  const historicalQuarters = quarters.filter(q => getStatus(q) !== 'upcoming')
  const defaultQuarters = historicalQuarters.slice(-4)
  const displayedQuarters = showAllQuarters ? quarters : defaultQuarters
  const hasMoreQuarters = !showAllQuarters && quarters.length > defaultQuarters.length"""
replacements.append((old4, new4))

# 5) استخدام displayedQuarters بدل quarters بعرض البطاقات
old5 = "            {quarters.map(q => {"
new5 = "            {displayedQuarters.map(q => {"
replacements.append((old5, new5))

# 6) زر عرض المزيد / عرض أقل في نهاية القائمة
old6 = """            })}
          </div>
        </div>
      )}
    </div>
  )
}"""
new6 = """            })}
          </div>

          {(hasMoreQuarters || showAllQuarters) && (
            <div className="no-print" style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => setShowAllQuarters(!showAllQuarters)}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {showAllQuarters ? '▲ عرض أقل (آخر 4 أرباع فقط)' : `▼ عرض المزيد (${quarters.length - defaultQuarters.length} ربع إضافي)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}"""
replacements.append((old6, new6))

missing = []
for i, (old, new) in enumerate(replacements, 1):
    if old not in content:
        missing.append(i)
    else:
        content = content.replace(old, new, 1)

if missing:
    print(f"⚠ فشل: الأجزاء التالية ما انطابقت بالملف: {missing}")
    print("تأكد إنك شغّلت patch_vat_multiselect.py قبل هذا الباتش (هذا يبني فوقه).")
else:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("✅ تم تطبيق التعديل بنجاح على src/VatReturns.jsx")
