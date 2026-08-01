# -*- coding: utf-8 -*-
"""
يحوّل نسبة المصاريف من نسبة واحدة ثابتة لكل الصفحة، إلى نسبة مستقلة لكل سنة هجرية
كل سنة تحتفظ بنسبتها الخاصة بـ localStorage (كائن JSON بدل رقم واحد)
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1) استبدال state النسبة الواحدة بكائن نسب لكل سنة + دوال مساعدة
old1 = """  const [expensePct, setExpensePct] = useState(() => {
    const saved = localStorage.getItem('bookings_expense_pct');
    return saved ? Number(saved) : DEFAULT_EXPENSE_PCT;
  });"""
new1 = """  const [expensePcts, setExpensePcts] = useState(() => {
    const saved = localStorage.getItem('bookings_expense_pcts_by_year');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  function getExpensePct(year) {
    return expensePcts[year] !== undefined ? expensePcts[year] : DEFAULT_EXPENSE_PCT;
  }

  function setExpensePctForYear(year, value) {
    setExpensePcts((prev) => ({ ...prev, [year]: value }));
  }"""
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على state expensePct — تحقق يدوياً")

# 2) تعديل useEffect المسؤول عن الحفظ بـ localStorage
old2 = """  useEffect(() => {
    localStorage.setItem('bookings_expense_pct', String(expensePct));
  }, [expensePct]);"""
new2 = """  useEffect(() => {
    localStorage.setItem('bookings_expense_pcts_by_year', JSON.stringify(expensePcts));
  }, [expensePcts]);"""
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على useEffect الخاص بالحفظ — تحقق يدوياً")

# 3) تعديل حساب yearlyStats ليستخدم نسبة كل سنة الخاصة بها
old3 = """    return Object.values(map)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((row) => ({
        ...row,
        net: Math.round(row.revenue * (1 - expensePct / 100)),
      }));
  }, [approvedBookings, expensePct]);"""
new3 = """    return Object.values(map)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((row) => ({
        ...row,
        net: Math.round(row.revenue * (1 - getExpensePct(row.year) / 100)),
      }));
  }, [approvedBookings, expensePcts]);"""
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حساب yearlyStats — تحقق يدوياً")

# 4) تعديل حساب totalNet ليحسب كل حجز بنسبة سنته الخاصة
old4 = """  const totalNet = Math.round(totalRevenue * (1 - expensePct / 100));
  const totalExpenses = totalRevenue - totalNet;"""
new4 = """  const totalNet = Math.round(
    filteredBookings.reduce((sum, b) => {
      const y = getHijriYear(b.event_date_hijri);
      const pct = getExpensePct(y);
      return sum + Number(b.total_amount || 0) * (1 - pct / 100);
    }, 0)
  );
  const totalExpenses = totalRevenue - totalNet;"""
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حساب totalNet — تحقق يدوياً")

# 5) استبدال حقل إدخال النسبة الثابتة بحقل خاص بالسنة المختارة
old5 = """      {/* نسبة المصاريف القابلة للتعديل */}
      <div style={{
        background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '320px',
      }}>
        <label style={{ fontSize: '14px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          نسبة المصاريف الثابتة (%)
        </label>
        <input
          type="number"
          value={expensePct}
          onChange={(e) => setExpensePct(Number(e.target.value) || 0)}
          style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
        />
      </div>"""
new5 = """      {/* نسبة المصاريف الخاصة بكل سنة */}
      <div style={{
        background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '440px', flexWrap: 'wrap',
      }}>
        {selectedYear === 'all' ? (
          <span style={{ fontSize: '13px', color: '#888' }}>
            اختر سنة معينة من الأعلى لتعديل نسبة مصاريفها (الافتراضي: {DEFAULT_EXPENSE_PCT}%)
          </span>
        ) : (
          <>
            <label style={{ fontSize: '14px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              نسبة مصاريف {selectedYear} هـ (%)
            </label>
            <input
              type="number"
              value={getExpensePct(selectedYear)}
              onChange={(e) => setExpensePctForYear(selectedYear, Number(e.target.value) || 0)}
              style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
            />
          </>
        )}
      </div>"""
if old5 in content:
    content = content.replace(old5, new5, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حقل نسبة المصاريف — تحقق يدوياً")

# 6) تعديل عنوان بطاقة صافي الدخل (ما عاد فيه نسبة واحدة موحدة)
old6 = '        <SummaryCard label={`صافي الدخل (بعد خصم ${expensePct}%)`} value={`${totalNet.toLocaleString()} ر.س`} color="#8E44AD" />'
new6 = '        <SummaryCard label="صافي الدخل (بعد خصم المصاريف)" value={`${totalNet.toLocaleString()} ر.س`} color="#8E44AD" />'
if old6 in content:
    content = content.replace(old6, new6, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على بطاقة صافي الدخل — تحقق يدوياً")

# 7) تعديل تسمية عمود الصافي بالرسم البياني
old7 = '<Bar dataKey="net" name={`الصافي (بعد ${expensePct}%)`} fill="#27ae60" radius={[6, 6, 0, 0]} />'
new7 = '<Bar dataKey="net" name="الصافي (بعد خصم المصاريف)" fill="#27ae60" radius={[6, 6, 0, 0]} />'
if old7 in content:
    content = content.replace(old7, new7, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على تسمية عمود الرسم البياني — تحقق يدوياً")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ تم تطبيق {changes} من أصل 7 تعديلات على {path}")
