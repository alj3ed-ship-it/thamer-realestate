# -*- coding: utf-8 -*-
path = r"C:\Users\aljuaid\Desktop\thamer-realestate\src\DataAudit.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) إضافة حالة العداد بعد lastRun
old_state = "  const [lastRun, setLastRun] = useState(null)"
new_state = """  const [lastRun, setLastRun] = useState(null)
  const [visitCount, setVisitCount] = useState(null)"""

assert content.count(old_state) == 1, "لم يتم العثور على سطر lastRun أو تكرر أكثر من مرة"
content = content.replace(old_state, new_state)

# 2) إضافة useEffect لجلب عدد الزيارات عند التحميل
old_effect = "  useEffect(() => { runAudit() }, [])"
new_effect = """  useEffect(() => { runAudit() }, [])
  useEffect(() => { fetchVisitCount() }, [])

  async function fetchVisitCount() {
    const { count } = await supabase
      .from('demo_visits')
      .select('*', { count: 'exact', head: true })
    setVisitCount(count ?? 0)
  }"""

assert content.count(old_effect) == 1, "لم يتم العثور على useEffect الخاص بـ runAudit أو تكرر أكثر من مرة"
content = content.replace(old_effect, new_effect)

# 3) إضافة بطاقة عرض العدد بجانب بطاقات أخطاء/تنبيهات/ملاحظات
old_box = """        <div style={{ background: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: 12, padding: '14px 22px', textAlign: 'center', minWidth: 130 }}>
          <div style={{ fontSize: 12, color: '#555' }}>ملاحظات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2E6394' }}>{infoCount}</div>
        </div>"""

new_box = """        <div style={{ background: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: 12, padding: '14px 22px', textAlign: 'center', minWidth: 130 }}>
          <div style={{ fontSize: 12, color: '#555' }}>ملاحظات</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#2E6394' }}>{infoCount}</div>
        </div>
        <div style={{ background: '#EAFAF1', border: '1px solid #A9DFBF', borderRadius: 12, padding: '14px 22px', textAlign: 'center', minWidth: 130 }}>
          <div style={{ fontSize: 12, color: '#555' }}>زيارات الديمو</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#27ae60' }}>{visitCount === null ? '...' : visitCount}</div>
        </div>"""

assert content.count(old_box) == 1, "لم يتم العثور على بطاقة ملاحظات أو تكررت أكثر من مرة"
content = content.replace(old_box, new_box)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم إضافة بطاقة زيارات الديمو بنجاح ✅")
