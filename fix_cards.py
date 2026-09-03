import pathlib
p = pathlib.Path('src/Payments.jsx')
c = p.read_text(encoding='utf-8')

# 1) إضافة state للكروت المفتوحة
old1 = '''  const [viewingLeaseId, setViewingLeaseId] = useState(null)'''
assert c.count(old1) == 1, f'old1: {c.count(old1)}'
new1 = '''  const [viewingLeaseId, setViewingLeaseId] = useState(null)
  const [expandedLeases, setExpandedLeases] = useState([])'''
c = c.replace(old1, new1)

# 2) حساب isExpanded/visiblePays لكل كرت
old2 = '''                const remaining = Math.max(total - paid, 0)

                return (
                  <div key={leaseId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>'''
assert c.count(old2) == 1, f'old2: {c.count(old2)}'
new2 = '''                const remaining = Math.max(total - paid, 0)
                const isExpanded = expandedLeases.includes(leaseId)
                const visiblePays = isExpanded ? pays : pays.slice(0, 4)

                return (
                  <div key={leaseId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>'''
c = c.replace(old2, new2)

# 3) استخدام visiblePays بدل pays بالعرض
old3 = '''                      <tbody>
                        {pays.map((p, idx) => {'''
assert c.count(old3) == 1, f'old3: {c.count(old3)}'
new3 = '''                      <tbody>
                        {visiblePays.map((p, idx) => {'''
c = c.replace(old3, new3)

# 4) زر عرض المزيد/أقل بعد الجدول
old4 = '''                    </table>
                    </div>
                  </div>
                )
              })
            })()}'''
assert c.count(old4) == 1, f'old4: {c.count(old4)}'
new4 = '''                    </table>
                    </div>
                    {pays.length > 4 && (
                      <div style={{ textAlign: 'center', padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                        <button type="button" onClick={() => setExpandedLeases(prev => isExpanded ? prev.filter(id => id !== leaseId) : [...prev, leaseId])}
                          style={{ border: 'none', background: 'none', color: '#1B4D7A', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                          {isExpanded ? '▲ عرض أقل' : `▼ عرض ${pays.length - 4} دفعات أخرى`}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            })()}'''
c = c.replace(old4, new4)

p.write_text(c, encoding='utf-8')
print('تم تعديل الملف بنجاح')